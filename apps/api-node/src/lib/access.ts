import type { FastifyReply, FastifyRequest } from "fastify";
import { SchoolCategoryAccess, SchoolClassAccess, SchoolSubjectAccess, User } from "../models/index.js";
import { getCurrentUser } from "../plugins/auth.js";
import { isSuperAdmin, PLATFORM_ROLES } from "./permissions.js";

export const isPlatformRole = (role: string): boolean =>
  (PLATFORM_ROLES as readonly string[]).includes(role);

export const requireCurrentUser = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = await getCurrentUser(request, reply);
  return user;
};

export const canAccessCategory = async (
  userId: string,
  role: string,
  schoolId: string | null | undefined,
  categoryId: string | null | undefined,
  classId?: string | null,
  subjectId?: string | null
): Promise<boolean> => {
  if (!categoryId) return isPlatformRole(role);
  if (isPlatformRole(role)) return true;
  if (!schoolId) {
    const user = await User.findOne({ id: userId }).lean();
    schoolId = user?.school_id;
  }
  if (!schoolId) return false;

  // Subject-level tagged PDFs require a matching SchoolSubjectAccess grant
  if (classId && subjectId) {
    const grant = await SchoolSubjectAccess.findOne({
      school_id: schoolId,
      program_id: categoryId,
      class_id: classId,
      subject_id: subjectId
    }).lean();
    return !!grant;
  }

  // Class-level tagged PDFs (legacy sub_category path) check SchoolClassAccess
  if (classId) {
    const grant = await SchoolClassAccess.findOne({
      school_id: schoolId,
      program_id: categoryId,
      class_id: classId
    }).lean();
    if (grant) return true;
  }

  // Fall back to program-level access
  const grant = await SchoolCategoryAccess.findOne({ school_id: schoolId, category_id: categoryId }).lean();
  return !!grant;
};

export const canAccessSchool = (
  role: string,
  userSchoolId: string | null | undefined,
  targetSchoolId: string
): boolean => {
  if (isSuperAdmin(role) || role === "moderator" || role === "platform_viewer") return true;
  if (["school", "school_admin", "school_viewer", "teacher"].includes(role)) {
    return userSchoolId === targetSchoolId;
  }
  return false;
};
