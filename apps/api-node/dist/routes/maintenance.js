import { z } from "zod";
import { MaintenanceMode, SystemSettings, UserPreferences } from "../models/index.js";
import { listResponse, serializeDoc } from "../lib/serialize.js";
import { requireAuth, requirePermission } from "../plugins/auth.js";
import { PERMISSIONS } from "../lib/permissions.js";
import { createAndSendNotification, validateEmailConfiguration, validateWhatsAppConfiguration } from "../services/notificationChannels.js";
import { sendWhatsAppTemplate } from "../services/whatsappCloudApi.js";
import { env } from "../config/env.js";
// Fields that must never appear in a $set — they are either immutable identifiers
// or Mongoose-managed timestamps.
const SKIP_FROM_SET = new Set(["id", "_id", "created", "updated"]);
const mapSystemSettingsUpdate = (body) => {
    const update = {};
    const fieldMap = {
        appName: "app_name",
        appDescription: "app_description",
        supportEmail: "support_email",
        supportPhone: "support_phone",
        supportWebsite: "support_website",
        dateFormat: "date_format",
        timeFormat: "time_format",
        maintenanceMode: "maintenance_mode",
        maintenanceMessage: "maintenance_message",
        emailProvider: "email_provider",
        smtpHost: "smtp_host",
        smtpPort: "smtp_port",
        smtpUsername: "smtp_username",
        smtpPassword: "smtp_password",
        emailFromAddress: "email_from_address",
        emailFromName: "email_from_name",
        enableTLS: "enable_tls",
        enableSSL: "enable_ssl",
        // Brevo SMTP
        smtp2Host: "smtp2_host",
        smtp2Port: "smtp2_port",
        smtp2Username: "smtp2_username",
        smtp2Password: "smtp2_password",
        email2FromAddress: "email2_from_address",
        email2FromName: "email2_from_name",
        enableSSL2: "enable_ssl2",
        enableSsl2: "enable_ssl2",
        enableSsl: "enable_ssl",
        enableTls: "enable_tls",
        activeEmailProvider: "active_email_provider",
        featureFlags: "feature_flags",
        securitySettings: "security_settings",
        whatsappEnabled: "whatsapp_enabled",
        whatsappPhoneNumberId: "whatsapp_phone_number_id",
        whatsappAccessToken: "whatsapp_access_token",
        whatsappApiVersion: "whatsapp_api_version"
    };
    for (const [key, raw] of Object.entries(body)) {
        if (SKIP_FROM_SET.has(key))
            continue;
        update[fieldMap[key] ?? key] = raw;
    }
    return update;
};
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
        const mapped = mapSystemSettingsUpdate(body);
        console.log(`[systemSettings] PATCH id=${params.ss_id} updating fields: ${Object.keys(mapped).join(", ")}`);
        const updated = await SystemSettings.findOneAndUpdate({ id: params.ss_id }, { $set: mapped }, { new: true, runValidators: false });
        if (!updated) {
            console.error(`[systemSettings] PATCH: no document found with id=${params.ss_id}`);
            // Fallback: try to find any document and update it (handles ID mismatch on first deploy)
            const fallback = await SystemSettings.findOneAndUpdate({}, { $set: mapped }, { new: true, sort: { created: -1 }, runValidators: false });
            if (!fallback)
                return reply.status(404).send({ detail: "System settings not found" });
            console.log(`[systemSettings] PATCH fallback: updated document id=${fallback.id}`);
            return serializeDoc(fallback.toObject());
        }
        console.log(`[systemSettings] PATCH success id=${updated.id}`);
        return serializeDoc(updated.toObject());
    });
    app.post("/api/systemSettings/:ss_id/test-email", { preHandler: requirePermission(PERMISSIONS.SETTINGS_MANAGE) }, async (request) => {
        const body = z.object({ to: z.string().email() }).parse(request.body);
        const validation = await validateEmailConfiguration();
        const notif = await createAndSendNotification({
            recipient: { id: request.authUser?.sub ?? "system", email: body.to },
            method: "email",
            type: "configuration_test",
            subject: "i-icon Academy test email",
            message: "This is a test email from your i-icon Academy notification configuration."
        });
        return {
            ok: notif.status === "sent",
            status: notif.status,
            validation,
            message: notif.status === "sent" ? "Test email sent" : "Email configuration saved but delivery is pending/failed"
        };
    });
    app.post("/api/systemSettings/:ss_id/test-whatsapp", { preHandler: requirePermission(PERMISSIONS.SETTINGS_MANAGE) }, async (request) => {
        const body = z.object({ to: z.string().min(6) }).parse(request.body);
        const validation = await validateWhatsAppConfiguration();
        // Send the school_account template with placeholder values so the test
        // works even without an open 24-hour service window on the recipient's number.
        const result = await sendWhatsAppTemplate(body.to, env.WHATSAPP_CREDENTIAL_TEMPLATE, ["Test School", "test@iiconacademy.in", "TestPass@123"]);
        return {
            ok: result.ok,
            status: result.ok ? "sent" : "failed",
            validation,
            message: result.ok
                ? "Test WhatsApp sent via template (school_account)"
                : `WhatsApp delivery failed: ${result.error ?? "unknown error"}`
        };
    });
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
