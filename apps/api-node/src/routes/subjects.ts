import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Subject } from "../models/index.js";
import { listResponse, serializeDoc } from "../lib/serialize.js";
import { requireAuth, requirePermission } from "../plugins/auth.js";
import { PERMISSIONS } from "../lib/permissions.js";

export const registerSubjectRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/api/subjects", { preHandler: requireAuth }, async (request) => {
    const query = z
      .object({
        class_id: z.string().optional(),
        classId: z.string().optional(),
        is_active: z.coerce.boolean().optional()
      })
      .parse(request.query);
    const classId = query.class_id ?? query.classId;
    const filter: Record<string, unknown> = {};
    if (classId) filter.class_id = classId;
    if (query.is_active !== undefined) filter.is_active = query.is_active;
    const rows = await Subject.find(filter).sort({ display_order: 1, subject_name: 1 }).lean();
    return listResponse(rows.map((r) => serializeDoc(r as Record<string, unknown>)));
  });

  app.post(
    "/api/subjects",
    { preHandler: requirePermission(PERMISSIONS.CATEGORY_MANAGE) },
    async (request, reply) => {
      const body = z.record(z.string(), z.unknown()).parse(request.body);
      const subject_name = (body.subjectName ?? body.subject_name) as string;
      const class_id = (body.classId ?? body.class_id) as string;
      if (!subject_name || !class_id) {
        return reply.status(400).send({ detail: "subjectName and classId are required" });
      }
      const subject = await Subject.create({
        subject_name,
        class_id,
        subject_code: (body.subjectCode ?? body.subject_code) as string | undefined,
        description: body.description as string | undefined,
        is_active: (body.isActive ?? body.is_active ?? true) as boolean,
        display_order: (body.displayOrder ?? body.display_order ?? 0) as number
      });
      return serializeDoc(subject.toObject() as Record<string, unknown>);
    }
  );

  app.patch(
    "/api/subjects/:subject_id",
    { preHandler: requirePermission(PERMISSIONS.CATEGORY_MANAGE) },
    async (request, reply) => {
      const params = z.object({ subject_id: z.string() }).parse(request.params);
      const body = z.record(z.string(), z.unknown()).parse(request.body);
      const update: Record<string, unknown> = {};
      if (body.subjectName !== undefined) update.subject_name = body.subjectName;
      if (body.subject_name !== undefined) update.subject_name = body.subject_name;
      if (body.classId !== undefined) update.class_id = body.classId;
      if (body.isActive !== undefined) update.is_active = body.isActive;
      if (body.description !== undefined) update.description = body.description;
      if (body.displayOrder !== undefined) update.display_order = body.displayOrder;
      if (body.subjectCode !== undefined) update.subject_code = body.subjectCode;
      const updated = await Subject.findOneAndUpdate({ id: params.subject_id }, { $set: update }, { new: true });
      if (!updated) return reply.status(404).send({ detail: "Subject not found" });
      return serializeDoc(updated.toObject() as Record<string, unknown>);
    }
  );

  app.delete(
    "/api/subjects/:subject_id",
    { preHandler: requirePermission(PERMISSIONS.CATEGORY_MANAGE) },
    async (request, reply) => {
      const params = z.object({ subject_id: z.string() }).parse(request.params);
      const deleted = await Subject.findOneAndDelete({ id: params.subject_id });
      if (!deleted) return reply.status(404).send({ detail: "Subject not found" });
      return { message: "Subject deleted" };
    }
  );
};
