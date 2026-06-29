import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AuditLog, DownloadLog } from "../models/index.js";
import { isPlatformRole } from "../lib/access.js";
import { listResponse, serializeDoc } from "../lib/serialize.js";
import { requireAuth, requirePermission } from "../plugins/auth.js";
import { PERMISSIONS } from "../lib/permissions.js";

const csvEscape = (val: unknown): string => {
  if (val === null || val === undefined) return "";
  const s = val instanceof Date ? val.toISOString() : String(val);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export const registerAuditRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/api/auditLogs", { preHandler: requirePermission(PERMISSIONS.AUDIT_VIEW) }, async (request) => {
    const query = z
      .object({
        user_id: z.string().optional(),
        action: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        page: z.coerce.number().default(1),
        per_page: z.coerce.number().default(100),
        count: z.string().optional()
      })
      .parse(request.query);
    const filter: Record<string, unknown> = {};
    if (query.user_id) filter.user_id = query.user_id;
    if (query.action) filter.action = query.action;
    if (query.from || query.to) {
      const ts: Record<string, Date> = {};
      if (query.from) ts.$gte = new Date(query.from);
      if (query.to) ts.$lte = new Date(query.to);
      filter.timestamp = ts;
    }
    const skip = (query.page - 1) * query.per_page;
    const wantCount = query.count !== "false";
    const [rows, total] = await Promise.all([
      AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(query.per_page).lean(),
      wantCount ? AuditLog.countDocuments(filter) : Promise.resolve(undefined)
    ]);
    return listResponse(rows.map((r) => serializeDoc(r as Record<string, unknown>)), total ?? rows.length);
  });

  app.get("/api/auditLogs/export", { preHandler: requirePermission(PERMISSIONS.AUDIT_VIEW) }, async (request, reply) => {
    const query = z
      .object({
        user_id: z.string().optional(),
        action: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        limit: z.coerce.number().default(10000)
      })
      .parse(request.query);
    const filter: Record<string, unknown> = {};
    if (query.user_id) filter.user_id = query.user_id;
    if (query.action) filter.action = query.action;
    if (query.from || query.to) {
      const ts: Record<string, Date> = {};
      if (query.from) ts.$gte = new Date(query.from);
      if (query.to) ts.$lte = new Date(query.to);
      filter.timestamp = ts;
    }
    const rows = await AuditLog.find(filter).sort({ timestamp: -1 }).limit(Math.min(query.limit, 50000)).lean();
    const header = [
      "timestamp",
      "user_id",
      "action",
      "action_details",
      "resource_type",
      "resource_id",
      "ip_address",
      "user_agent"
    ];
    const lines = [header.join(",")];
    for (const r of rows) {
      const row = r as Record<string, unknown>;
      lines.push(header.map((h) => csvEscape(row[h])).join(","));
    }
    const csv = lines.join("\n");
    const filename = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    reply.header("Content-Type", "text/csv; charset=utf-8");
    reply.header("Content-Disposition", `attachment; filename="${filename}"`);
    reply.header("Cache-Control", "no-store");
    return reply.send(csv);
  });

  app.get("/api/downloadLogs", { preHandler: requireAuth }, async (request) => {
    const query = z
      .object({
        school_id: z.string().optional(),
        schoolId: z.string().optional(),
        user_id: z.string().optional(),
        page: z.coerce.number().default(1),
        per_page: z.coerce.number().default(50),
        count: z.string().optional()
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
    // count=false lets callers that only need the page (e.g. dashboards) skip the
    // expensive full-collection count over a large logs table.
    const wantCount = query.count !== "false";
    const [rows, total] = await Promise.all([
      DownloadLog.find(filter).sort({ downloaded_at: -1 }).skip(skip).limit(query.per_page).lean(),
      wantCount ? DownloadLog.countDocuments(filter) : Promise.resolve(undefined)
    ]);
    return listResponse(rows.map((r) => serializeDoc(r as Record<string, unknown>)), total ?? rows.length);
  });
};
