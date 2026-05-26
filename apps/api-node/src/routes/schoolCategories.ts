import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Category, School, SchoolCategoryAccess } from "../models/index.js";
import { canAccessSchool } from "../lib/access.js";
import { auditUnauthorized, writeAudit } from "../lib/audit.js";
import { requireAuth, requirePermission } from "../plugins/auth.js";
import { PERMISSIONS } from "../lib/permissions.js";

export const registerSchoolCategoryRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/api/schools/:school_id/categories", { preHandler: requireAuth }, async (request, reply) => {
    const params = z.object({ school_id: z.string() }).parse(request.params);
    const role = request.authUser?.role ?? "";
    const schoolId = request.authUser?.school_id ?? null;

    if (!canAccessSchool(role, schoolId, params.school_id)) {
      await auditUnauthorized(request.authUser?.sub ?? null, "school_categories", params.school_id, request);
      return reply.status(403).send({ detail: "Insufficient permissions" });
    }

    const school = await School.findOne({ id: params.school_id });
    if (!school) return reply.status(404).send({ detail: "School not found" });

    const grants = await SchoolCategoryAccess.find({ school_id: params.school_id }).lean();
    const categoryIds = grants.map((g) => g.category_id);
    const categories = await Category.find({ id: { $in: categoryIds } }).sort({ display_order: 1 }).lean();
    const catMap = new Map(categories.map((c) => [c.id, c]));

    const items = grants
      .map((g) => {
        const cat = catMap.get(g.category_id);
        if (!cat) return null;
        return {
          id: g.id,
          categoryId: cat.id,
          categoryName: cat.category_name,
          categoryType: cat.category_type,
          categoryCode: cat.category_code,
          isActive: cat.is_active
        };
      })
      .filter(Boolean);

    return { items };
  });

  app.post(
    "/api/schools/:school_id/categories",
    { preHandler: requirePermission(PERMISSIONS.SCHOOL_MANAGE) },
    async (request, reply) => {
      const params = z.object({ school_id: z.string() }).parse(request.params);
      const body = z
        .object({
          category_ids: z.array(z.string()).optional(),
          categoryIds: z.array(z.string()).optional()
        })
        .parse(request.body);
      const categoryIds = body.category_ids ?? body.categoryIds ?? [];

      const school = await School.findOne({ id: params.school_id });
      if (!school) return reply.status(404).send({ detail: "School not found" });

      // ADD categories (upsert) instead of overwriting existing assignments
      const added: string[] = [];
      const skipped: string[] = [];
      for (const category_id of categoryIds) {
        const result = await SchoolCategoryAccess.updateOne(
          { school_id: params.school_id, category_id },
          { $setOnInsert: { school_id: params.school_id, category_id } },
          { upsert: true }
        );
        if (result.upsertedCount > 0) {
          added.push(category_id);
        } else {
          skipped.push(category_id);
        }
      }

      if (request.authUser?.sub) {
        await writeAudit({
          user_id: request.authUser.sub,
          action: "category_assign",
          action_details: `Assigned ${categoryIds.length} categories to school ${params.school_id}`,
          resource_type: "school",
          resource_id: params.school_id,
          request
        });
      }

      return { school_id: params.school_id, categoryIds };
    }
  );

  app.delete(
    "/api/schools/:school_id/categories/:category_id",
    { preHandler: requirePermission(PERMISSIONS.SCHOOL_MANAGE) },
    async (request, reply) => {
      const params = z.object({ school_id: z.string(), category_id: z.string() }).parse(request.params);
      const deleted = await SchoolCategoryAccess.findOneAndDelete({
        school_id: params.school_id,
        category_id: params.category_id
      });
      if (!deleted) return reply.status(404).send({ detail: "Category access not found" });
      return { message: "Category access removed" };
    }
  );
};
