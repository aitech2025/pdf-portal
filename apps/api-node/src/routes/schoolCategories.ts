import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Category, ClassMaster, School, SchoolCategoryAccess, SchoolClassAccess, SchoolSubjectAccess, SubCategory, Subject, SubjectMaster, ProgramClassMap, ProgramClassSubjectMap, User } from "../models/index.js";
import { canAccessSchool } from "../lib/access.js";
import { auditUnauthorized, writeAudit } from "../lib/audit.js";
import { requireAuth, requirePermission } from "../plugins/auth.js";
import { PERMISSIONS } from "../lib/permissions.js";
import { createAndSendNotification } from "../services/notificationChannels.js";

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

      if (added.length > 0) {
        const [assignedCategories, schoolAdmins] = await Promise.all([
          Category.find({ id: { $in: added } }).lean(),
          User.find({ school_id: params.school_id, role: { $in: ["school_admin", "school"] }, is_active: true }).lean()
        ]);
        const adminsWithPhone = schoolAdmins.filter(a => a.mobile_number);
        if (adminsWithPhone.length > 0) {
          for (const cat of assignedCategories) {
            const programName = cat.category_name;
            for (const admin of adminsWithPhone) {
              createAndSendNotification({
                recipient: { id: admin.id, email: admin.email ?? undefined, mobile_number: admin.mobile_number ?? undefined, name: admin.name ?? undefined },
                channels: ["whatsapp"],
                type: "program_assigned",
                subject: `New program access: ${programName}`,
                message: `Program: ${programName}\nSchool: ${school.school_name}`
              }).catch(err => console.error(`[schoolCategories] WhatsApp notify failed for ${admin.id}:`, (err as Error).message));
            }
          }
        }
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

      // Cascade: remove all class and subject access records for this program
      await SchoolClassAccess.deleteMany({ school_id: params.school_id, program_id: params.category_id });
      await SchoolSubjectAccess.deleteMany({ school_id: params.school_id, program_id: params.category_id });

      return { message: "Category access removed" };
    }
  );

  // Class (SubCategory) access endpoints
  app.get("/api/schools/:school_id/classes", { preHandler: requireAuth }, async (request, reply) => {
    const params = z.object({ school_id: z.string() }).parse(request.params);
    const role = request.authUser?.role ?? "";
    const schoolId = request.authUser?.school_id ?? null;

    if (!canAccessSchool(role, schoolId, params.school_id)) {
      await auditUnauthorized(request.authUser?.sub ?? null, "school_classes", params.school_id, request);
      return reply.status(403).send({ detail: "Insufficient permissions" });
    }

    const grants = await SchoolClassAccess.find({ school_id: params.school_id }).lean();
    const classIds = grants.map((g) => g.class_id);

    // Try ClassMaster first (new model), fall back to SubCategory (legacy)
    const masterClasses = await ClassMaster.find({ id: { $in: classIds } }).lean();
    const masterClassMap = new Map(masterClasses.map((c) => [c.id, { name: c.class_name, isActive: c.is_active }]));
    const legacyClasses = await SubCategory.find({ id: { $in: classIds } }).lean();
    const legacyClassMap = new Map(legacyClasses.map((c) => [c.id, { name: c.sub_category_name, isActive: c.is_active }]));

    const items = grants
      .map((g) => {
        const master = masterClassMap.get(g.class_id) ?? legacyClassMap.get(g.class_id);
        if (!master) return null;
        return {
          id: g.id,
          programId: g.program_id,
          classId: g.class_id,
          className: master.name,
          isActive: master.isActive
        };
      })
      .filter(Boolean);

    return { items };
  });

  app.post(
    "/api/schools/:school_id/classes",
    { preHandler: requirePermission(PERMISSIONS.SCHOOL_MANAGE) },
    async (request, reply) => {
      const params = z.object({ school_id: z.string() }).parse(request.params);
      const body = z
        .object({
          assignments: z.array(z.object({ programId: z.string(), classId: z.string() })).optional(),
          class_ids: z.array(z.string()).optional(),
          classIds: z.array(z.string()).optional(),
          program_id: z.string().optional(),
          programId: z.string().optional()
        })
        .parse(request.body);

      const school = await School.findOne({ id: params.school_id });
      if (!school) return reply.status(404).send({ detail: "School not found" });

      const assignments = body.assignments ?? [];

      // Support simple classIds + programId form
      const simpleClassIds = body.class_ids ?? body.classIds ?? [];
      const simpleProgramId = body.programId ?? body.program_id;
      if (simpleClassIds.length && simpleProgramId) {
        for (const classId of simpleClassIds) {
          assignments.push({ programId: simpleProgramId, classId });
        }
      }

      const added: string[] = [];
      for (const { programId, classId } of assignments) {
        const result = await SchoolClassAccess.updateOne(
          { school_id: params.school_id, program_id: programId, class_id: classId },
          { $setOnInsert: { school_id: params.school_id, program_id: programId, class_id: classId } },
          { upsert: true }
        );
        if (result.upsertedCount > 0) added.push(classId);
      }

      return { school_id: params.school_id, added };
    }
  );

  app.delete(
    "/api/schools/:school_id/classes/:class_id",
    { preHandler: requirePermission(PERMISSIONS.SCHOOL_MANAGE) },
    async (request, reply) => {
      const params = z.object({ school_id: z.string(), class_id: z.string() }).parse(request.params);

      // deleteMany handles multiple records (same class under different programs)
      const classResult = await SchoolClassAccess.deleteMany({
        school_id: params.school_id,
        class_id: params.class_id
      });

      // Cascade: remove all subject access records for this class
      await SchoolSubjectAccess.deleteMany({
        school_id: params.school_id,
        class_id: params.class_id
      });

      return { message: "Class access removed", deletedCount: classResult.deletedCount };
    }
  );

  app.get("/api/schools/:school_id/subjects", { preHandler: requireAuth }, async (request, reply) => {
    const params = z.object({ school_id: z.string() }).parse(request.params);
    const role = request.authUser?.role ?? "";
    const schoolId = request.authUser?.school_id ?? null;

    if (!canAccessSchool(role, schoolId, params.school_id)) {
      return reply.status(403).send({ detail: "Insufficient permissions" });
    }

    const grants = await SchoolSubjectAccess.find({ school_id: params.school_id }).lean();
    const subjectIds = grants.map((g) => g.subject_id);

    // Try SubjectMaster first (new model), fall back to old Subject model
    const masterSubjects = await SubjectMaster.find({ id: { $in: subjectIds } }).lean();
    const masterSubjectMap = new Map(masterSubjects.map((s) => [s.id, { name: s.subject_name, code: s.subject_code, isActive: s.is_active }]));
    const legacySubjects = await Subject.find({ id: { $in: subjectIds } }).lean();
    const legacySubjectMap = new Map(legacySubjects.map((s) => [s.id, { name: s.subject_name, code: (s as any).subject_code, isActive: s.is_active }]));

    const items = grants
      .map((g) => {
        const subj = masterSubjectMap.get(g.subject_id) ?? legacySubjectMap.get(g.subject_id);
        if (!subj) return null;
        return {
          id: g.id,
          programId: g.program_id,
          classId: g.class_id,
          subjectId: g.subject_id,
          subjectName: subj.name,
          subjectCode: subj.code,
          isActive: subj.isActive
        };
      })
      .filter(Boolean);

    return { items };
  });

  app.post(
    "/api/schools/:school_id/subjects",
    { preHandler: requirePermission(PERMISSIONS.SCHOOL_MANAGE) },
    async (request, reply) => {
      const params = z.object({ school_id: z.string() }).parse(request.params);
      const body = z
        .object({
          assignments: z.array(z.object({
            programId: z.string(),
            classId: z.string(),
            subjectId: z.string()
          })).optional()
        })
        .parse(request.body);

      const school = await School.findOne({ id: params.school_id });
      if (!school) return reply.status(404).send({ detail: "School not found" });

      const assignments = body.assignments ?? [];
      const added: string[] = [];
      for (const { programId, classId, subjectId } of assignments) {
        const result = await SchoolSubjectAccess.updateOne(
          { school_id: params.school_id, program_id: programId, class_id: classId, subject_id: subjectId },
          { $setOnInsert: { school_id: params.school_id, program_id: programId, class_id: classId, subject_id: subjectId } },
          { upsert: true }
        );
        if (result.upsertedCount > 0) added.push(subjectId);
      }

      return { school_id: params.school_id, added };
    }
  );

  app.delete(
    "/api/schools/:school_id/subjects/:subject_id",
    { preHandler: requirePermission(PERMISSIONS.SCHOOL_MANAGE) },
    async (request, reply) => {
      const params = z.object({ school_id: z.string(), subject_id: z.string() }).parse(request.params);

      // deleteMany handles multiple records (same subject in different class/program combinations)
      const result = await SchoolSubjectAccess.deleteMany({
        school_id: params.school_id,
        subject_id: params.subject_id
      });

      return { message: "Subject access removed", deletedCount: result.deletedCount };
    }
  );
};
