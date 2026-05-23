import type { FastifyReply, FastifyRequest } from "fastify";
import { SchoolCategoryAccess, User } from "../models/index.js";
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
  categoryId: string | null | undefined
): Promise<boolean> => {
  if (!categoryId) return isPlatformRole(role);
  if (isPlatformRole(role)) return true;
  if (!schoolId) {
    const user = await User.findOne({ id: userId }).lean();
    schoolId = user?.school_id;
  }
  if (!schoolId) return false;
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
