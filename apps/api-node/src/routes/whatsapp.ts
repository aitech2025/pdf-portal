import type { FastifyInstance } from "fastify";
import { requirePermission } from "../plugins/auth.js";
import { PERMISSIONS } from "../lib/permissions.js";
import { getCloudApiStatus } from "../services/whatsappCloudApi.js";

export const registerWhatsAppRoutes = async (app: FastifyInstance): Promise<void> => {
  // GET /api/whatsapp/status — returns Cloud API configuration state
  app.get(
    "/api/whatsapp/status",
    { preHandler: requirePermission(PERMISSIONS.SETTINGS_MANAGE) },
    async () => {
      const status = await getCloudApiStatus();
      return {
        provider: "whatsapp_cloud_api",
        ...status
      };
    }
  );
};
