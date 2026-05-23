import type { FastifyReply, FastifyRequest } from "fastify";
import { User } from "../models/index.js";
import type { AuthUserPayload } from "../lib/auth.js";
import { auditUnauthorized } from "../lib/audit.js";
import { hasPermission, type Permission } from "../lib/permissions.js";

export const requireAuth = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const payload = await request.jwtVerify<AuthUserPayload>();
    request.authUser = payload;
  } catch {
    reply.status(401).send({ detail: "Could not validate credentials" });
  }
};

export const getCurrentUser = async (request: FastifyRequest, reply: FastifyReply) => {
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

export const requireRole = (roles: string[]) => {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    await requireAuth(request, reply);
    if (reply.sent) return;
    if (!request.authUser || !roles.includes(request.authUser.role)) {
      await auditUnauthorized(
        request.authUser?.sub ?? null,
        "role_check",
        `required: ${roles.join(",")}`,
        request
      );
      reply.status(403).send({ detail: "Insufficient permissions" });
    }
  };
};

export const requirePermission = (permission: Permission) => {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    await requireAuth(request, reply);
    if (reply.sent) return;
    const role = request.authUser?.role ?? "";
    if (!hasPermission(role, permission)) {
      await auditUnauthorized(request.authUser?.sub ?? null, "permission_check", permission, request);
      reply.status(403).send({ detail: "Insufficient permissions" });
    }
  };
};
