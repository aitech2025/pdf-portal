import { AuditLog } from "../models/index.js";
export const writeAudit = async (input) => {
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
export const auditUnauthorized = async (userId, action, details, request) => {
    await writeAudit({
        user_id: userId ?? "anonymous",
        action: "unauthorized_access",
        action_details: `${action}: ${details}`,
        request
    });
};
