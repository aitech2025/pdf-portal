import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { MaintenanceMode, SystemSettings, UserPreferences } from "../models/index.js";
import { listResponse, serializeDoc } from "../lib/serialize.js";
import { requireAuth, requirePermission } from "../plugins/auth.js";
import { PERMISSIONS } from "../lib/permissions.js";
import {
  createAndSendNotification,
  validateEmailConfiguration,
  validateWhatsAppConfiguration
} from "../services/notificationChannels.js";

const mapSystemSettingsUpdate = (body: Record<string, unknown>) => {
  const update: Record<string, unknown> = {};
  const fieldMap: Record<string, string> = {
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
    securitySettings: "security_settings"
  };

  for (const [key, raw] of Object.entries(body)) {
    update[fieldMap[key] ?? key] = raw;
  }

  return update;
};

export const registerMaintenanceRoutes = async (app: FastifyInstance): Promise<void> => {
  /** Public — used by web app before login */
  app.get("/api/maintenanceMode", async () => {
    const current = await MaintenanceMode.findOne().sort({ created: -1 });
    if (current) {
      return listResponse([serializeDoc(current.toObject() as Record<string, unknown>)]);
    }
    const created = await MaintenanceMode.create({ is_enabled: false, message: "" });
    return listResponse([serializeDoc(created.toObject() as Record<string, unknown>)]);
  });

  app.patch(
    "/api/maintenanceMode/:mm_id",
    { preHandler: requirePermission(PERMISSIONS.SETTINGS_MANAGE) },
    async (request, reply) => {
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
      const updated = await MaintenanceMode.findOneAndUpdate(
        { id: params.mm_id },
        {
          $set: {
            is_enabled: body.is_enabled ?? body.isEnabled,
            message: body.message,
            end_time: body.end_time ?? body.endTime
          }
        },
        { new: true }
      );
      if (!updated) return reply.status(404).send({ detail: "Maintenance mode not found" });
      return serializeDoc(updated.toObject() as Record<string, unknown>);
    }
  );

  app.get("/api/systemSettings", { preHandler: requireAuth }, async () => {
    const current = await SystemSettings.findOne().sort({ created: -1 });
    if (current) return listResponse([serializeDoc(current.toObject() as Record<string, unknown>)]);
    const created = await SystemSettings.create({ app_name: "i-icon academy" });
    return listResponse([serializeDoc(created.toObject() as Record<string, unknown>)]);
  });

  app.patch(
    "/api/systemSettings/:ss_id",
    { preHandler: requirePermission(PERMISSIONS.SETTINGS_MANAGE) },
    async (request, reply) => {
      const params = z.object({ ss_id: z.string() }).parse(request.params);
      const body = z.record(z.string(), z.unknown()).parse(request.body);
      const updated = await SystemSettings.findOneAndUpdate(
        { id: params.ss_id },
        { $set: mapSystemSettingsUpdate(body) },
        { new: true }
      );
      if (!updated) return reply.status(404).send({ detail: "System settings not found" });
      return serializeDoc(updated.toObject() as Record<string, unknown>);
    }
  );

  app.post(
    "/api/systemSettings/:ss_id/test-email",
    { preHandler: requirePermission(PERMISSIONS.SETTINGS_MANAGE) },
    async (request) => {
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
    }
  );

  app.post(
    "/api/systemSettings/:ss_id/test-whatsapp",
    { preHandler: requirePermission(PERMISSIONS.SETTINGS_MANAGE) },
    async (request) => {
      const body = z.object({ to: z.string().min(6) }).parse(request.body);
      const validation = await validateWhatsAppConfiguration();
      const notif = await createAndSendNotification({
        recipient: { id: request.authUser?.sub ?? "system", mobile_number: body.to },
        method: "whatsapp",
        type: "configuration_test",
        subject: "i-icon Academy WhatsApp test",
        message: "This is a test WhatsApp message from your i-icon Academy notification configuration."
      });
      return {
        ok: notif.status === "sent",
        status: notif.status,
        validation,
        message: notif.status === "sent" ? "Test WhatsApp sent" : "WhatsApp configuration saved but delivery is pending/failed"
      };
    }
  );

  app.get("/api/userPreferences", { preHandler: requireAuth }, async (request, reply) => {
    const userId = request.authUser?.sub;
    const pref = await UserPreferences.findOne({ user_id: userId });
    if (pref) return listResponse([serializeDoc(pref.toObject() as Record<string, unknown>)]);
    if (!userId) return reply.status(401).send({ detail: "Unauthorized" });
    const created = await UserPreferences.create({ user_id: userId });
    return listResponse([serializeDoc(created.toObject() as Record<string, unknown>)]);
  });

  app.patch("/api/userPreferences/:pref_id", { preHandler: requireAuth }, async (request, reply) => {
    const params = z.object({ pref_id: z.string() }).parse(request.params);
    const body = z.record(z.string(), z.unknown()).parse(request.body);
    const updated = await UserPreferences.findOneAndUpdate({ id: params.pref_id }, { $set: body }, { new: true });
    if (!updated) return reply.status(404).send({ detail: "Preferences not found" });
    return serializeDoc(updated.toObject() as Record<string, unknown>);
  });
};
