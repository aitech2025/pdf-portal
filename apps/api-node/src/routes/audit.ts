import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AuditLog, DownloadLog } from "../models/index.js";
import { isPlatformRole } from "../lib/access.js";
import { listResponse, serializeDoc } from "../lib/serialize.js";
import { requireAuth, requirePermission } from "../plugins/auth.js";
import { PERMISSIONS } from "../lib/permissions.js";

export const registerAuditRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/api/auditLogs", { preHandler: requirePermission(PERMISSIONS.AUDIT_VIEW) }, async (request) => {
    const query = z.object({ user_id: z.string().optional(), action: z.string().optional() }).parse(request.query);
    const filter: Record<string, unknown> = {};
    if (query.user_id) filter.user_id = query.user_id;
    if (query.action) filter.action = query.action;
    const rows = await AuditLog.find(filter).sort({ timestamp: -1 }).limit(200).lean();
    return listResponse(rows.map((r) => serializeDoc(r as Record<string, unknown>)));
  });

  app.get("/api/downloadLogs", { preHandler: requireAuth }, async (request) => {
    const query = z
      .object({
        school_id: z.string().optional(),
        schoolId: z.string().optional(),
        user_id: z.string().optional(),
        page: z.coerce.number().default(1),
        per_page: z.coerce.number().default(50)
      })
      .parse(request.query);
    const filter: Record<string, unknown> = {};
    const role = request.authUser?.role ?? "";
    if (isPlatformRole(role)) {
      const sid = query.school_id ?? query.schoolId;
      if (sid) filter.school_id = sid;
      if (query.user_id) filter.user_id = query.user_id;
    } else {
      filter.school_id = request.authUser?.school_id ?? "";
    }
    const skip = (query.page - 1) * query.per_page;
    const [rows, total] = await Promise.all([
      DownloadLog.find(filter).sort({ downloaded_at: -1 }).skip(skip).limit(query.per_page).lean(),
      DownloadLog.countDocuments(filter)
    ]);
    return listResponse(rows.map((r) => serializeDoc(r as Record<string, unknown>)), total);
  });
};
