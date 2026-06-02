import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { VideoLesson, SchoolCategoryAccess, SchoolClassAccess, SchoolSubjectAccess, Category } from "../models/index.js";
import { listResponse, serializeDoc } from "../lib/serialize.js";
import { requireAuth, requirePermission } from "../plugins/auth.js";
import { PERMISSIONS } from "../lib/permissions.js";
import { writeAudit } from "../lib/audit.js";

function parseVimeoUrl(url: string): { id: string | null; hash: string | null } {
  if (!url) return { id: null, hash: null };
  // player.vimeo.com/video/ID?h=HASH
  let m = url.match(/player\.vimeo\.com\/video\/(\d+)/);
  if (m) {
    const h = url.match(/[?&]h=([a-zA-Z0-9]+)/);
    return { id: m[1], hash: h ? h[1] : null };
  }
  // vimeo.com/ID or vimeo.com/ID/HASH
  m = url.match(/vimeo\.com\/(\d+)(?:\/([a-zA-Z0-9]+))?/);
  if (m) return { id: m[1], hash: m[2] ?? null };
  // plain numeric ID
  if (/^\d+$/.test(url.trim())) return { id: url.trim(), hash: null };
  return { id: null, hash: null };
}

function extractVimeoId(url: string): string | null {
  return parseVimeoUrl(url).id;
}

