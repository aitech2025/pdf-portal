import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ClassMaster, ProgramClassMap } from "../models/index.js";
import { listResponse, serializeDoc } from "../lib/serialize.js";
import { requireAuth, requirePermission } from "../plugins/auth.js";
import { PERMISSIONS } from "../lib/permissions.js";

export const registerMasterClassRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/api/masterClasses", { preHandler: requireAuth }, async (request) => {
    const query = z
      .object({
        is_active: z.coerce.boolean().optional(),
        search: z.string().optional()
      })
      .parse(request.query);

    const filter: Record<string, unknown> = {};
    if (query.is_active !== undefined) filter.is_active = query.is_active;
    if (query.search) filter.class_name = { $regex: query.search, $options: "i" };

    const rows = await ClassMaster.find(filter).sort({ display_order: 1, class_name: 1 }).lean();
    return listResponse(rows.map((r) => serializeDoc(r as Record<string, unknown>)));
  });

  app.post(
    "/api/masterClasses",
    { preHandler: requirePermission(PERMISSIONS.CATEGORY_MANAGE) },
    async (request, reply) => {
      const body = z.record(z.string(), z.unknown()).parse(request.body);
      const class_name = (body.className ?? body.class_name) as string;
      if (!class_name) return reply.status(400).send({ detail: "className is required" });

      const existing = await ClassMaster.findOne({ class_name: { $regex: `^${class_name}$`, $options: "i" } });
      if (existing) return reply.status(409).send({ detail: "A class with this name already exists" });

      const cls = await ClassMaster.create({
        class_name,
        class_code: (body.classCode ?? body.class_code) as string | undefined,
        description: body.description as string | undefined,
        is_active: (body.isActive ?? body.is_active ?? true) as boolean,
        display_order: (body.displayOrder ?? body.display_order ?? 0) as number
      });
      return serializeDoc(cls.toObject() as Record<string, unknown>);
    }
  );

  app.patch(
    "/api/masterClasses/:class_id",
    { preHandler: requirePermission(PERMISSIONS.CATEGORY_MANAGE) },
    async (request, reply) => {
      const params = z.object({ class_id: z.string() }).parse(request.params);
      const body = z.record(z.string(), z.unknown()).parse(request.body);
      const update: Record<string, unknown> = {};
      if (body.className !== undefined) update.class_name = body.className;
      if (body.class_name !== undefined) update.class_name = body.class_name;
      if (body.classCode !== undefined) update.class_code = body.classCode;
      if (body.description !== undefined) update.description = body.description;
      if (body.isActive !== undefined) update.is_active = body.isActive;
      if (body.displayOrder !== undefined) update.display_order = body.displayOrder;

      const updated = await ClassMaster.findOneAndUpdate({ id: params.class_id }, { $set: update }, { new: true });
      if (!updated) return reply.status(404).send({ detail: "Class not found" });
      return serializeDoc(updated.toObject() as Record<string, unknown>);
    }
  );

  app.delete(
    "/api/masterClasses/:class_id",
    { preHandler: requirePermission(PERMISSIONS.CATEGORY_MANAGE) },
    async (request, reply) => {
      const params = z.object({ class_id: z.string() }).parse(request.params);
      const usageCount = await ProgramClassMap.countDocuments({ class_id: params.class_id });
      if (usageCount > 0) {
        return reply.status(409).send({ detail: `Cannot delete: this class is assigned to ${usageCount} program(s). Remove it from programs first.` });
      }
      const deleted = await ClassMaster.findOneAndDelete({ id: params.class_id });
      if (!deleted) return reply.status(404).send({ detail: "Class not found" });
      return { message: "Class deleted" };
    }
  );
};
