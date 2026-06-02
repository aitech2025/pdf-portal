import type { FastifyInstance } from "fastify";
import { requirePermission } from "../plugins/auth.js";
import { PERMISSIONS } from "../lib/permissions.js";
import {
  getConnectionStatus,
  connectWhatsApp,
  disconnectWhatsApp,
} from "../services/baileysWhatsApp.js";

export const registerWhatsAppRoutes = async (app: FastifyInstance): Promise<void> => {
  // GET /api/whatsapp/status — returns connection state, QR data URL, linked phone
  app.get(
    "/api/whatsapp/status",
    { preHandler: requirePermission(PERMISSIONS.SETTINGS_MANAGE) },
    async () => {
      return getConnectionStatus();
    }
  );

  // POST /api/whatsapp/connect — initiate connection (shows QR)
  app.post(
    "/api/whatsapp/connect",
    { preHandler: requirePermission(PERMISSIONS.SETTINGS_MANAGE) },
    async () => {
      await connectWhatsApp();
      return { message: "Connecting…", status: getConnectionStatus().status };
    }
  );

  // POST /api/whatsapp/disconnect — log out and clear saved session
  app.post(
    "/api/whatsapp/disconnect",
    { preHandler: requirePermission(PERMISSIONS.SETTINGS_MANAGE) },
    async () => {
      await disconnectWhatsApp();
      return { message: "Disconnected" };
    }
  );
};
