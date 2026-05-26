import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { MaintenanceMode } from "../models/index.js";
import { isSuperAdmin } from "../lib/permissions.js";

const PUBLIC_PATHS = [
  "/health",
  "/api/health",
  "/api/ready",
  "/api/auth/login",
  "/api/auth/refresh",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/maintenanceMode",
  "/api/onboardingRequests"
];

export const registerMaintenanceGuard = (app: FastifyInstance): void => {
  app.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    const path = request.url.split("?")[0];
    if (PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) return;
    if (path.startsWith("/api/notifications/ws")) return;

    const mode = await MaintenanceMode.findOne().sort({ created: -1 }).lean();
    if (!mode?.is_enabled) return;

    try {
      const payload = await request.jwtVerify<{ role: string }>();
      if (payload.role && isSuperAdmin(payload.role)) return;
    } catch {
      // not authenticated — blocked during maintenance
    }

    return reply.status(503).send({
      detail: "Platform is under maintenance",
      message: mode.message ?? "Maintenance in progress"
    });
  });
};
