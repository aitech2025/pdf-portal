import { User } from "../models/index.js";
import { auditUnauthorized } from "../lib/audit.js";
import { hasPermission } from "../lib/permissions.js";
export const requireAuth = async (request, reply) => {
    try {
        const payload = await request.jwtVerify();
        request.authUser = payload;
    }
    catch {
        reply.status(401).send({ detail: "Could not validate credentials" });
    }
};
export const getCurrentUser = async (request, reply) => {
    if (!request.authUser?.sub) {
        reply.status(401).send({ detail: "Could not validate credentials" });
        return null;
    }
    const user = await User.findOne({ id: request.authUser.sub });
    if (!user) {
        reply.status(401).send({ detail: "Could not validate credentials" });
        return null;
    }
    return user;
};
export const requireRole = (roles) => {
    return async (request, reply) => {
        await requireAuth(request, reply);
        if (reply.sent)
            return;
        if (!request.authUser || !roles.includes(request.authUser.role)) {
            await auditUnauthorized(request.authUser?.sub ?? null, "role_check", `required: ${roles.join(",")}`, request);
            reply.status(403).send({ detail: "Insufficient permissions" });
        }
    };
};
export const requirePermission = (permission) => {
    return async (request, reply) => {
        await requireAuth(request, reply);
        if (reply.sent)
            return;
        const role = request.authUser?.role ?? "";
        if (!hasPermission(role, permission)) {
            await auditUnauthorized(request.authUser?.sub ?? null, "permission_check", permission, request);
            reply.status(403).send({ detail: "Insufficient permissions" });
        }
    };
};
