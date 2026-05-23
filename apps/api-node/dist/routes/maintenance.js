import { z } from "zod";
import { MaintenanceMode, SystemSettings, UserPreferences } from "../models/index.js";
import { listResponse, serializeDoc } from "../lib/serialize.js";
import { requireAuth, requirePermission } from "../plugins/auth.js";
import { PERMISSIONS } from "../lib/permissions.js";
export const registerMaintenanceRoutes = async (app) => {
    /** Public — used by web app before login */
    app.get("/api/maintenanceMode", async () => {
        const current = await MaintenanceMode.findOne().sort({ created: -1 });
        if (current) {
            return listResponse([serializeDoc(current.toObject())]);
        }
        const created = await MaintenanceMode.create({ is_enabled: false, message: "" });
        return listResponse([serializeDoc(created.toObject())]);
    });
    app.patch("/api/maintenanceMode/:mm_id", { preHandler: requirePermission(PERMISSIONS.SETTINGS_MANAGE) }, async (request, reply) => {
        const params = z.object({ mm_id: z.string() }).parse(request.params);
        const body = z
            .object({
            is_enabled: z.boolean().optional(),
            isEnabled: z.boolean().optional(),
            message: z.string().optional(),
            end_time: z.string().optional(),
            endTime: z.string().optional()
        })
            .parse(request.body);
        const updated = await MaintenanceMode.findOneAndUpdate({ id: params.mm_id }, {
            $set: {
                is_enabled: body.is_enabled ?? body.isEnabled,
                message: body.message,
                end_time: body.end_time ?? body.endTime
            }
        }, { new: true });
        if (!updated)
            return reply.status(404).send({ detail: "Maintenance mode not found" });
        return serializeDoc(updated.toObject());
    });
    app.get("/api/systemSettings", { preHandler: requireAuth }, async () => {
        const current = await SystemSettings.findOne().sort({ created: -1 });
        if (current)
            return listResponse([serializeDoc(current.toObject())]);
        const created = await SystemSettings.create({ app_name: "i-icon academy" });
        return listResponse([serializeDoc(created.toObject())]);
    });
    app.patch("/api/systemSettings/:ss_id", { preHandler: requirePermission(PERMISSIONS.SETTINGS_MANAGE) }, async (request, reply) => {
        const params = z.object({ ss_id: z.string() }).parse(request.params);
        const body = z.record(z.string(), z.unknown()).parse(request.body);
        const updated = await SystemSettings.findOneAndUpdate({ id: params.ss_id }, { $set: body }, { new: true });
        if (!updated)
            return reply.status(404).send({ detail: "System settings not found" });
        return serializeDoc(updated.toObject());
    });
    app.post("/api/systemSettings/:ss_id/test-email", { preHandler: requirePermission(PERMISSIONS.SETTINGS_MANAGE) }, async () => ({ ok: true, message: "Email configuration accepted (stub)" }));
    app.post("/api/systemSettings/:ss_id/test-whatsapp", { preHandler: requirePermission(PERMISSIONS.SETTINGS_MANAGE) }, async () => ({ ok: true, message: "WhatsApp configuration accepted (stub)" }));
    app.get("/api/userPreferences", { preHandler: requireAuth }, async (request, reply) => {
        const userId = request.authUser?.sub;
        const pref = await UserPreferences.findOne({ user_id: userId });
        if (pref)
            return listResponse([serializeDoc(pref.toObject())]);
        if (!userId)
            return reply.status(401).send({ detail: "Unauthorized" });
        const created = await UserPreferences.create({ user_id: userId });
        return listResponse([serializeDoc(created.toObject())]);
    });
    app.patch("/api/userPreferences/:pref_id", { preHandler: requireAuth }, async (request, reply) => {
        const params = z.object({ pref_id: z.string() }).parse(request.params);
        const body = z.record(z.string(), z.unknown()).parse(request.body);
        const updated = await UserPreferences.findOneAndUpdate({ id: params.pref_id }, { $set: body }, { new: true });
        if (!updated)
            return reply.status(404).send({ detail: "Preferences not found" });
        return serializeDoc(updated.toObject());
    });
};
