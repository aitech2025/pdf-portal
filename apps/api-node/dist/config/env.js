import dotenv from "dotenv";
import { z } from "zod";
dotenv.config();
const EnvSchema = z.object({
    NODE_ENV: z.string().default("development"),
    HOST: z.string().default("0.0.0.0"),
    PORT: z.coerce.number().default(8000),
    MONGODB_URI: z.string().default("mongodb://mongo:27017/iiconacademy"),
    DB_NAME: z.string().default("iiconacademy"),
    SECRET_KEY: z.string().default("change-me-in-production"),
    ACCESS_TOKEN_EXPIRE_MINUTES: z.coerce.number().default(60),
    REFRESH_TOKEN_EXPIRE_DAYS: z.coerce.number().default(7),
    DEFAULT_ADMIN_EMAIL: z.string().default("admin@iiconacademy.com"),
    DEFAULT_ADMIN_PASSWORD: z.string().default("Admin@1234"),
    DEFAULT_ADMIN_NAME: z.string().default("Platform Admin"),
    /**
     * When `"true"`, the default admin password is force-reset to
     * DEFAULT_ADMIN_PASSWORD on every boot (and the account is unlocked).
     * Intended as a one-time rescue switch — flip back to `false` in production.
     */
    RESET_DEFAULT_ADMIN_PASSWORD: z
        .string()
        .default("false")
        .transform((v) => ["1", "true", "yes", "on"].includes(v.toLowerCase())),
    UPLOAD_DIR: z.string().default("/data/uploads"),
    /**
     * Public-facing URL of the web app. Used to build absolute links inside
     * outbound emails (password reset, onboarding credentials, etc.). Falls
     * back to http://localhost in development.
     */
    APP_BASE_URL: z.string().default("http://localhost")
});
export const env = EnvSchema.parse(process.env);