export const registerVideoLessonRoutes = async (app: FastifyInstance): Promise<void> => {
  // School / public: active lessons filtered by school program access
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

    const schoolId = request.authUser?.school_id;
    const isSchoolUser = !!schoolId;

    if (isSchoolUser) {
      const [categoryGrants, classGrants, subjectGrants] = await Promise.all([
        SchoolCategoryAccess.find({ school_id: schoolId }).lean(),
        SchoolClassAccess.find({ school_id: schoolId }).lean(),
        SchoolSubjectAccess.find({ school_id: schoolId }).lean(),
      ]);

      const allowedProgramIds = categoryGrants.map((g) => g.category_id);
      if (programId && !allowedProgramIds.includes(programId)) return listResponse([], 0);

      const programsToQuery = programId ? [programId] : allowedProgramIds;
      if (programsToQuery.length === 0) return listResponse([], 0);

      // Group class grants: program_id → class_ids[]
      const classesByProgram: Record<string, string[]> = {};
      for (const g of classGrants) {
        if (!classesByProgram[g.program_id]) classesByProgram[g.program_id] = [];
        classesByProgram[g.program_id].push(g.class_id);
      }

      // Group subject grants: program_id → class_id → subject_ids[]
      const subjectsByProgramClass: Record<string, Record<string, string[]>> = {};
      for (const g of subjectGrants) {
        if (!subjectsByProgramClass[g.program_id]) subjectsByProgramClass[g.program_id] = {};
        if (!subjectsByProgramClass[g.program_id][g.class_id]) subjectsByProgramClass[g.program_id][g.class_id] = [];
        subjectsByProgramClass[g.program_id][g.class_id].push(g.subject_id);
      }

      // Build $or clauses — most-specific grant level wins per program
      const orClauses: Record<string, unknown>[] = [];
      for (const pid of programsToQuery) {
        const classToSubjects = subjectsByProgramClass[pid] ?? {};
        const grantedClassIds = classesByProgram[pid] ?? [];

        if (Object.keys(classToSubjects).length > 0) {
          // Subject-level: only videos whose class+subject match a grant
          for (const [cid, subjectIds] of Object.entries(classToSubjects)) {
            orClauses.push({ program_id: pid, class_id: cid, subject_id: { $in: subjectIds } });
          }
        } else if (grantedClassIds.length > 0) {
          // Class-level: all active videos for granted classes in this program
          orClauses.push({ program_id: pid, class_id: { $in: grantedClassIds } });
        } else {
          // Program-level (legacy/PDF programs): all active videos in this program
          orClauses.push({ program_id: pid });
        }
      }

      if (orClauses.length === 0) return listResponse([], 0);
      filter["$or"] = orClauses;
    } else {
      if (programId) filter.program_id = programId;
    }

    // Client-side UI filters apply on top of access control
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

  // Admin: full repository view — requires CATEGORY_MANAGE so moderators can view for program assignment
  app.get("/api/videoLessons/admin", { preHandler: requirePermission(PERMISSIONS.CATEGORY_MANAGE) }, async (request) => {
    const query = z
      .object({
        program_id: z.string().optional(),
        programId: z.string().optional(),
        class_id: z.string().optional(),
        classId: z.string().optional(),
        subject_id: z.string().optional(),
        subjectId: z.string().optional(),
        unassigned: z.string().optional(), // "true" = only show program_id=null
        page: z.coerce.number().default(1),
        per_page: z.coerce.number().default(100)
      })
      .parse(request.query);

    const filter: Record<string, unknown> = {};
    const programId = query.programId ?? query.program_id;
    const classId = query.classId ?? query.class_id;
    const subjectId = query.subjectId ?? query.subject_id;

    if (query.unassigned === "true") {
      filter.program_id = null;
    } else if (programId) {
      filter.program_id = programId;
    }
    if (classId) filter.class_id = classId;
    if (subjectId) filter.subject_id = subjectId;

    const skip = (query.page - 1) * query.per_page;
    const [rows, total] = await Promise.all([
      VideoLesson.find(filter).sort({ created: -1 }).skip(skip).limit(query.per_page).lean(),
      VideoLesson.countDocuments(filter)
    ]);

    return listResponse(rows.map((r) => serializeDoc(r as Record<string, unknown>)), total);
  });

  // Create video — platform admin only (VIDEO_MANAGE), no program required at upload time
  app.post(
    "/api/videoLessons",
    { preHandler: requirePermission(PERMISSIONS.VIDEO_MANAGE) },
    async (request, reply) => {
      const body = z.record(z.string(), z.unknown()).parse(request.body);
      const title = body.title as string;
      const vimeo_url = (body.vimeoUrl ?? body.vimeo_url) as string;
      const class_id = (body.classId ?? body.class_id) as string;

      if (!title || !vimeo_url || !class_id) {
        return reply.status(400).send({ detail: "title, vimeoUrl, and classId are required" });
      }

      const vimeo_id = extractVimeoId(vimeo_url);
      const created_by = request.authUser?.sub ?? "system";
      const program_id = (body.programId ?? body.program_id ?? null) as string | null;

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

  // Update video — platform admin only
  app.patch(
    "/api/videoLessons/:lesson_id",
    { preHandler: requirePermission(PERMISSIONS.VIDEO_MANAGE) },
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
      if (body.classId !== undefined) update.class_id = body.classId;
      if (body.subjectId !== undefined) update.subject_id = body.subjectId ?? null;
      if (body.isActive !== undefined) update.is_active = body.isActive;
      if (body.thumbnail !== undefined) update.thumbnail = body.thumbnail;
      if (body.programId !== undefined || body.program_id !== undefined) {
        update.program_id = (body.programId ?? body.program_id ?? null) as string | null;
      }

      const updated = await VideoLesson.findOneAndUpdate({ id: params.lesson_id }, { $set: update }, { new: true });
      if (!updated) return reply.status(404).send({ detail: "Video lesson not found" });
      return serializeDoc(updated.toObject() as Record<string, unknown>);
    }
  );

  // Delete video — platform admin only
  app.delete(
    "/api/videoLessons/:lesson_id",
    { preHandler: requirePermission(PERMISSIONS.VIDEO_MANAGE) },
    async (request, reply) => {
      const params = z.object({ lesson_id: z.string() }).parse(request.params);
      const deleted = await VideoLesson.findOneAndDelete({ id: params.lesson_id });
      if (!deleted) return reply.status(404).send({ detail: "Video lesson not found" });
      return { message: "Video lesson deleted" };
    }
  );

  // List videos assigned to a program
  app.get("/api/programs/:program_id/videos", { preHandler: requireAuth }, async (request, reply) => {
    const params = z.object({ program_id: z.string() }).parse(request.params);
    const rows = await VideoLesson.find({ program_id: params.program_id }).sort({ created: -1 }).lean();
    return listResponse(rows.map((r) => serializeDoc(r as Record<string, unknown>)));
  });

  // Assign a video to a program — CATEGORY_MANAGE so program managers can assign
  app.post(
    "/api/programs/:program_id/videos",
    { preHandler: requirePermission(PERMISSIONS.CATEGORY_MANAGE) },
    async (request, reply) => {
      const params = z.object({ program_id: z.string() }).parse(request.params);
      const body = z.object({ videoId: z.string() }).parse(request.body);

      const program = await Category.findOne({ id: params.program_id });
      if (!program) return reply.status(404).send({ detail: "Program not found" });

      const updated = await VideoLesson.findOneAndUpdate(
        { id: body.videoId },
        { $set: { program_id: params.program_id } },
        { new: true }
      );
      if (!updated) return reply.status(404).send({ detail: "Video lesson not found" });

      return { message: "Video assigned to program", videoId: body.videoId, programId: params.program_id };
    }
  );

  // Unassign a video from a program (sets program_id back to null)
  app.delete(
    "/api/programs/:program_id/videos/:video_id",
    { preHandler: requirePermission(PERMISSIONS.CATEGORY_MANAGE) },
    async (request, reply) => {
      const params = z.object({ program_id: z.string(), video_id: z.string() }).parse(request.params);

      const updated = await VideoLesson.findOneAndUpdate(
        { id: params.video_id, program_id: params.program_id },
        { $set: { program_id: null } },
        { new: true }
      );
      if (!updated) return reply.status(404).send({ detail: "Video not found in this program" });

      return { message: "Video unassigned from program" };
    }
  );

  // Track view
  app.post("/api/videoLessons/:lesson_id/view", { preHandler: requireAuth }, async (request) => {
    const params = z.object({ lesson_id: z.string() }).parse(request.params);
    await VideoLesson.findOneAndUpdate({ id: params.lesson_id }, { $inc: { view_count: 1 } });
    return { message: "View recorded" };
  });

  // Track download
  app.post("/api/videoLessons/:lesson_id/download", { preHandler: requireAuth }, async (request) => {
    const params = z.object({ lesson_id: z.string() }).parse(request.params);
    await VideoLesson.findOneAndUpdate({ id: params.lesson_id }, { $inc: { download_count: 1 } });
    return { message: "Download recorded" };
  });
};
