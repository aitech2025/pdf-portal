import { z } from "zod";
import { Category, Program, SubCategory } from "../models/index.js";
import { writeAudit } from "../lib/audit.js";
import { generateCategoryCode, slugify } from "../lib/codes.js";
import { listResponse, serializeDoc } from "../lib/serialize.js";
import { requireAuth, requirePermission } from "../plugins/auth.js";
import { PERMISSIONS } from "../lib/permissions.js";
const parseBody = (body) => ({
    program_id: (body.programId ?? body.program_id),
    category_name: (body.categoryName ?? body.category_name),
    category_type: (body.categoryType ?? body.category_type),
    category_code: (body.categoryCode ?? body.category_code),
    slug: body.slug,
    description: body.description,
    is_active: (body.isActive ?? body.is_active),
    display_order: (body.displayOrder ?? body.display_order)
});
export const registerCategoryRoutes = async (app) => {
    app.get("/api/categories", { preHandler: requireAuth }, async () => {
        const rows = await Category.find({ is_archived: { $ne: true } }).sort({ display_order: 1, created: -1 }).lean();
        const { Pdf } = await import("../models/index.js");
        const counts = await Pdf.aggregate([
            { $match: { deleted_at: null } },
            { $group: { _id: "$category_id", count: { $sum: 1 } } }
        ]);
        const countMap = new Map(counts.map((c) => [c._id, c.count]));
        const items = rows.map((r) => ({
            ...serializeDoc(r),
            pdfCount: countMap.get(r.id) ?? 0
        }));
        return listResponse(items);
    });
    app.post("/api/categories", { preHandler: requirePermission(PERMISSIONS.CATEGORY_MANAGE) }, async (request, reply) => {
        const raw = parseBody(z.record(z.string(), z.unknown()).parse(request.body));
        if (!raw.category_name || !raw.category_type) {
            return reply.status(400).send({ detail: "categoryName and categoryType are required" });
        }
        let category_code = raw.category_code;
        const slug = raw.slug ?? slugify(raw.category_name);
        if (raw.program_id) {
            const program = await Program.findOne({ id: raw.program_id });
            if (!program)
                return reply.status(404).send({ detail: "Program not found" });
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
        return serializeDoc(cat.toObject());
    });
    app.patch("/api/categories/:cat_id", { preHandler: requirePermission(PERMISSIONS.CATEGORY_MANAGE) }, async (request, reply) => {
        const params = z.object({ cat_id: z.string() }).parse(request.params);
        const body = z.record(z.string(), z.unknown()).parse(request.body);
        const update = {};
        if (body.categoryName !== undefined)
            update.category_name = body.categoryName;
        if (body.category_name !== undefined)
            update.category_name = body.category_name;
        if (body.categoryType !== undefined)
            update.category_type = body.categoryType;
        if (body.programId !== undefined)
            update.program_id = body.programId;
        if (body.isActive !== undefined)
            update.is_active = body.isActive;
        if (body.isArchived !== undefined)
            update.is_archived = body.isArchived;
        if (body.displayOrder !== undefined)
            update.display_order = body.displayOrder;
        if (body.description !== undefined)
            update.description = body.description;
        const updated = await Category.findOneAndUpdate({ id: params.cat_id }, { $set: update }, { new: true });
        if (!updated)
            return reply.status(404).send({ detail: "Category not found" });
        return serializeDoc(updated.toObject());
    });
    app.delete("/api/categories/:cat_id", { preHandler: requirePermission(PERMISSIONS.CATEGORY_MANAGE) }, async (request, reply) => {
        const params = z.object({ cat_id: z.string() }).parse(request.params);
        await SubCategory.deleteMany({ category_id: params.cat_id });
        const deleted = await Category.findOneAndDelete({ id: params.cat_id });
        if (!deleted)
            return reply.status(404).send({ detail: "Category not found" });
        return { message: "Category deleted" };
    });
    app.get("/api/subCategories", { preHandler: requireAuth }, async (request) => {
        const query = z
            .object({
            category_id: z.string().optional(),
            categoryId: z.string().optional()
        })
            .parse(request.query);
        const categoryId = query.category_id ?? query.categoryId;
        const filter = categoryId ? { category_id: categoryId } : {};
        const rows = await SubCategory.find(filter).sort({ display_order: 1 }).lean();
        return listResponse(rows.map((r) => serializeDoc(r)));
    });
    app.post("/api/subCategories", { preHandler: requirePermission(PERMISSIONS.CATEGORY_MANAGE) }, async (request) => {
        const body = z.record(z.string(), z.unknown()).parse(request.body);
        const sub = await SubCategory.create({
            sub_category_name: (body.subCategoryName ?? body.sub_category_name),
            category_id: (body.categoryId ?? body.category_id),
            description: body.description
        });
        return serializeDoc(sub.toObject());
    });
    app.patch("/api/subCategories/:sub_id", { preHandler: requirePermission(PERMISSIONS.CATEGORY_MANAGE) }, async (request, reply) => {
        const params = z.object({ sub_id: z.string() }).parse(request.params);
        const body = z.record(z.string(), z.unknown()).parse(request.body);
        const update = {};
        if (body.subCategoryName !== undefined)
            update.sub_category_name = body.subCategoryName;
        if (body.categoryId !== undefined)
            update.category_id = body.categoryId;
        if (body.isActive !== undefined)
            update.is_active = body.isActive;
        const updated = await SubCategory.findOneAndUpdate({ id: params.sub_id }, { $set: update }, { new: true });
        if (!updated)
            return reply.status(404).send({ detail: "Sub-category not found" });
        return serializeDoc(updated.toObject());
    });
    app.delete("/api/subCategories/:sub_id", { preHandler: requirePermission(PERMISSIONS.CATEGORY_MANAGE) }, async (request, reply) => {
        const params = z.object({ sub_id: z.string() }).parse(request.params);
        const deleted = await SubCategory.findOneAndDelete({ id: params.sub_id });
        if (!deleted)
            return reply.status(404).send({ detail: "Sub-category not found" });
        return { message: "Sub-category deleted" };
    });
};
