import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Category, Program, SubCategory, Subject } from "../models/index.js";
import { writeAudit } from "../lib/audit.js";
import { generateCategoryCode, slugify } from "../lib/codes.js";
import { listResponse, serializeDoc } from "../lib/serialize.js";
import { requireAuth, requirePermission } from "../plugins/auth.js";
import { PERMISSIONS } from "../lib/permissions.js";

const parseBody = (body: Record<string, unknown>) => ({
  program_id: (body.programId ?? body.program_id) as string | undefined,
  category_name: (body.categoryName ?? body.category_name) as string,
  category_type: (body.categoryType ?? body.category_type) as string,
  program_type: (body.programType ?? body.program_type) as string | undefined,
  category_code: (body.categoryCode ?? body.category_code) as string | undefined,
  slug: body.slug as string | undefined,
  description: body.description as string | undefined,
  is_active: (body.isActive ?? body.is_active) as boolean | undefined,
  display_order: (body.displayOrder ?? body.display_order) as number | undefined
});

export const registerCategoryRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/api/categories", { preHandler: requireAuth }, async () => {
    const rows = await Category.find({ is_archived: { $ne: true } }).sort({ display_order: 1, created: -1 }).lean();
    const { Pdf, SubCategory: SubCat } = await import("../models/index.js");
    const [counts, subCats] = await Promise.all([
      Pdf.aggregate([
        { $match: { deleted_at: null } },
        { $group: { _id: "$category_id", count: { $sum: 1 } } }
      ]),
      SubCat.find({}).sort({ display_order: 1 }).lean()
    ]);
    const countMap = new Map(counts.map((c) => [c._id, c.count]));
    const subCatMap = new Map<string, typeof subCats>();
    for (const s of subCats) {
      const arr = subCatMap.get(s.category_id) ?? [];
      arr.push(s);
      subCatMap.set(s.category_id, arr);
    }
    const items = rows.map((r) => ({
      ...serializeDoc(r as Record<string, unknown>),
      pdfCount: countMap.get(r.id) ?? 0,
      subCategories: (subCatMap.get(r.id) ?? []).map((s) => serializeDoc(s as Record<string, unknown>))
    }));
    return listResponse(items);
  });

  // Get all PDFs mapped to a specific category
  app.get("/api/categories/:cat_id/pdfs", { preHandler: requireAuth }, async (request, reply) => {
    const params = z.object({ cat_id: z.string() }).parse(request.params);
    const query = z
      .object({
        page: z.coerce.number().default(1),
        per_page: z.coerce.number().default(50),
        status: z.string().optional(),
        is_active: z.coerce.boolean().optional()
      })
      .parse(request.query);

    const cat = await Category.findOne({ id: params.cat_id });
    if (!cat) return reply.status(404).send({ detail: "Category not found" });

    const { Pdf, SubCategory: SubCat } = await import("../models/index.js");
    const { enrichPdfs } = await import("../lib/pdfEnrich.js");

    const filter: Record<string, unknown> = { category_id: params.cat_id, deleted_at: null };
    if (query.status) filter.status = query.status;
    if (query.is_active !== undefined) filter.is_active = query.is_active;

    const skip = (query.page - 1) * query.per_page;
    const [rows, total] = await Promise.all([
      Pdf.find(filter).sort({ created: -1 }).skip(skip).limit(query.per_page).lean(),
      Pdf.countDocuments(filter)
    ]);

    const enriched = await enrichPdfs(rows as Record<string, unknown>[]);
    return listResponse(enriched, total);
  });

  app.post(
    "/api/categories",
    { preHandler: requirePermission(PERMISSIONS.CATEGORY_MANAGE) },
    async (request, reply) => {
      const raw = parseBody(z.record(z.string(), z.unknown()).parse(request.body));
      if (!raw.category_name) {
        return reply.status(400).send({ detail: "categoryName is required" });
      }
      raw.category_type = raw.category_type ?? "general";
      let category_code = raw.category_code;
      const slug = raw.slug ?? slugify(raw.category_name);
      if (raw.program_id) {
        const program = await Program.findOne({ id: raw.program_id });
        if (!program) return reply.status(404).send({ detail: "Program not found" });
        if (!category_code) {
          category_code = await generateCategoryCode(program.program_code, raw.category_name);
        }
      }
      const cat = await Category.create({
        program_id: raw.program_id ?? null,
        category_code,
        category_name: raw.category_name,
        slug,
        category_type: raw.category_type,
        program_type: raw.program_type ?? "pdf",
        description: raw.description,
        is_active: raw.is_active ?? true
      });
      if (request.authUser?.sub) {
        await writeAudit({
          user_id: request.authUser.sub,
          action: "category_create",
          resource_type: "category",
          resource_id: cat.id,
          request
        });
      }
      return serializeDoc(cat.toObject() as Record<string, unknown>);
    }
  );

  app.patch(
    "/api/categories/:cat_id",
    { preHandler: requirePermission(PERMISSIONS.CATEGORY_MANAGE) },
    async (request, reply) => {
      const params = z.object({ cat_id: z.string() }).parse(request.params);
      const body = z.record(z.string(), z.unknown()).parse(request.body);
      const update: Record<string, unknown> = {};
      if (body.categoryName !== undefined) update.category_name = body.categoryName;
      if (body.category_name !== undefined) update.category_name = body.category_name;
      if (body.categoryType !== undefined) update.category_type = body.categoryType;
      if (body.programType !== undefined) update.program_type = body.programType;
      if (body.programId !== undefined) update.program_id = body.programId;
      if (body.isActive !== undefined) update.is_active = body.isActive;
      if (body.isArchived !== undefined) update.is_archived = body.isArchived;
      if (body.displayOrder !== undefined) update.display_order = body.displayOrder;
      if (body.description !== undefined) update.description = body.description;
      const updated = await Category.findOneAndUpdate({ id: params.cat_id }, { $set: update }, { new: true });
      if (!updated) return reply.status(404).send({ detail: "Category not found" });
      return serializeDoc(updated.toObject() as Record<string, unknown>);
    }
  );

  app.delete(
    "/api/categories/:cat_id",
    { preHandler: requirePermission(PERMISSIONS.CATEGORY_MANAGE) },
    async (request, reply) => {
      const params = z.object({ cat_id: z.string() }).parse(request.params);
      const childCount = await SubCategory.countDocuments({ category_id: params.cat_id });
      if (childCount > 0) {
        return reply.status(409).send({ detail: `Cannot delete: ${childCount} class(es) exist under this program. Delete or move them first.` });
      }
      const deleted = await Category.findOneAndDelete({ id: params.cat_id });
      if (!deleted) return reply.status(404).send({ detail: "Category not found" });
      return { message: "Category deleted" };
    }
  );

  app.get("/api/subCategories", { preHandler: requireAuth }, async (request) => {
    const query = z
      .object({
        category_id: z.string().optional(),
        categoryId: z.string().optional(),
        is_active: z.coerce.boolean().optional()
      })
      .parse(request.query);
    const categoryId = query.category_id ?? query.categoryId;
    const filter: Record<string, unknown> = categoryId ? { category_id: categoryId } : {};
    if (query.is_active !== undefined) filter.is_active = query.is_active;
    const rows = await SubCategory.find(filter).sort({ display_order: 1 }).lean();
    return listResponse(rows.map((r) => serializeDoc(r as Record<string, unknown>)));
  });

  app.post(
    "/api/subCategories",
    { preHandler: requirePermission(PERMISSIONS.CATEGORY_MANAGE) },
    async (request) => {
      const body = z.record(z.string(), z.unknown()).parse(request.body);
      const sub = await SubCategory.create({
        sub_category_name: (body.subCategoryName ?? body.sub_category_name) as string,
        category_id: (body.categoryId ?? body.category_id) as string,
        sub_category_code: (body.subCategoryCode ?? body.sub_category_code) as string | undefined,
        description: body.description as string | undefined,
        is_active: (body.isActive ?? body.is_active ?? true) as boolean,
        display_order: (body.displayOrder ?? body.display_order ?? 0) as number
      });
      return serializeDoc(sub.toObject() as Record<string, unknown>);
    }
  );

  app.patch(
    "/api/subCategories/:sub_id",
    { preHandler: requirePermission(PERMISSIONS.CATEGORY_MANAGE) },
    async (request, reply) => {
      const params = z.object({ sub_id: z.string() }).parse(request.params);
      const body = z.record(z.string(), z.unknown()).parse(request.body);
      const update: Record<string, unknown> = {};
      if (body.subCategoryName !== undefined) update.sub_category_name = body.subCategoryName;
      if (body.categoryId !== undefined) update.category_id = body.categoryId;
      if (body.isActive !== undefined) update.is_active = body.isActive;
      if (body.subCategoryCode !== undefined) update.sub_category_code = body.subCategoryCode;
      if (body.description !== undefined) update.description = body.description;
      if (body.displayOrder !== undefined) update.display_order = body.displayOrder;
      const updated = await SubCategory.findOneAndUpdate({ id: params.sub_id }, { $set: update }, { new: true });
      if (!updated) return reply.status(404).send({ detail: "Sub-category not found" });
      return serializeDoc(updated.toObject() as Record<string, unknown>);
    }
  );

  app.delete(
    "/api/subCategories/:sub_id",
    { preHandler: requirePermission(PERMISSIONS.CATEGORY_MANAGE) },
    async (request, reply) => {
      const params = z.object({ sub_id: z.string() }).parse(request.params);
      const childCount = await Subject.countDocuments({ class_id: params.sub_id });
      if (childCount > 0) {
        return reply.status(409).send({ detail: `Cannot delete: ${childCount} subject(s) exist under this class. Delete them first.` });
      }
      const deleted = await SubCategory.findOneAndDelete({ id: params.sub_id });
      if (!deleted) return reply.status(404).send({ detail: "Sub-category not found" });
      return { message: "Sub-category deleted" };
    }
  );
};
