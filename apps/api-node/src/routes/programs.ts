import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Program } from "../models/index.js";
import { listResponse, serializeDoc } from "../lib/serialize.js";
import { requireAuth, requirePermission } from "../plugins/auth.js";
import { PERMISSIONS } from "../lib/permissions.js";

export const registerProgramRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/api/programs", { preHandler: requireAuth }, async () => {
    const rows = await Program.find().sort({ display_order: 1, created: -1 }).lean();
    return listResponse(rows.map((r) => serializeDoc(r as Record<string, unknown>)));
  });

  app.post(
    "/api/programs",
    { preHandler: requirePermission(PERMISSIONS.CATEGORY_MANAGE) },
    async (request, reply) => {
      const body = z
        .object({
          program_code: z.string(),
          program_name: z.string(),
          slug: z.string(),
          description: z.string().optional(),
          icon: z.string().optional()
        })
        .parse(request.body);
      const existing = await Program.findOne({
        $or: [{ program_code: body.program_code }, { program_name: body.program_name }, { slug: body.slug }]
      });
      if (existing) return reply.status(409).send({ detail: "Program already exists" });
      return Program.create(body);
    }
  );

  app.patch(
    "/api/programs/:program_id",
    { preHandler: requirePermission(PERMISSIONS.CATEGORY_MANAGE) },
    async (request, reply) => {
      const params = z.object({ program_id: z.string() }).parse(request.params);
      const body = z
        .object({
          program_code: z.string().optional(),
          program_name: z.string().optional(),
          slug: z.string().optional(),
          description: z.string().optional(),
          icon: z.string().optional(),
          status: z.string().optional(),
          is_archived: z.boolean().optional(),
          display_order: z.number().optional()
        })
        .parse(request.body);
      const updated = await Program.findOneAndUpdate({ id: params.program_id }, { $set: body }, { new: true });
      if (!updated) return reply.status(404).send({ detail: "Program not found" });
      return updated;
    }
  );

  app.delete(
    "/api/programs/:program_id",
    { preHandler: requirePermission(PERMISSIONS.CATEGORY_MANAGE) },
    async (request, reply) => {
      const params = z.object({ program_id: z.string() }).parse(request.params);
      const deleted = await Program.findOneAndDelete({ id: params.program_id });
      if (!deleted) return reply.status(404).send({ detail: "Program not found" });
      return { message: "Program deleted" };
    }
  );
};
