import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { inflateRaw } from "node:zlib";
import { promisify } from "node:util";
import { z } from "zod";
import { canAccessCategory, isPlatformRole, requireCurrentUser } from "../lib/access.js";
import { auditUnauthorized, writeAudit } from "../lib/audit.js";
import { generateMappedPdfCode } from "../lib/codes.js";
import { Category, ClassMaster, SubjectMaster, DownloadLog, Pdf, PdfVersion, School, SchoolCategoryAccess, SchoolClassAccess, SchoolSubjectAccess, SubCategory, User, ViewLog } from "../models/index.js";
import { createAndSendNotification } from "../services/notificationChannels.js";
import { enrichPdfs } from "../lib/pdfEnrich.js";
import { listResponse, serializeDoc } from "../lib/serialize.js";
import { requireAuth, requirePermission } from "../plugins/auth.js";
import { PERMISSIONS } from "../lib/permissions.js";

// archiver is a CJS module; load via createRequire so it works under both Node ESM and Vite SSR (vitest)
const nodeRequire = createRequire(import.meta.url);
const archiver = nodeRequire("archiver") as typeof import("archiver");

const watermarkHeaders = () => ({
  "X-Watermark-School": "iicon academy"
});

export const registerPdfRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/api/pdfs", { preHandler: requireAuth }, async (request, reply) => {
    const user = await requireCurrentUser(request, reply);
    if (!user) return;
    const query = z
      .object({
        category_id: z.string().optional(),
        categoryId: z.string().optional(),
        sub_category_id: z.string().optional(),
        subCategoryId: z.string().optional(),
        class_id: z.string().optional(),
        classId: z.string().optional(),
        subject_id: z.string().optional(),
        subjectId: z.string().optional(),
        status: z.string().optional(),
        is_active: z.coerce.boolean().optional(),
        q: z.string().optional(),
        page: z.coerce.number().default(1),
        per_page: z.coerce.number().default(50),
        include_deleted: z.coerce.boolean().optional(),
        count: z.string().optional()
      })
      .parse(request.query);

    const filter: Record<string, unknown> = {};
    if (!query.include_deleted || !isPlatformRole(user.role)) {
      filter.deleted_at = null;
    }
    const categoryId = query.category_id ?? query.categoryId;
    const subCategoryId = query.sub_category_id ?? query.subCategoryId;
    const classId = query.class_id ?? query.classId;
    const subjectId = query.subject_id ?? query.subjectId;
    if (categoryId) filter.category_id = categoryId;
    if (subCategoryId) filter.sub_category_id = subCategoryId;
    if (classId) filter.class_id = classId;
    if (subjectId) filter.subject_id = subjectId;
    if (query.status) filter.status = query.status;
    if (query.is_active !== undefined) filter.is_active = query.is_active;
    if (query.q) {
      const regex = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ file_name: regex }, { pdf_id: regex }, { description: regex }, { tags: regex }];
    }

    if (!isPlatformRole(user.role)) {
      const schoolId = user.school_id ?? "";
      const [subjectGrants, classGrants, progGrants] = await Promise.all([
        SchoolSubjectAccess.find({ school_id: schoolId }).lean(),
        SchoolClassAccess.find({ school_id: schoolId }).lean(),
        SchoolCategoryAccess.find({ school_id: schoolId }).lean()
      ]);

      const orConditions: Record<string, unknown>[] = [];
      // New PDFs: exact (program + class + subject) match
      for (const g of subjectGrants) {
        orConditions.push({ category_id: g.program_id, class_id: g.class_id, subject_id: g.subject_id });
      }
      // Legacy PDFs: (program + sub_category) where class_id is null
      for (const g of classGrants) {
        orConditions.push({ category_id: g.program_id, sub_category_id: g.class_id, class_id: null });
      }
      // Very legacy PDFs: program-only where both sub_category_id and class_id are null
      for (const g of progGrants) {
        orConditions.push({ category_id: g.category_id, sub_category_id: null, class_id: null });
      }

      if (orConditions.length === 0) return listResponse([], 0);
      filter.$or = orConditions;
      filter.status = "approved";
      filter.is_active = true;
    }

    const skip = (query.page - 1) * query.per_page;
    const wantCount = query.count !== "false";
    const [rows, total] = await Promise.all([
      Pdf.find(filter).sort({ created: -1 }).skip(skip).limit(query.per_page).lean(),
      wantCount ? Pdf.countDocuments(filter) : Promise.resolve(undefined)
    ]);
    const enriched = await enrichPdfs(rows as Record<string, unknown>[]);
    return listResponse(enriched, total ?? rows.length);
  });

  app.get("/api/pdfs/:pdf_id", { preHandler: requireAuth }, async (request, reply) => {
    const params = z.object({ pdf_id: z.string() }).parse(request.params);
    const user = await requireCurrentUser(request, reply);
    if (!user) return;
    const pdf = await Pdf.findOne({ id: params.pdf_id, deleted_at: null });
    if (!pdf) return reply.status(404).send({ detail: "PDF not found" });
    const allowed = await canAccessCategory(user.id, user.role, user.school_id, pdf.category_id, pdf.class_id, pdf.subject_id);
    if (!allowed) {
      await auditUnauthorized(user.id, "pdf_view", params.pdf_id, request);
      return reply.status(403).send({ detail: "Insufficient permissions" });
    }
    const [enriched] = await enrichPdfs([pdf.toObject() as Record<string, unknown>]);
    return enriched;
  });

  const streamPdf = async (
    request: FastifyRequest,
    reply: FastifyReply,
    disposition: "inline" | "attachment",
    action: "preview" | "download" | "print"
  ) => {
    const params = z.object({ pdf_id: z.string() }).parse(request.params);
    const user = await requireCurrentUser(request, reply);
    if (!user) return;
    const pdf = await Pdf.findOne({ id: params.pdf_id, deleted_at: null });
    if (!pdf) return reply.status(404).send({ detail: "PDF not found" });
    const allowed = await canAccessCategory(user.id, user.role, user.school_id, pdf.category_id, pdf.class_id, pdf.subject_id);
    if (!allowed) {
      await auditUnauthorized(user.id, `pdf_${action}`, params.pdf_id, request);
      return reply.status(403).send({ detail: "Insufficient permissions" });
    }
    if (!pdf.file_data) return reply.status(404).send({ detail: "PDF file data missing" });

    if (action === "preview") {
      pdf.view_count = (pdf.view_count ?? 0) + 1;
      await pdf.save();
      await ViewLog.create({
        school_id: user.school_id ?? null,
        user_id: user.id,
        pdf_id: pdf.id,
        category_id: pdf.category_id ?? null,
        sub_category_id: pdf.sub_category_id ?? null
      });
    } else {
      pdf.download_count = (pdf.download_count ?? 0) + 1;
      await pdf.save();
      if (user.school_id) {
        await DownloadLog.create({
          school_id: user.school_id,
          user_id: user.id,
          pdf_id: pdf.id,
          category_id: pdf.category_id ?? null,
          sub_category_id: pdf.sub_category_id ?? null,
          download_type: action === "print" ? "print" : "single"
        });
      }
      await writeAudit({
        user_id: user.id,
        action,
        action_details: `${action} PDF ${pdf.file_name}`,
        resource_type: "pdf",
        resource_id: pdf.id,
        request
      });
    }

    const wm = watermarkHeaders();
    reply.header("Content-Type", "application/pdf");
    reply.header("Content-Disposition", `${disposition}; filename="${pdf.file_name}"`);
    reply.header("Cache-Control", "private, no-store");
    for (const [k, v] of Object.entries(wm)) reply.header(k, v);
    return reply.send(pdf.file_data);
  };

  app.get("/api/pdfs/:pdf_id/preview", { preHandler: requireAuth }, (req, rep) => streamPdf(req, rep, "inline", "preview"));
  app.get("/api/pdfs/:pdf_id/download", { preHandler: requireAuth }, (req, rep) => streamPdf(req, rep, "attachment", "download"));
  app.post("/api/pdfs/:pdf_id/print", { preHandler: requireAuth }, (req, rep) => streamPdf(req, rep, "inline", "print"));

  app.post("/api/pdfs/bulk-download", { preHandler: requireAuth }, async (request, reply) => {
    const user = await requireCurrentUser(request, reply);
    if (!user) return;

    const body = z
      .object({
        ids: z.array(z.string()).min(1).max(200),
        archiveName: z.string().optional()
      })
      .parse(request.body);

    const pdfs = await Pdf.find({ id: { $in: body.ids }, deleted_at: null }).lean();
    if (pdfs.length === 0) return reply.status(404).send({ detail: "No PDFs found" });

    // Authorisation: every PDF must be accessible to the user. Reject the whole archive otherwise.
    const denied: string[] = [];
    for (const pdf of pdfs) {
      const ok = await canAccessCategory(user.id, user.role, user.school_id, pdf.category_id ?? null, pdf.class_id ?? null, pdf.subject_id ?? null);
      if (!ok) denied.push(pdf.id);
    }
    if (denied.length) {
      for (const id of denied) await auditUnauthorized(user.id, "pdf_bulk_download", id, request);
      return reply.status(403).send({ detail: "One or more PDFs are not accessible", denied });
    }

    const archiveName = (body.archiveName ?? `pdfs-${new Date().toISOString().slice(0, 10)}.zip`).replace(/[^\w.\-]+/g, "_");
    const wm = watermarkHeaders();

    reply.header("Content-Type", "application/zip");
    reply.header("Content-Disposition", `attachment; filename="${archiveName}"`);
    reply.header("Cache-Control", "private, no-store");
    for (const [k, v] of Object.entries(wm)) reply.header(k, v);

    const archive = archiver("zip", { zlib: { level: 0 } });
    archive.on("error", (err) => {
      request.log.error({ err }, "archiver error");
    });

    // Track download events + audit + counters
    for (const pdf of pdfs) {
      if (!pdf.file_data) continue;
      const entryName = (pdf.file_name ?? `${pdf.pdf_id ?? pdf.id}.pdf`).replace(/[\\/]/g, "_");
      // pdf.file_data is stored as Mongo Binary; coerce to Node Buffer for archiver
      const raw = pdf.file_data as unknown;
      const buf: Buffer = Buffer.isBuffer(raw)
        ? (raw as Buffer)
        : Buffer.from((raw as { buffer: ArrayBufferLike }).buffer ?? (raw as ArrayBufferLike));
      archive.append(buf, { name: entryName });

      await Pdf.updateOne({ id: pdf.id }, { $inc: { download_count: 1 } });
      if (user.school_id) {
        await DownloadLog.create({
          school_id: user.school_id,
          user_id: user.id,
          pdf_id: pdf.id,
          category_id: pdf.category_id ?? null,
          sub_category_id: pdf.sub_category_id ?? null,
          download_type: "bulk"
        });
      }
      await writeAudit({
        user_id: user.id,
        action: "download",
        action_details: `bulk download PDF ${pdf.file_name}`,
        resource_type: "pdf",
        resource_id: pdf.id,
        request
      });
    }

    archive.finalize().catch((err) => request.log.error({ err }, "finalize failed"));
    return reply.send(archive);
  });

  // ─── ZIP batch upload ──────────────────────────────────────────────────────
  const inflateRawAsync = promisify(inflateRaw);

  interface ZipEntry { filename: string; data: Buffer }

  function findZipEOCD(buf: Buffer): number {
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65558); i--) {
      if (buf.readUInt32LE(i) === 0x06054b50) return i;
    }
    return -1;
  }

  async function extractPdfsFromZip(buffer: Buffer): Promise<ZipEntry[]> {
    const eocd = findZipEOCD(buffer);
    if (eocd < 0) throw new Error("Not a valid ZIP file");

    const totalEntries = buffer.readUInt16LE(eocd + 10);
    const cdOffset = buffer.readUInt32LE(eocd + 16);
    const entries: ZipEntry[] = [];
    let pos = cdOffset;

    for (let i = 0; i < totalEntries; i++) {
      if (pos + 46 > buffer.length || buffer.readUInt32LE(pos) !== 0x02014b50) break;

      const compressionMethod = buffer.readUInt16LE(pos + 10);
      const compressedSize = buffer.readUInt32LE(pos + 20);
      const fileNameLen = buffer.readUInt16LE(pos + 28);
      const extraLen = buffer.readUInt16LE(pos + 30);
      const commentLen = buffer.readUInt16LE(pos + 32);
      const localOffset = buffer.readUInt32LE(pos + 42);
      const filename = buffer.subarray(pos + 46, pos + 46 + fileNameLen).toString("utf8");
      pos += 46 + fileNameLen + extraLen + commentLen;

      if (filename.endsWith("/") || !filename.toLowerCase().endsWith(".pdf")) continue;

      if (localOffset + 30 > buffer.length || buffer.readUInt32LE(localOffset) !== 0x04034b50) continue;
      const localFileNameLen = buffer.readUInt16LE(localOffset + 26);
      const localExtraLen = buffer.readUInt16LE(localOffset + 28);
      const dataStart = localOffset + 30 + localFileNameLen + localExtraLen;
      if (dataStart + compressedSize > buffer.length) continue;
      const compressed = buffer.subarray(dataStart, dataStart + compressedSize);

      try {
        let data: Buffer;
        if (compressionMethod === 0) {
          data = compressed;
        } else if (compressionMethod === 8) {
          data = await inflateRawAsync(compressed) as Buffer;
        } else {
          continue;
        }
        const baseName = filename.split("/").pop() ?? filename;
        entries.push({ filename: baseName, data });
      } catch { continue; }
    }
    return entries;
  }

  app.post(
    "/api/pdfs/upload-zip",
    { preHandler: requirePermission(PERMISSIONS.PDF_UPLOAD) },
    async (request, reply) => {
      const user = await requireCurrentUser(request, reply);
      if (!user) return;

      const fieldValues = new Map<string, string>();
      let zipBuffer: Buffer | null = null;

      for await (const part of request.parts()) {
        if (part.type === "file") {
          zipBuffer = await part.toBuffer();
        } else if (part.type === "field" && typeof part.value === "string") {
          fieldValues.set(part.fieldname, part.value);
        }
      }

      if (!zipBuffer) return reply.status(400).send({ detail: "ZIP file is required" });

      const fieldValue = (...names: string[]): string | null => {
        for (const n of names) { const v = fieldValues.get(n); if (v !== undefined) return v; }
        return null;
      };

      const categoryId = fieldValue("category_id", "categoryId");
      const classId = fieldValue("class_id", "classId");
      const subjectId = fieldValue("subject_id", "subjectId");
      const versionNotes = fieldValue("versionNotes", "version_notes") ?? "Extracted from ZIP";

      if (!categoryId) return reply.status(400).send({ detail: "categoryId is required" });
      if (!classId) return reply.status(400).send({ detail: "classId is required" });

      const [cat, cls] = await Promise.all([
        Category.findOne({ id: categoryId }),
        ClassMaster.findOne({ id: classId })
      ]);
      if (!cat) return reply.status(404).send({ detail: "Category not found" });
      if (!cls) return reply.status(404).send({ detail: "Class not found" });

      let entries: ZipEntry[];
      try {
        entries = await extractPdfsFromZip(zipBuffer);
      } catch (err) {
        return reply.status(400).send({ detail: (err as Error).message || "Failed to parse ZIP file" });
      }

      if (entries.length === 0) {
        return reply.status(400).send({ detail: "No PDF files found inside the ZIP" });
      }

      const created: string[] = [];
      const skipped: string[] = [];

      for (const entry of entries) {
        try {
          const pdfCode = await generateMappedPdfCode(cat.category_name, cls.class_name);
          const checksum = createHash("sha256").update(entry.data).digest("hex");
          const doc = await Pdf.create({
            file_name: entry.filename,
            original_file_name: entry.filename,
            file_path: "",
            file_data: entry.data,
            file_size: entry.data.length,
            file_checksum: checksum,
            category_id: categoryId,
            sub_category_id: null,
            class_id: classId,
            subject_id: subjectId ?? null,
            uploaded_by: user.id,
            pdf_id: pdfCode,
            description: "",
            status: "approved",
            is_active: true,
            version_notes: versionNotes
          });
          await PdfVersion.create({
            pdf_id: doc.id,
            version_number: 1,
            file_path: "",
            file_data: entry.data,
            file_size: entry.data.length,
            uploaded_by: user.id,
            version_notes: versionNotes,
            is_current: true
          });
          await writeAudit({
            user_id: user.id,
            action: "pdf_upload",
            action_details: `ZIP batch: ${entry.filename}`,
            resource_type: "pdf",
            resource_id: doc.id,
            request
          });
          created.push(entry.filename);
        } catch {
          skipped.push(entry.filename);
        }
      }

      return reply.send({ created: created.length, skipped, files: created });
    }
  );

  app.post(
    "/api/pdfs",
    { preHandler: requirePermission(PERMISSIONS.PDF_UPLOAD) },
    async (request, reply) => {
      const user = await requireCurrentUser(request, reply);
      if (!user) return;

      const fieldValues = new Map<string, string>();
      let fileBuffer: Buffer | null = null;
      let originalFilename = "upload.pdf";

      for await (const part of request.parts()) {
        if (part.type === "file") {
          fileBuffer = await part.toBuffer();
          originalFilename = part.filename ?? originalFilename;
        } else if (part.type === "field" && typeof part.value === "string") {
          fieldValues.set(part.fieldname, part.value);
        }
      }

      if (!fileBuffer) return reply.status(400).send({ detail: "File is required" });
      const data = fileBuffer;

      const fieldValue = (...names: string[]): string | null => {
        for (const n of names) {
          const v = fieldValues.get(n);
          if (v !== undefined) return v;
        }
        return null;
      };

      const categoryId = fieldValue("category_id", "categoryId");
      const subCategoryId = fieldValue("sub_category_id", "subCategoryId");
      const classId = fieldValue("class_id", "classId");
      const subjectId = fieldValue("subject_id", "subjectId");
      const description = fieldValue("description") ?? "";
      const requestedFileName = fieldValue("fileName", "file_name") ?? originalFilename;
      const requestedStatus = fieldValue("status") ?? undefined;
      const requestedIsActive = fieldValue("isActive", "is_active") ?? undefined;
      const versionNotes = fieldValue("versionNotes", "version_notes") ?? "Initial version";

      if (!categoryId) {
        return reply.status(400).send({ detail: "categoryId (programId) is required" });
      }
      if (!subCategoryId && !classId) {
        return reply.status(400).send({ detail: "Either classId or subCategoryId is required" });
      }

      const cat = await Category.findOne({ id: categoryId });
      if (!cat) return reply.status(404).send({ detail: "Category not found" });

      let subCat = null;
      let cls = null;
      let subj = null;

      if (subCategoryId) {
        subCat = await SubCategory.findOne({ id: subCategoryId });
        if (!subCat) return reply.status(404).send({ detail: "Sub-category not found" });
        if (subCat.category_id !== categoryId) {
          return reply.status(400).send({ detail: "Sub-category does not belong to the selected category" });
        }
      }
      if (classId) {
        cls = await ClassMaster.findOne({ id: classId });
        if (!cls) return reply.status(404).send({ detail: "Class not found" });
      }
      if (subjectId) {
        subj = await SubjectMaster.findOne({ id: subjectId });
        if (!subj) return reply.status(404).send({ detail: "Subject not found" });
      }

      const secondaryName = subCat?.sub_category_name ?? cls?.class_name ?? "general";
      const pdfCode = await generateMappedPdfCode(cat.category_name, secondaryName);
      const isActive =
        requestedIsActive === undefined
          ? isPlatformRole(user.role)
          : requestedIsActive === "true" || requestedIsActive === "1";
      const status = requestedStatus ?? (isPlatformRole(user.role) ? "approved" : "pending");

      const checksum = createHash("sha256").update(data).digest("hex");
      const doc = await Pdf.create({
        file_name: requestedFileName,
        original_file_name: originalFilename,
        file_path: "",
        file_data: data,
        file_size: data.length,
        file_checksum: checksum,
        category_id: categoryId,
        sub_category_id: subCategoryId ?? null,
        class_id: classId ?? null,
        subject_id: subjectId ?? null,
        uploaded_by: user.id,
        pdf_id: pdfCode,
        description,
        status,
        is_active: isActive,
        version_notes: versionNotes
      });
      await PdfVersion.create({
        pdf_id: doc.id,
        version_number: 1,
        file_path: "",
        file_data: data,
        file_size: data.length,
        uploaded_by: user.id,
        version_notes: versionNotes,
        is_current: true
      });
      await writeAudit({
        user_id: user.id,
        action: "pdf_upload",
        resource_type: "pdf",
        resource_id: doc.id,
        request
      });

      // Notify school admins when an approved PDF is uploaded to a category they have access to
      if (status === "approved" && categoryId) {
        (async () => {
          try {
            const accesses = await SchoolCategoryAccess.find({ category_id: categoryId }).lean();
            const schoolIds = [...new Set(accesses.map(a => a.school_id))];
            if (schoolIds.length === 0) return;
            const admins = await User.find({
              school_id: { $in: schoolIds },
              role: { $in: ["school_admin", "school"] },
              is_active: true
            }).lean();
            const pdfTitle = requestedFileName || originalFilename || "New PDF";
            const categoryName = cat?.category_name ?? "your program";
            for (const admin of admins) {
              createAndSendNotification({
                recipient: { id: admin.id, email: admin.email, mobile_number: admin.mobile_number, name: admin.name },
                channels: ["email", "whatsapp", "in_app"],
                type: "new_content",
                subject: `New content available: ${pdfTitle}`,
                message: `A new PDF "${pdfTitle}" has been added to the ${categoryName} program. Log in to your i-iCON Academy portal to access it.`,
                html: `<p>Dear ${admin.name || "Admin"},</p><p>A new PDF <strong>${pdfTitle}</strong> has been added to the <strong>${categoryName}</strong> program.</p><p>Log in to your <a href="https://iiconacademy.in">i-iCON Academy portal</a> to access it.</p>`
              }).catch(() => {});
            }
          } catch {
            // fire-and-forget — do not fail the upload response
          }
        })();
      }

      return serializeDoc(doc.toObject() as Record<string, unknown>);
    }
  );

  app.post(
    "/api/pdfs/bulk-reassign",
    { preHandler: requirePermission(PERMISSIONS.PDF_UPLOAD) },
    async (request, reply) => {
      const body = z
        .object({
          ids: z.array(z.string()).min(1).max(500),
          categoryId: z.string().optional(),
          subCategoryId: z.string().optional(),
          status: z.enum(["pending", "approved", "rejected"]).optional(),
          isActive: z.boolean().optional()
        })
        .parse(request.body);

      if (!body.categoryId && !body.subCategoryId && !body.status && body.isActive === undefined) {
        return reply.status(400).send({ detail: "Provide at least one field to update" });
      }

      // Validate category / sub-category consistency when changing either one
      if (body.subCategoryId) {
        const sub = await SubCategory.findOne({ id: body.subCategoryId });
        if (!sub) return reply.status(404).send({ detail: "Sub-category not found" });
        if (body.categoryId && sub.category_id !== body.categoryId) {
          return reply.status(400).send({ detail: "Sub-category does not belong to the selected category" });
        }
        if (!body.categoryId) body.categoryId = sub.category_id ?? undefined;
      } else if (body.categoryId) {
        const cat = await Category.findOne({ id: body.categoryId });
        if (!cat) return reply.status(404).send({ detail: "Category not found" });
      }

      const update: Record<string, unknown> = {};
      if (body.categoryId) update.category_id = body.categoryId;
      if (body.subCategoryId) update.sub_category_id = body.subCategoryId;
      if (body.status) update.status = body.status;
      if (body.isActive !== undefined) update.is_active = body.isActive;

      const result = await Pdf.updateMany({ id: { $in: body.ids }, deleted_at: null }, { $set: update });
      const user = await requireCurrentUser(request, reply);
      if (user) {
        await writeAudit({
          user_id: user.id,
          action: "pdf_bulk_update",
          action_details: `bulk-updated ${result.modifiedCount}/${body.ids.length} PDFs`,
          resource_type: "pdf",
          request
        });
      }
      return { matched: result.matchedCount, modified: result.modifiedCount };
    }
  );

  app.patch("/api/pdfs/:pdf_id", { preHandler: requirePermission(PERMISSIONS.PDF_UPLOAD) }, async (request, reply) => {
    const params = z.object({ pdf_id: z.string() }).parse(request.params);
    const body = z.record(z.string(), z.unknown()).parse(request.body);
    const update: Record<string, unknown> = {};
    if (body.status !== undefined) update.status = body.status;
    if (body.isActive !== undefined) update.is_active = body.isActive;
    if (body.is_active !== undefined) update.is_active = body.is_active;
    if (body.categoryId !== undefined) update.category_id = body.categoryId;
    if (body.category_id !== undefined) update.category_id = body.category_id;
    if (body.description !== undefined) update.description = body.description;
    const updated = await Pdf.findOneAndUpdate({ id: params.pdf_id }, { $set: update }, { new: true });
    if (!updated) return reply.status(404).send({ detail: "PDF not found" });
    return serializeDoc(updated.toObject() as Record<string, unknown>);
  });

  app.delete("/api/pdfs/:pdf_id", { preHandler: requirePermission(PERMISSIONS.PDF_UPLOAD) }, async (request, reply) => {
    const params = z.object({ pdf_id: z.string() }).parse(request.params);
    const updated = await Pdf.findOneAndUpdate(
      { id: params.pdf_id },
      { $set: { deleted_at: new Date(), is_active: false } },
      { new: true }
    );
    if (!updated) return reply.status(404).send({ detail: "PDF not found" });
    return { message: "PDF archived (soft deleted)" };
  });

  app.post(
    "/api/pdfs/:pdf_id/restore",
    { preHandler: requirePermission(PERMISSIONS.PDF_UPLOAD) },
    async (request, reply) => {
      const params = z.object({ pdf_id: z.string() }).parse(request.params);
      const updated = await Pdf.findOneAndUpdate(
        { id: params.pdf_id },
        { $set: { deleted_at: null, is_active: true } },
        { new: true }
      );
      if (!updated) return reply.status(404).send({ detail: "PDF not found" });
      return serializeDoc(updated.toObject() as Record<string, unknown>);
    }
  );
};
