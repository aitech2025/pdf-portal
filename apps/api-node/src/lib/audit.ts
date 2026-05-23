import type { FastifyRequest } from "fastify";
import { AuditLog } from "../models/index.js";

type AuditInput = {
  user_id: string;
  action: string;
  action_details?: string;
  resource_type?: string;
  resource_id?: string;
  request?: FastifyRequest;
};

export const writeAudit = async (input: AuditInput): Promise<void> => {
  await AuditLog.create({
    user_id: input.user_id,
    action: input.action,
    action_details: input.action_details,
    resource_type: input.resource_type,
    resource_id: input.resource_id,
    ip_address: input.request?.ip,
    user_agent: input.request?.headers["user-agent"] ?? undefined,
    timestamp: new Date()
  });
};

export const auditUnauthorized = async (
  userId: string | null,
  action: string,
  details: string,
  request: FastifyRequest
): Promise<void> => {
  await writeAudit({
    user_id: userId ?? "anonymous",
    action: "unauthorized_access",
    action_details: `${action}: ${details}`,
    request
  });
};
