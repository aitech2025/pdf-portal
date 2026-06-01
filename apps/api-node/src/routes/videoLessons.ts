import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { VideoLesson, SchoolCategoryAccess } from "../models/index.js";
import { listResponse, serializeDoc } from "../lib/serialize.js";
import { requireAuth, requirePermission } from "../plugins/auth.js";
import { PERMISSIONS } from "../lib/permissions.js";
import { writeAudit } from "../lib/audit.js";

function extractVimeoId(url: string): string | null {
  const patterns = [
    /vimeo\.com\/(\d+)/,
    /vimeo\.com\/video\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export const registerVideoLessonRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/api/videoLessons", { preHandler: requireAuth }, async (request) => {
    const query = z
      .object({
        program_id: z.string().optional(),
        programId: z.string().optional(),
        class_id: z.string().optional(),
        classId: z.string().optional(),
        subject_id: z.string().optional(),
        subjectId: z.string().optional(),
        page: z.coerce.number().default(1),
        per_page: z.coerce.number().default(50)
      })
      .parse(request.query);

    const filter: Record<string, unknown> = {};
    const programId = query.programId ?? query.program_id;
    const classId = query.classId ?? query.class_id;
    const subjectId = query.subjectId ?? query.subject_id;

    // School users can only see lessons for programs/classes they have access to
    const role = request.authUser?.role ?? "";
    const schoolId = request.authUser?.school_id;
    const isSchoolUser = !!schoolId;

    if (isSchoolUser) {
      const grants = await SchoolCategoryAccess.find({ school_id: schoolId }).lean();
      const allowedProgramIds = grants.map((g) => g.category_id);
      if (programId && !allowedProgramIds.includes(programId)) {
        return listResponse([], 0);
      }
      if (!programId) {
        filter.program_id = { $in: allowedProgramIds };
      }
    }

    if (programId) filter.program_id = programId;
    if (classId) filter.class_id = classId;
    if (subjectId) filter.subject_id = subjectId;
    filter.is_active = true;

    const skip = (query.page - 1) * query.per_page;
    const [rows, total] = await Promise.all([
      VideoLesson.find(filter).sort({ created: -1 }).skip(skip).limit(query.per_page).lean(),
      VideoLesson.countDocuments(filter)
    ]);

    return listResponse(rows.map((r) => serializeDoc(r as Record<string, unknown>)), total);
  });

  // Admin: list all lessons (no active filter)
  app.get("/api/videoLessons/admin", { preHandler: requirePermission(PERMISSIONS.CATEGORY_MANAGE) }, async (request) => {
    const query = z
      .object({
        program_id: z.string().optional(),
        programId: z.string().optional(),
        class_id: z.string().optional(),
        classId: z.string().optional(),
        page: z.coerce.number().default(1),
        per_page: z.coerce.number().default(50)
      })
      .parse(request.query);

    const filter: Record<string, unknown> = {};
    const programId = query.programId ?? query.program_id;
    const classId = query.classId ?? query.class_id;
    if (programId) filter.program_id = programId;
    if (classId) filter.class_id = classId;

    const skip = (query.page - 1) * query.per_page;
    const [rows, total] = await Promise.all([
      VideoLesson.find(filter).sort({ created: -1 }).skip(skip).limit(query.per_page).lean(),
      VideoLesson.countDocuments(filter)
    ]);

    return listResponse(rows.map((r) => serializeDoc(r as Record<string, unknown>)), total);
  });

  app.post(
    "/api/videoLessons",
    { preHandler: requirePermission(PERMISSIONS.CATEGORY_MANAGE) },
    async (request, reply) => {
      const body = z.record(z.string(), z.unknown()).parse(request.body);
      const title = (body.title) as string;
      const vimeo_url = (body.vimeoUrl ?? body.vimeo_url) as string;
      const program_id = (body.programId ?? body.program_id) as string;
      const class_id = (body.classId ?? body.class_id) as string;

      if (!title || !vimeo_url || !program_id || !class_id) {
        return reply.status(400).send({ detail: "title, vimeoUrl, programId, and classId are required" });
      }

      const vimeo_id = extractVimeoId(vimeo_url);
      const created_by = request.authUser?.sub ?? "system";

      const lesson = await VideoLesson.create({
        title,
        description: body.description as string | undefined,
        vimeo_url,
        vimeo_id: vimeo_id ?? undefined,
        program_id,
        class_id,
        subject_id: (body.subjectId ?? body.subject_id ?? null) as string | null,
        thumbnail: body.thumbnail as string | undefined,
        is_active: (body.isActive ?? body.is_active ?? true) as boolean,
        created_by
      });

      if (request.authUser?.sub) {
        await writeAudit({
          user_id: request.authUser.sub,
          action: "video_lesson_create",
          resource_type: "video_lesson",
          resource_id: lesson.id,
          request
        });
      }

      return serializeDoc(lesson.toObject() as Record<string, unknown>);
    }
  );

  app.patch(
    "/api/videoLessons/:lesson_id",
    { preHandler: requirePermission(PERMISSIONS.CATEGORY_MANAGE) },
    async (request, reply) => {
      const params = z.object({ lesson_id: z.string() }).parse(request.params);
      const body = z.record(z.string(), z.unknown()).parse(request.body);
      const update: Record<string, unknown> = {};
      if (body.title !== undefined) update.title = body.title;
      if (body.description !== undefined) update.description = body.description;
      if (body.vimeoUrl !== undefined || body.vimeo_url !== undefined) {
        const url = (body.vimeoUrl ?? body.vimeo_url) as string;
        update.vimeo_url = url;
        update.vimeo_id = extractVimeoId(url) ?? undefined;
      }
      if (body.programId !== undefined) update.program_id = body.programId;
      if (body.classId !== undefined) update.class_id = body.classId;
      if (body.subjectId !== undefined) update.subject_id = body.subjectId ?? null;
      if (body.isActive !== undefined) update.is_active = body.isActive;
      if (body.thumbnail !== undefined) update.thumbnail = body.thumbnail;

      const updated = await VideoLesson.findOneAndUpdate({ id: params.lesson_id }, { $set: update }, { new: true });
      if (!updated) return reply.status(404).send({ detail: "Video lesson not found" });
      return serializeDoc(updated.toObject() as Record<string, unknown>);
    }
  );

  app.delete(
    "/api/videoLessons/:lesson_id",
    { preHandler: requirePermission(PERMISSIONS.CATEGORY_MANAGE) },
    async (request, reply) => {
      const params = z.object({ lesson_id: z.string() }).parse(request.params);
      const deleted = await VideoLesson.findOneAndDelete({ id: params.lesson_id });
      if (!deleted) return reply.status(404).send({ detail: "Video lesson not found" });
      return { message: "Video lesson deleted" };
    }
  );

  // Track view
  app.post("/api/videoLessons/:lesson_id/view", { preHandler: requireAuth }, async (request, reply) => {
    const params = z.object({ lesson_id: z.string() }).parse(request.params);
    await VideoLesson.findOneAndUpdate({ id: params.lesson_id }, { $inc: { view_count: 1 } });
    return { message: "View recorded" };
  });

  // Track download
  app.post("/api/videoLessons/:lesson_id/download", { preHandler: requireAuth }, async (request, reply) => {
    const params = z.object({ lesson_id: z.string() }).parse(request.params);
    await VideoLesson.findOneAndUpdate({ id: params.lesson_id }, { $inc: { download_count: 1 } });
    return { message: "Download recorded" };
  });
};
