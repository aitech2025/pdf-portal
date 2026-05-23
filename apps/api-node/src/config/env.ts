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
  DEFAULT_ADMIN_PASSWORD: z.string().default("admin123"),
  DEFAULT_ADMIN_NAME: z.string().default("Platform Admin"),
  UPLOAD_DIR: z.string().default("/data/uploads")
});

export const env = EnvSchema.parse(process.env);
