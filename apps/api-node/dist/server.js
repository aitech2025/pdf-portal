import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { closeMongo, connectMongo, ensureDefaults } from "./db/mongo.js";
const start = async () => {
    const app = buildApp();
    try {
        await connectMongo();
        await ensureDefaults();
        await app.listen({ port: env.PORT, host: env.HOST });
    }
    catch (error) {
        app.log.error(error);
        process.exit(1);
    }
    const shutdown = async () => {
        await app.close();
        await closeMongo();
        process.exit(0);
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
};
start();
