import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { SubjectMaster, ProgramClassSubjectMap } from "../models/index.js";
import { listResponse, serializeDoc } from "../lib/serialize.js";
import { requireAuth, requirePermission } from "../plugins/auth.js";
import { PERMISSIONS } from "../lib/permissions.js";

export const registerMasterSubjectRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/api/masterSubjects", { preHandler: requireAuth }, async (request) => {
    const query = z
      .object({
        is_active: z.coerce.boolean().optional(),
        search: z.string().optional()
      })
      .parse(request.query);

    const filter: Record<string, unknown> = {};
    if (query.is_active !== undefined) filter.is_active = query.is_active;
    if (query.search) filter.subject_name = { $regex: query.search, $options: "i" };

    const rows = await SubjectMaster.find(filter).sort({ display_order: 1, subject_name: 1 }).lean();
    return listResponse(rows.map((r) => serializeDoc(r as Record<string, unknown>)));
  });

  app.post(
    "/api/masterSubjects",
    { preHandler: requirePermission(PERMISSIONS.CATEGORY_MANAGE) },
    async (request, reply) => {
      const body = z.record(z.string(), z.unknown()).parse(request.body);
      const subject_name = (body.subjectName ?? body.subject_name) as string;
      if (!subject_name) return reply.status(400).send({ detail: "subjectName is required" });

      const existing = await SubjectMaster.findOne({ subject_name: { $regex: `^${subject_name}$`, $options: "i" } });
      if (existing) return reply.status(409).send({ detail: "A subject with this name already exists" });

      const subj = await SubjectMaster.create({
        subject_name,
        subject_code: (body.subjectCode ?? body.subject_code) as string | undefined,
        description: body.description as string | undefined,
        is_active: (body.isActive ?? body.is_active ?? true) as boolean,
        display_order: (body.displayOrder ?? body.display_order ?? 0) as number
      });
      return serializeDoc(subj.toObject() as Record<string, unknown>);
    }
  );

  app.patch(
    "/api/masterSubjects/:subject_id",
    { preHandler: requirePermission(PERMISSIONS.CATEGORY_MANAGE) },
    async (request, reply) => {
      const params = z.object({ subject_id: z.string() }).parse(request.params);
      const body = z.record(z.string(), z.unknown()).parse(request.body);
      const update: Record<string, unknown> = {};
      if (body.subjectName !== undefined) update.subject_name = body.subjectName;
      if (body.subject_name !== undefined) update.subject_name = body.subject_name;
      if (body.subjectCode !== undefined) update.subject_code = body.subjectCode;
      if (body.description !== undefined) update.description = body.description;
      if (body.isActive !== undefined) update.is_active = body.isActive;
      if (body.displayOrder !== undefined) update.display_order = body.displayOrder;

      const updated = await SubjectMaster.findOneAndUpdate({ id: params.subject_id }, { $set: update }, { new: true });
      if (!updated) return reply.status(404).send({ detail: "Subject not found" });
      return serializeDoc(updated.toObject() as Record<string, unknown>);
    }
  );

  app.delete(
    "/api/masterSubjects/:subject_id",
    { preHandler: requirePermission(PERMISSIONS.CATEGORY_MANAGE) },
    async (request, reply) => {
      const params = z.object({ subject_id: z.string() }).parse(request.params);
      const usageCount = await ProgramClassSubjectMap.countDocuments({ subject_id: params.subject_id });
      if (usageCount > 0) {
        return reply.status(409).send({ detail: `Cannot delete: this subject is assigned to ${usageCount} program-class combination(s). Remove it from programs first.` });
      }
      const deleted = await SubjectMaster.findOneAndDelete({ id: params.subject_id });
      if (!deleted) return reply.status(404).send({ detail: "Subject not found" });
      return { message: "Subject deleted" };
    }
  );
};
