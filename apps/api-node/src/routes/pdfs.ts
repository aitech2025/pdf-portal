import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { createHash } from "node:crypto";
import { z } from "zod";
import { canAccessCategory, isPlatformRole, requireCurrentUser } from "../lib/access.js";
import { auditUnauthorized, writeAudit } from "../lib/audit.js";
import { generatePdfCode } from "../lib/codes.js";
import { Category, DownloadLog, Pdf, PdfVersion, School, SchoolCategoryAccess } from "../models/index.js";
import { enrichPdfs } from "../lib/pdfEnrich.js";
import { listResponse, serializeDoc } from "../lib/serialize.js";
import { requireAuth, requirePermission } from "../plugins/auth.js";
import { PERMISSIONS } from "../lib/permissions.js";

const watermarkHeaders = async (userId: string, schoolId: string | null | undefined) => {
  const { User } = await import("../models/index.js");
  const user = await User.findOne({ id: userId }).lean();
  let schoolName = "";
  if (schoolId) {
    const school = await School.findOne({ id: schoolId }).lean();
    schoolName = school?.school_name ?? "";
  }
  return {
    "X-Watermark-User": user?.email ?? "",
    "X-Watermark-School": schoolName
  };
};

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
        status: z.string().optional(),
        is_active: z.coerce.boolean().optional(),
        q: z.string().optional(),
        page: z.coerce.number().default(1),
        per_page: z.coerce.number().default(50),
        include_deleted: z.coerce.boolean().optional()
      })
      .parse(request.query);

    const filter: Record<string, unknown> = {};
    if (!query.include_deleted || !isPlatformRole(user.role)) {
      filter.deleted_at = null;
    }
    const categoryId = query.category_id ?? query.categoryId;
    const subCategoryId = query.sub_category_id ?? query.subCategoryId;
    if (categoryId) filter.category_id = categoryId;
    if (subCategoryId) filter.sub_category_id = subCategoryId;
    if (query.status) filter.status = query.status;
    if (query.is_active !== undefined) filter.is_active = query.is_active;
    if (query.q) {
      const regex = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ file_name: regex }, { pdf_id: regex }, { description: regex }, { tags: regex }];
    }

    if (!isPlatformRole(user.role)) {
      const grants = await SchoolCategoryAccess.find({ school_id: user.school_id ?? "" }).lean();
      filter.category_id = { $in: grants.map((g) => g.category_id) };
      filter.status = "approved";
      filter.is_active = true;
    }

    const skip = (query.page - 1) * query.per_page;
    const [rows, total] = await Promise.all([
      Pdf.find(filter).sort({ created: -1 }).skip(skip).limit(query.per_page).lean(),
      Pdf.countDocuments(filter)
    ]);
    const enriched = await enrichPdfs(rows as Record<string, unknown>[]);
    return listResponse(enriched, total);
  });

  app.get("/api/pdfs/:pdf_id", { preHandler: requireAuth }, async (request, reply) => {
    const params = z.object({ pdf_id: z.string() }).parse(request.params);
    const user = await requireCurrentUser(request, reply);
    if (!user) return;
    const pdf = await Pdf.findOne({ id: params.pdf_id, deleted_at: null });
    if (!pdf) return reply.status(404).send({ detail: "PDF not found" });
    const allowed = await canAccessCategory(user.id, user.role, user.school_id, pdf.category_id);
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
    const allowed = await canAccessCategory(user.id, user.role, user.school_id, pdf.category_id);
    if (!allowed) {
      await auditUnauthorized(user.id, `pdf_${action}`, params.pdf_id, request);
      return reply.status(403).send({ detail: "Insufficient permissions" });
    }
    if (!pdf.file_data) return reply.status(404).send({ detail: "PDF file data missing" });

    if (action === "preview") {
      pdf.view_count = (pdf.view_count ?? 0) + 1;
      await pdf.save();
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

    const wm = await watermarkHeaders(user.id, user.school_id);
    reply.header("Content-Type", "application/pdf");
    reply.header("Content-Disposition", `${disposition}; filename="${pdf.file_name}"`);
    reply.header("Cache-Control", "private, no-store");
    for (const [k, v] of Object.entries(wm)) reply.header(k, v);
    return reply.send(pdf.file_data);
  };

  app.get("/api/pdfs/:pdf_id/preview", { preHandler: requireAuth }, (req, rep) => streamPdf(req, rep, "inline", "preview"));
  app.get("/api/pdfs/:pdf_id/download", { preHandler: requireAuth }, (req, rep) => streamPdf(req, rep, "attachment", "download"));
  app.post("/api/pdfs/:pdf_id/print", { preHandler: requireAuth }, (req, rep) => streamPdf(req, rep, "inline", "print"));

  app.post(
    "/api/pdfs",
    { preHandler: requirePermission(PERMISSIONS.PDF_UPLOAD) },
    async (request, reply) => {
      const user = await requireCurrentUser(request, reply);
      if (!user) return;
      const file = await request.file();
      if (!file) return reply.status(400).send({ detail: "File is required" });
      const data = await file.toBuffer();
      const fields = file.fields as Record<string, Array<{ value: string }>>;
      const categoryId = fields.category_id?.[0]?.value ?? fields.categoryId?.[0]?.value ?? null;
      const subCategoryId = fields.sub_category_id?.[0]?.value ?? fields.subCategoryId?.[0]?.value ?? null;
      const description = fields.description?.[0]?.value ?? "";

      let pdfCode: string | undefined;
      if (categoryId) {
        const cat = await Category.findOne({ id: categoryId });
        if (cat?.category_code) pdfCode = await generatePdfCode(cat.category_code);
      }

      const checksum = createHash("sha256").update(data).digest("hex");
      const doc = await Pdf.create({
        file_name: file.filename,
        original_file_name: file.filename,
        file_path: "",
        file_data: data,
        file_size: data.length,
        file_checksum: checksum,
        category_id: categoryId,
        sub_category_id: subCategoryId,
        uploaded_by: user.id,
        pdf_id: pdfCode,
        description,
        status: isPlatformRole(user.role) ? "approved" : "pending",
        is_active: isPlatformRole(user.role)
      });
      await PdfVersion.create({
        pdf_id: doc.id,
        version_number: 1,
        file_path: "",
        file_data: data,
        file_size: data.length,
        uploaded_by: user.id,
        version_notes: "Initial version",
        is_current: true
      });
      await writeAudit({
        user_id: user.id,
        action: "pdf_upload",
        resource_type: "pdf",
        resource_id: doc.id,
        request
      });
      return serializeDoc(doc.toObject() as Record<string, unknown>);
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
