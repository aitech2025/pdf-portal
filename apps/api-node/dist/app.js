import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import websocket from "@fastify/websocket";
import { env } from "./config/env.js";
import { registerRoutes } from "./routes/index.js";
import { registerRealtimeRoutes } from "./services/realtime.js";
import { registerMaintenanceGuard } from "./plugins/maintenance.js";
export const buildApp = () => {
    const app = Fastify({ logger: true });
    app.register(cors, {
        origin: true,
        credentials: true
    });
    app.register(fastifyJwt, { secret: env.SECRET_KEY });
    registerMaintenanceGuard(app);
    app.register(multipart, {
        limits: { fileSize: 50 * 1024 * 1024 }
    });
    app.register(websocket);
    app.get("/health", async () => ({ status: "ok" }));
    registerRealtimeRoutes(app);
    app.register(async (instance) => {
        await registerRoutes(instance);
    });
    return app;
};
