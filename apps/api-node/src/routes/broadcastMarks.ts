import type { FastifyInstance } from "fastify";
import { createRequire } from "node:module";
import { z } from "zod";
import { requireCurrentUser } from "../lib/access.js";
import { writeAudit } from "../lib/audit.js";
import { requirePermission } from "../plugins/auth.js";
import { PERMISSIONS } from "../lib/permissions.js";
import { env } from "../config/env.js";
import { sendWhatsAppTemplate } from "../services/whatsappCloudApi.js";

// xlsx (SheetJS) is CJS — load via createRequire so it works under Node ESM and Vite SSR (vitest).
const nodeRequire = createRequire(import.meta.url);
const XLSX = nodeRequire("xlsx") as typeof import("xlsx");

// ─── Column normalisation ────────────────────────────────────────────────────
// Everything that is NOT one of these reserved columns is treated as a subject.
const NAME_KEYS = ["student name", "name", "student", "student_name"];
const MOBILE_KEYS = ["mobile number", "mobile", "phone", "mobile_number", "phone number", "contact"];
const TOTAL_KEYS = ["total", "total marks", "grand total"];

const norm = (s: string): string => s.trim().toLowerCase();

interface Subject { subject: string; marks: string }
interface MarksRow {
  studentName: string;
  mobileNumber: string;
  subjects: Subject[];
  total: string;
  valid: boolean;
  error?: string;
}

const parseSheet = (buffer: Buffer): MarksRow[] => {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  return json.map((raw) => {
    let studentName = "";
    let mobileNumber = "";
    let total = "";
    const subjects: Subject[] = [];

    for (const [key, value] of Object.entries(raw)) {
      const k = norm(key);
      const v = value === null || value === undefined ? "" : String(value).trim();
      if (NAME_KEYS.includes(k)) studentName = v;
      else if (MOBILE_KEYS.includes(k)) mobileNumber = v;
      else if (TOTAL_KEYS.includes(k)) total = v;
      else if (v !== "") subjects.push({ subject: key.trim(), marks: v });
    }

    // Auto-compute total from subject marks when the column is blank.
    if (!total && subjects.length) {
      const sum = subjects.reduce((acc, s) => acc + (Number(s.marks) || 0), 0);
      if (sum > 0) total = String(sum);
    }

    const digits = mobileNumber.replace(/\D/g, "");
    let error: string | undefined;
    if (!studentName) error = "Missing student name";
    else if (digits.length < 10) error = "Invalid or missing mobile number";
    else if (subjects.length === 0) error = "No subject marks found";

    return { studentName, mobileNumber, subjects, total, valid: !error, error };
  }).filter((r) => r.studentName || r.mobileNumber || r.subjects.length); // drop fully-empty rows
};

// ─── Message composition ─────────────────────────────────────────────────────
const DEFAULT_TEMPLATE =
  "Dear Student/Parent,\nMarks for {name}:\n{marks}\nTotal: {total}\n— i-icon Academy";

const composeMessage = (row: MarksRow, template?: string): string => {
  const marksLines = row.subjects.map((s) => `${s.subject}: ${s.marks}`).join("\n");
  const tpl = template && template.trim() ? template : DEFAULT_TEMPLATE;
  return tpl
    .replace(/\{name\}/g, row.studentName)
    .replace(/\{marks\}/g, marksLines)
    .replace(/\{total\}/g, row.total || "—");
};

export const registerBroadcastMarksRoutes = async (app: FastifyInstance): Promise<void> => {
  // ─── Download the blank Excel template ─────────────────────────────────────
  app.get(
    "/api/broadcast/marks/template",
    { preHandler: requirePermission(PERMISSIONS.NOTIFICATION_SEND) },
    async (_request, reply) => {
      const rows = [
        ["Student Name", "Mobile Number", "Maths", "Science", "English", "Total"],
        ["Ravi Kumar", "9876543210", 88, 91, 79, 258],
        ["Priya S", "9876500011", 95, 84, 90, 269]
      ];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws["!cols"] = [{ wch: 22 }, { wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Marks");
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

      reply.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      reply.header("Content-Disposition", 'attachment; filename="marks-template.xlsx"');
      reply.header("Cache-Control", "no-store");
      return reply.send(buffer);
    }
  );

  // ─── Upload + parse an Excel file, return normalised rows for preview ───────
  app.post(
    "/api/broadcast/marks/preview",
    { preHandler: requirePermission(PERMISSIONS.NOTIFICATION_SEND) },
    async (request, reply) => {
      let fileBuffer: Buffer | null = null;
      for await (const part of request.parts()) {
        if (part.type === "file") fileBuffer = await part.toBuffer();
      }
      if (!fileBuffer) return reply.status(400).send({ detail: "Excel file is required" });

      let rows: MarksRow[];
      try {
        rows = parseSheet(fileBuffer);
      } catch (err) {
        return reply.status(400).send({ detail: (err as Error).message || "Failed to parse Excel file" });
      }
      if (rows.length === 0) {
        return reply.status(400).send({ detail: "No data rows found in the sheet" });
      }

      const valid = rows.filter((r) => r.valid).length;
      return { rows, summary: { total: rows.length, valid, invalid: rows.length - valid } };
    }
  );

  // ─── Send WhatsApp marks messages to the provided rows ─────────────────────
  app.post(
    "/api/broadcast/marks/send",
    { preHandler: requirePermission(PERMISSIONS.NOTIFICATION_SEND) },
    async (request, reply) => {
      const user = await requireCurrentUser(request, reply);
      if (!user) return;

      const body = z
        .object({
          messageTemplate: z.string().optional(),
          rows: z
            .array(
              z.object({
                studentName: z.string(),
                mobileNumber: z.string(),
                subjects: z.array(z.object({ subject: z.string(), marks: z.union([z.string(), z.number()]) })).default([]),
                total: z.union([z.string(), z.number()]).optional()
              })
            )
            .min(1)
            .max(1000)
        })
        .parse(request.body);

      const results: Array<{ studentName: string; mobileNumber: string; ok: boolean; error?: string }> = [];
      let sent = 0;
      let failed = 0;

      for (const r of body.rows) {
        const row: MarksRow = {
          studentName: r.studentName,
          mobileNumber: r.mobileNumber,
          subjects: r.subjects.map((s) => ({ subject: s.subject, marks: String(s.marks) })),
          total: r.total !== undefined ? String(r.total) : "",
          valid: true
        };

        const digits = row.mobileNumber.replace(/\D/g, "");
        if (!row.studentName || digits.length < 10) {
          failed += 1;
          results.push({ studentName: row.studentName, mobileNumber: row.mobileNumber, ok: false, error: "Invalid name or mobile number" });
          continue;
        }

        const message = composeMessage(row, body.messageTemplate);
        const res = await sendWhatsAppTemplate(row.mobileNumber, env.WHATSAPP_MARKS_TEMPLATE, [message]);
        if (res.ok) sent += 1;
        else failed += 1;
        results.push({ studentName: row.studentName, mobileNumber: row.mobileNumber, ok: res.ok, error: res.error });
      }

      await writeAudit({
        user_id: user.id,
        action: "marks_broadcast",
        action_details: `Marks broadcast: ${sent} sent, ${failed} failed of ${body.rows.length}`,
        resource_type: "notification",
        request
      });

      return { total: body.rows.length, sent, failed, results };
    }
  );
};
