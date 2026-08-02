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
const NAME_KEYS = ["student name", "name", "student", "student_name"];
const MOBILE_KEYS = ["mobile number", "mobile", "phone", "mobile_number", "phone number", "contact"];
const PROGRAM_KEYS = ["program name", "program", "test name", "exam name"];
const TOTAL_KEYS = ["grand total", "total", "total marks"];

const norm = (s: string): string => s.trim().toLowerCase();

interface SubjectResult { subject: string; obtained: string; outOf: string }
interface MarksRow {
  studentName: string;
  mobileNumber: string;
  programName: string;
  subjects: SubjectResult[];
  grandTotal: string;
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
    let programName = "";
    let grandTotal = "";
    const subjectPairs = new Map<string, { obtained: string; outOf: string }>();

    // First pass: identify reserved columns and subject pairs.
    for (const [key, value] of Object.entries(raw)) {
      const k = norm(key);
      const v = value === null || value === undefined ? "" : String(value).trim();
      if (NAME_KEYS.includes(k)) studentName = v;
      else if (MOBILE_KEYS.includes(k)) mobileNumber = v;
      else if (PROGRAM_KEYS.includes(k)) programName = v;
      else if (TOTAL_KEYS.includes(k)) grandTotal = v;
    }

    // Second pass: match "X Marks" / "X Out Of" pairs to build subject list.
    const columnNames = Object.keys(raw);
    for (let i = 0; i < columnNames.length; i++) {
      const col = columnNames[i];
      const colNorm = norm(col);
      if (colNorm.endsWith(" marks") || colNorm.endsWith("_marks")) {
        const subjName = colNorm.replace(/ marks$|_marks$/, "").replace(/_/g, " ").trim();
        const obtained = raw[col] === null || raw[col] === undefined ? "" : String(raw[col]).trim();
        // Look for a corresponding "X Out Of" or "X Total" column.
        let outOf = "";
        for (const col2 of columnNames) {
          const col2Norm = norm(col2);
          const subj2 = col2Norm.replace(/ out of$|_out of$|_out_of$| total$|_total$/, "").replace(/_/g, " ").trim();
          if ((col2Norm.endsWith(" out of") || col2Norm.endsWith("_out of") || col2Norm.endsWith("_out_of") || col2Norm.endsWith(" total") || col2Norm.endsWith("_total")) && subj2 === subjName) {
            outOf = raw[col2] === null || raw[col2] === undefined ? "" : String(raw[col2]).trim();
            break;
          }
        }
        if (obtained) subjectPairs.set(subjName, { obtained, outOf: outOf || "?" });
      }
    }

    // Convert pairs to sorted subject list.
    const subjects: SubjectResult[] = Array.from(subjectPairs.entries())
      .map(([subj, { obtained, outOf }]) => ({ subject: subj, obtained, outOf }));

    // Validate the row.
    const digits = mobileNumber.replace(/\D/g, "");
    let error: string | undefined;
    if (!studentName) error = "Missing student name";
    else if (!programName) error = "Missing program name";
    else if (digits.length < 10) error = "Invalid or missing mobile number";
    else if (subjects.length === 0) error = "No subject marks found";

    return { studentName, mobileNumber, programName, subjects, grandTotal, valid: !error, error };
  }).filter((r) => r.studentName || r.mobileNumber || r.subjects.length);
};

// Sanitize for Meta WhatsApp template parameters (no newlines, no multiple spaces).
const sanitizeParam = (value: string): string =>
  value.replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim();

export const registerBroadcastMarksRoutes = async (app: FastifyInstance): Promise<void> => {
  // ─── Download the blank Excel template ─────────────────────────────────────
  app.get(
    "/api/broadcast/marks/template",
    { preHandler: requirePermission(PERMISSIONS.NOTIFICATION_SEND) },
    async (_request, reply) => {
      const rows = [
        ["Student Name", "Mobile Number", "Program Name", "Maths Marks", "Maths Out Of", "Physics Marks", "Physics Out Of", "Chemistry Marks", "Chemistry Out Of", "Grand Total"],
        ["Ravi Kumar", "9876543210", "IIT Weekly Test 1", 88, 30, 91, 20, 79, 20, 258],
        ["Priya S", "9876500011", "IIT Weekly Test 1", 95, 30, 84, 20, 90, 20, 269]
      ];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws["!cols"] = [
        { wch: 20 }, { wch: 16 }, { wch: 22 },
        { wch: 14 }, { wch: 12 }, { wch: 15 }, { wch: 12 },
        { wch: 17 }, { wch: 12 }, { wch: 12 }
      ];
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
          rows: z
            .array(
              z.object({
                studentName: z.string(),
                mobileNumber: z.string(),
                programName: z.string(),
                subjects: z.array(z.object({ subject: z.string(), obtained: z.union([z.string(), z.number()]), outOf: z.union([z.string(), z.number()]) })).default([]),
                grandTotal: z.union([z.string(), z.number()]).optional()
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
          programName: r.programName,
          subjects: r.subjects.map((s) => ({ subject: s.subject, obtained: String(s.obtained), outOf: String(s.outOf) })),
          grandTotal: r.grandTotal !== undefined ? String(r.grandTotal) : "",
          valid: true
        };

        const digits = row.mobileNumber.replace(/\D/g, "");
        if (!row.studentName || !row.programName || digits.length < 10) {
          failed += 1;
          results.push({ studentName: row.studentName, mobileNumber: row.mobileNumber, ok: false, error: "Invalid name, program, or mobile number" });
          continue;
        }

        // Build WhatsApp template parameters.
        // Send 4 params: {{1}}=student_name, {{2}}=program_name, {{3}}=results, {{4}}=total
        const studentParam = sanitizeParam(row.studentName);
        const programParam = sanitizeParam(row.programName);
        // Multi-line subject results (newline-separated)
        const subjectResults = row.subjects.map((s) => `${sanitizeParam(s.subject)}: ${sanitizeParam(s.obtained)} / ${sanitizeParam(s.outOf)}`).join("\n");
        const totalParam = `${sanitizeParam(row.grandTotal || "0")} / ${row.subjects.reduce((sum, s) => sum + (Number(s.outOf) || 0), 0)}`;

        const params = [studentParam, programParam, subjectResults, totalParam];
        const res = await sendWhatsAppTemplate(row.mobileNumber, env.WHATSAPP_MARKS_TEMPLATE, params);
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
