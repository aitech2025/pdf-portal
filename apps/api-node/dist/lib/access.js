import { SchoolCategoryAccess, User } from "../models/index.js";
import { getCurrentUser } from "../plugins/auth.js";
import { isSuperAdmin, PLATFORM_ROLES } from "./permissions.js";
export const isPlatformRole = (role) => PLATFORM_ROLES.includes(role);
export const requireCurrentUser = async (request, reply) => {
    const user = await getCurrentUser(request, reply);
    return user;
};
export const canAccessCategory = async (userId, role, schoolId, categoryId) => {
    if (!categoryId)
        return isPlatformRole(role);
    if (isPlatformRole(role))
        return true;
    if (!schoolId) {
        const user = await User.findOne({ id: userId }).lean();
        schoolId = user?.school_id;
    }
    if (!schoolId)
        return false;
    const grant = await SchoolCategoryAccess.findOne({ school_id: schoolId, category_id: categoryId }).lean();
    return !!grant;
};
export const canAccessSchool = (role, userSchoolId, targetSchoolId) => {
    if (isSuperAdmin(role) || role === "moderator" || role === "platform_viewer")
        return true;
    if (["school", "school_admin", "school_viewer", "teacher"].includes(role)) {
        return userSchoolId === targetSchoolId;
    }
    return false;
};
