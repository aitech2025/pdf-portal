import type { FastifyInstance } from "fastify";
import { requirePermission } from "../plugins/auth.js";
import { PERMISSIONS } from "../lib/permissions.js";
import { getWhatsAppProviderStatus, invalidateTemplateCache } from "../services/gupshupWhatsApp.js";

export const registerWhatsAppRoutes = async (app: FastifyInstance): Promise<void> => {
  // GET /api/whatsapp/status — returns Gupshup configuration state
  app.get(
    "/api/whatsapp/status",
    { preHandler: requirePermission(PERMISSIONS.SETTINGS_MANAGE) },
    async () => {
      const status = await getWhatsAppProviderStatus();
      return {
        provider: "gupshup",
        ...status
      };
    }
  );

  // POST /api/whatsapp/templates/refresh — drop the cached template name -> UUID map.
  // Call this after approving a new template in the Gupshup dashboard so sends pick
  // it up without waiting for the 5-minute cache TTL.
  app.post(
    "/api/whatsapp/templates/refresh",
    { preHandler: requirePermission(PERMISSIONS.SETTINGS_MANAGE) },
    async () => {
      invalidateTemplateCache();
      return { ok: true, message: "Template cache cleared" };
    }
  );
};
