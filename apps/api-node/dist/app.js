import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import websocket from "@fastify/websocket";
import mongoose from "mongoose";
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
    app.get("/health", async () => ({ status: "ok", uptime: process.uptime() }));
    app.get("/api/health", async () => ({ status: "ok", uptime: process.uptime() }));
    app.get("/api/ready", async (_req, reply) => {
        // Mongo connection states: 0 disconnected, 1 connected, 2 connecting, 3 disconnecting
        const state = mongoose.connection.readyState;
        if (state !== 1) {
            return reply.status(503).send({ status: "not_ready", db: state });
        }
        try {
            await mongoose.connection.db?.admin().ping();
            return { status: "ready", db: "connected", uptime: process.uptime() };
        }
        catch (err) {
            return reply.status(503).send({ status: "not_ready", error: err.message });
        }
    });
    registerRealtimeRoutes(app);
    app.register(async (instance) => {
        await registerRoutes(instance);
    });
    return app;
};
