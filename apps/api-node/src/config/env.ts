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
  APP_BASE_URL: z.string().default("http://localhost"),
  // WhatsApp via Gupshup (BSP). Replaces the direct Meta Cloud API integration.
  // API key: Gupshup dashboard -> Dashboard -> API Key
  GUPSHUP_API_KEY: z.string().optional(),
  // The Gupshup app name, sent as `src.name` on every request
  GUPSHUP_APP_NAME: z.string().optional(),
  // The migrated WhatsApp number in E.164 digits, no leading "+" (e.g. 919876543210)
  GUPSHUP_SOURCE_NUMBER: z.string().optional(),
  // App UUID — required to resolve template names to the UUIDs Gupshup sends by
  GUPSHUP_APP_ID: z.string().optional(),
  // Pre-approved template name for credential delivery (school onboarding)
  WHATSAPP_CREDENTIAL_TEMPLATE: z.string().default("school_account"),
  // Pre-approved template name for new content upload notifications
  WHATSAPP_NEW_CONTENT_TEMPLATE: z.string().default("new_content_notification"),
  // Pre-approved template name for admin broadcast messages
  WHATSAPP_BROADCAST_TEMPLATE: z.string().default("broadcast_announcement"),
  // Pre-approved template for student marks broadcasts: student_marks_v3
  // Template parameters: {{1}}=student_name, {{2}}=class, {{3}}=program_name,
  //                      {{4}}=subject_results, {{5}}=total
  WHATSAPP_MARKS_TEMPLATE: z.string().default("student_marks_v3")
});

export const env = EnvSchema.parse(process.env);
