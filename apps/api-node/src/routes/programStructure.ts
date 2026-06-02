import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Category, ClassMaster, SubjectMaster, ProgramClassMap, ProgramClassSubjectMap, VideoLesson } from "../models/index.js";
import { listResponse, serializeDoc } from "../lib/serialize.js";
import { requireAuth, requirePermission } from "../plugins/auth.js";
import { PERMISSIONS } from "../lib/permissions.js";

export const registerProgramStructureRoutes = async (app: FastifyInstance): Promise<void> => {
  // Full structure: program → classes → subjects per class
  app.get("/api/programs/:program_id/structure", { preHandler: requireAuth }, async (request, reply) => {
    const params = z.object({ program_id: z.string() }).parse(request.params);
    const program = await Category.findOne({ id: params.program_id });
    if (!program) return reply.status(404).send({ detail: "Program not found" });

    // Video programs derive their class/subject hierarchy from the videos assigned to them
    if (program.program_type === "video") {
      const videos = await VideoLesson.find({ program_id: params.program_id }).select("class_id subject_id").lean();

      // Build unique class → subjects map
      const classToSubjects = new Map<string, Set<string>>();
      for (const v of videos) {
        if (!v.class_id) continue;
        if (!classToSubjects.has(v.class_id)) classToSubjects.set(v.class_id, new Set());
        if (v.subject_id) classToSubjects.get(v.class_id)!.add(v.subject_id);
      }

      const allClassIds = [...classToSubjects.keys()];
      const allSubjectIds = [...new Set([...classToSubjects.values()].flatMap((s) => [...s]))];

      const [classes, subjects] = await Promise.all([
        ClassMaster.find({ id: { $in: allClassIds } }).sort({ display_order: 1, class_name: 1 }).lean(),
        SubjectMaster.find({ id: { $in: allSubjectIds } }).sort({ display_order: 1, subject_name: 1 }).lean(),
      ]);

      const classById = new Map(classes.map((c) => [c.id, c]));
      const subjectById = new Map(subjects.map((s) => [s.id, s]));

      const structure = allClassIds.map((classId) => {
        const cls = classById.get(classId);
        if (!cls) return null;
        const subjectIds = [...(classToSubjects.get(classId) ?? [])];
        return {
          classId: cls.id,
          className: cls.class_name,
          classCode: cls.class_code,
          isActive: cls.is_active,
          displayOrder: cls.display_order,
          subjects: subjectIds.map((sid) => {
            const s = subjectById.get(sid);
            if (!s) return null;
            return { subjectId: s.id, subjectName: s.subject_name, subjectCode: s.subject_code, isActive: s.is_active };
          }).filter(Boolean),
        };
      }).filter(Boolean);

      return { programId: params.program_id, classes: structure };
    }

    const classMaps = await ProgramClassMap.find({ program_id: params.program_id }).lean();
    const classIds = classMaps.map((m) => m.class_id);
    const classes = await ClassMaster.find({ id: { $in: classIds } }).sort({ display_order: 1, class_name: 1 }).lean();
    const classById = new Map(classes.map((c) => [c.id, c]));

    const subjectMaps = await ProgramClassSubjectMap.find({ program_id: params.program_id }).lean();
    const subjectIds = [...new Set(subjectMaps.map((m) => m.subject_id))];
    const subjects = await SubjectMaster.find({ id: { $in: subjectIds } }).sort({ display_order: 1, subject_name: 1 }).lean();
    const subjectById = new Map(subjects.map((s) => [s.id, s]));

    const subjectsByClassId = new Map<string, typeof subjects>();
    for (const sm of subjectMaps) {
      const subj = subjectById.get(sm.subject_id);
      if (!subj) continue;
      const arr = subjectsByClassId.get(sm.class_id) ?? [];
      arr.push(subj);
      subjectsByClassId.set(sm.class_id, arr);
    }

    const structure = classMaps.map((cm) => {
      const cls = classById.get(cm.class_id);
      if (!cls) return null;
      return {
        mapId: cm.id,
        classId: cls.id,
        className: cls.class_name,
        classCode: cls.class_code,
        isActive: cls.is_active,
        displayOrder: cls.display_order,
        subjects: (subjectsByClassId.get(cls.id) ?? []).map((s) => ({
          subjectId: s.id,
          subjectName: s.subject_name,
          subjectCode: s.subject_code,
          isActive: s.is_active
        }))
      };
    }).filter(Boolean);

    return { programId: params.program_id, classes: structure };
  });

  // List classes assigned to a program
  app.get("/api/programs/:program_id/classes", { preHandler: requireAuth }, async (request, reply) => {
    const params = z.object({ program_id: z.string() }).parse(request.params);
    const maps = await ProgramClassMap.find({ program_id: params.program_id }).lean();
    const classIds = maps.map((m) => m.class_id);
    const classes = await ClassMaster.find({ id: { $in: classIds } }).sort({ display_order: 1, class_name: 1 }).lean();
    const classById = new Map(classes.map((c) => [c.id, c]));
    const items = maps.map((m) => {
      const cls = classById.get(m.class_id);
      if (!cls) return null;
      return { mapId: m.id, classId: cls.id, className: cls.class_name, classCode: cls.class_code, isActive: cls.is_active, displayOrder: cls.display_order };
    }).filter(Boolean);
    return { items };
  });

  // Assign classes to a program (bulk upsert)
  app.post(
    "/api/programs/:program_id/classes",
    { preHandler: requirePermission(PERMISSIONS.CATEGORY_MANAGE) },
    async (request, reply) => {
      const params = z.object({ program_id: z.string() }).parse(request.params);
      const body = z.object({ classIds: z.array(z.string()) }).parse(request.body);

      const program = await Category.findOne({ id: params.program_id });
      if (!program) return reply.status(404).send({ detail: "Program not found" });

      const added: string[] = [];
      for (const class_id of body.classIds) {
        const result = await ProgramClassMap.updateOne(
          { program_id: params.program_id, class_id },
          { $setOnInsert: { program_id: params.program_id, class_id } },
          { upsert: true }
        );
        if (result.upsertedCount > 0) added.push(class_id);
      }
      return { programId: params.program_id, added };
    }
  );

  // Remove a class from a program (also removes its subject mappings)
  app.delete(
    "/api/programs/:program_id/classes/:class_id",
    { preHandler: requirePermission(PERMISSIONS.CATEGORY_MANAGE) },
    async (request, reply) => {
      const params = z.object({ program_id: z.string(), class_id: z.string() }).parse(request.params);
      await ProgramClassSubjectMap.deleteMany({ program_id: params.program_id, class_id: params.class_id });
      const deleted = await ProgramClassMap.findOneAndDelete({ program_id: params.program_id, class_id: params.class_id });
      if (!deleted) return reply.status(404).send({ detail: "Class assignment not found" });
      return { message: "Class removed from program" };
    }
  );

  // List subjects for a class within a program
  app.get("/api/programs/:program_id/classes/:class_id/subjects", { preHandler: requireAuth }, async (request, reply) => {
    const params = z.object({ program_id: z.string(), class_id: z.string() }).parse(request.params);
    const maps = await ProgramClassSubjectMap.find({ program_id: params.program_id, class_id: params.class_id }).lean();
    const subjectIds = maps.map((m) => m.subject_id);
    const subjects = await SubjectMaster.find({ id: { $in: subjectIds } }).sort({ display_order: 1, subject_name: 1 }).lean();
    const subjectById = new Map(subjects.map((s) => [s.id, s]));
    const items = maps.map((m) => {
      const s = subjectById.get(m.subject_id);
      if (!s) return null;
      return { mapId: m.id, subjectId: s.id, subjectName: s.subject_name, subjectCode: s.subject_code, isActive: s.is_active };
    }).filter(Boolean);
    return { items };
  });

  // Assign subjects to a class in a program (bulk upsert)
  app.post(
    "/api/programs/:program_id/classes/:class_id/subjects",
    { preHandler: requirePermission(PERMISSIONS.CATEGORY_MANAGE) },
    async (request, reply) => {
      const params = z.object({ program_id: z.string(), class_id: z.string() }).parse(request.params);
      const body = z.object({ subjectIds: z.array(z.string()) }).parse(request.body);

      const classMap = await ProgramClassMap.findOne({ program_id: params.program_id, class_id: params.class_id });
      if (!classMap) return reply.status(404).send({ detail: "Class is not assigned to this program" });

      const added: string[] = [];
      for (const subject_id of body.subjectIds) {
        const result = await ProgramClassSubjectMap.updateOne(
          { program_id: params.program_id, class_id: params.class_id, subject_id },
          { $setOnInsert: { program_id: params.program_id, class_id: params.class_id, subject_id } },
          { upsert: true }
        );
        if (result.upsertedCount > 0) added.push(subject_id);
      }
      return { programId: params.program_id, classId: params.class_id, added };
    }
  );

  // Remove a subject from a class in a program
  app.delete(
    "/api/programs/:program_id/classes/:class_id/subjects/:subject_id",
    { preHandler: requirePermission(PERMISSIONS.CATEGORY_MANAGE) },
    async (request, reply) => {
      const params = z.object({ program_id: z.string(), class_id: z.string(), subject_id: z.string() }).parse(request.params);
      const deleted = await ProgramClassSubjectMap.findOneAndDelete({
        program_id: params.program_id,
        class_id: params.class_id,
        subject_id: params.subject_id
      });
      if (!deleted) return reply.status(404).send({ detail: "Subject assignment not found" });
      return { message: "Subject removed from class" };
    }
  );

  // Replace all class assignments for a program (used by the save panel)
  app.put(
    "/api/programs/:program_id/structure",
    { preHandler: requirePermission(PERMISSIONS.CATEGORY_MANAGE) },
    async (request, reply) => {
      const params = z.object({ program_id: z.string() }).parse(request.params);
      const body = z
        .object({
          classes: z.array(
            z.object({
              classId: z.string(),
              subjectIds: z.array(z.string()).default([])
            })
          )
        })
        .parse(request.body);

      const program = await Category.findOne({ id: params.program_id });
      if (!program) return reply.status(404).send({ detail: "Program not found" });

      // Clear existing
      await ProgramClassSubjectMap.deleteMany({ program_id: params.program_id });
      await ProgramClassMap.deleteMany({ program_id: params.program_id });

      // Re-insert
      for (const { classId, subjectIds } of body.classes) {
        await ProgramClassMap.create({ program_id: params.program_id, class_id: classId });
        for (const subject_id of subjectIds) {
          await ProgramClassSubjectMap.create({ program_id: params.program_id, class_id: classId, subject_id });
        }
      }

      return { message: "Program structure updated", classCount: body.classes.length };
    }
  );
};
