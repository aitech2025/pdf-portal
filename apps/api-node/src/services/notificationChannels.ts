/**
 * notificationChannels.ts
 *
 * Centralised notification fan-out for the platform.
 *
 *   1. Always persists a Notification document in MongoDB (the in-app feed).
 *   2. Always pushes a real-time WebSocket event so the recipient's bell icon
 *      updates immediately.
 *   3. Optionally also delivers via email (Nodemailer / SMTP) and/or
 *      WhatsApp (Meta Cloud API, WAHA, or a custom HTTP gateway).
 *
 * Configuration precedence (highest to lowest):
 *
 *   1. `SystemSettings` document in MongoDB — edited live from the admin
 *      Settings page. This is the source of truth in production.
 *   2. Environment variables — useful for bootstrap / Docker deploys.
 *   3. Built-in defaults — mock mode that logs to stdout for development.
 *
 * Delivery never throws: failures are recorded on the persisted Notification
 * record (`status: "failed"`, `error_message: "..."`) so the admin UI can show
 * a retryable list.
 */

import nodemailer, { type Transporter } from "nodemailer";
import { Notification, SystemSettings } from "../models/index.js";
import { pushNotification } from "./realtime.js";
import { serializeDoc } from "../lib/serialize.js";
import { sendWhatsAppText, sendWhatsAppTemplate, getCloudApiStatus } from "./whatsappCloudApi.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationChannel = "email" | "whatsapp" | "in_app";

export interface RecipientLike {
  id: string;
  email?: string | null;
  mobile_number?: string | null;
  name?: string | null;
}

export interface SendNotificationInput {
  recipient: RecipientLike;
  /** Channel hint — kept for backward compatibility. New code should prefer `channels`. */
  method?: NotificationChannel;
  /** Explicit list of external channels to deliver on. In-app is always added. */
  channels?: NotificationChannel[];
  type: string;
  subject: string;
  message: string;
  /** Optional HTML body. Plain text is auto-derived from `message` when omitted. */
  html?: string;
}

export interface NotificationResult {
  status: "sent" | "pending" | "failed" | "partial";
  results: Record<NotificationChannel, "sent" | "pending" | "failed" | "skipped">;
  error_message?: string;
  id?: string;
}

// ---------------------------------------------------------------------------
// Settings loaders — DB first, env fallback
// ---------------------------------------------------------------------------

interface EmailConfig {
  configured: boolean;
  source: "db" | "env" | "none";
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  fromEmail?: string;
  fromName?: string;
  secure?: boolean;
}


const loadEmailConfig = async (): Promise<EmailConfig> => {
  // 1. DB takes precedence
  try {
    const row = await SystemSettings.findOne().sort({ created: -1 }).lean();
    if (row) {
      const useBrevo = row.active_email_provider === "brevo";
      const host = useBrevo ? row.smtp2_host : row.smtp_host;
      if (host) {
        const port = (useBrevo ? row.smtp2_port : row.smtp_port) ?? 587;
        return {
          configured: true,
          source: "db",
          host,
          port,
          username: (useBrevo ? row.smtp2_username : row.smtp_username) ?? undefined,
          password: (useBrevo ? row.smtp2_password : row.smtp_password) ?? undefined,
          fromEmail: (useBrevo ? row.email2_from_address : row.email_from_address) ?? undefined,
          fromName: (useBrevo ? row.email2_from_name : row.email_from_name) ?? undefined,
          secure: (useBrevo ? row.enable_ssl2 : row.enable_ssl) === true || port === 465
        };
      }
    }
  } catch (err) {
    // DB hiccup — fall through to env
    console.warn("[notify] SystemSettings read failed for email:", (err as Error).message);
  }

  // 2. Env fallback
  const host = process.env.SMTP_HOST;
  if (host) {
    const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
    return {
      configured: true,
      source: "env",
      host,
      port,
      username: process.env.SMTP_USERNAME ?? process.env.SMTP_USER,
      password: process.env.SMTP_PASSWORD ?? process.env.SMTP_PASS,
      fromEmail: process.env.SMTP_FROM_EMAIL ?? process.env.SMTP_FROM,
      fromName: process.env.SMTP_FROM_NAME,
      secure: port === 465
    };
  }

  // 3. None
  return { configured: false, source: "none" };
};


// ---------------------------------------------------------------------------
// Email delivery (Nodemailer)
// ---------------------------------------------------------------------------

const buildTransport = (cfg: EmailConfig): Transporter | null => {
  if (!cfg.host) return null;
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port ?? 587,
    secure: cfg.secure ?? false,
    auth: cfg.username && cfg.password ? { user: cfg.username, pass: cfg.password } : undefined
  });
};

// Use Resend HTTP API (port 443) instead of SMTP when the host is smtp.resend.com.
// DigitalOcean blocks outbound SMTP ports 465/587, but HTTPS is always open.
const sendViaResendApi = async (
  cfg: EmailConfig,
  to: string,
  subject: string,
  text: string,
  html?: string
): Promise<{ ok: boolean; error?: string }> => {
  const from = cfg.fromEmail ?? "noreply@iiconacademy.in";
  const fromName = cfg.fromName ?? "i-icon Academy";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cfg.password}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: `${fromName} <${from}>`,
        to: [to],
        subject,
        text,
        html: html ?? `<pre style="font-family:sans-serif;white-space:pre-wrap">${escapeHtml(text)}</pre>`
      })
    });
    const data = await res.json() as Record<string, unknown>;
    if (!res.ok) {
      const msg = (data.message as string) ?? (data.name as string) ?? `HTTP ${res.status}`;
      console.error("[EMAIL] Resend API error:", msg, data);
      return { ok: false, error: msg };
    }
    console.log(`[EMAIL] Resend API sent id=${data.id} to=${to}`);
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[EMAIL] Resend API fetch failed:", msg);
    return { ok: false, error: msg };
  }
};

const sendEmail = async (
  to: string,
  subject: string,
  text: string,
  html?: string
): Promise<{ ok: boolean; error?: string }> => {
  const cfg = await loadEmailConfig();

  if (!cfg.configured) {
    console.log(`[EMAIL MOCK] To: ${to} | Subject: ${subject}`);
    return { ok: true };
  }

  // Resend's SMTP ports are blocked by DigitalOcean — use their HTTP API directly.
  if (cfg.host === "smtp.resend.com" && cfg.password) {
    return sendViaResendApi(cfg, to, subject, text, html);
  }

  const transport = buildTransport(cfg);
  if (!transport) {
    console.log(`[EMAIL MOCK] To: ${to} | Subject: ${subject}`);
    return { ok: true };
  }
  try {
    const from = cfg.fromEmail ?? "noreply@iiconacademy.in";
    const fromName = cfg.fromName ?? "i-icon Academy";
    await transport.sendMail({
      from: `"${fromName}" <${from}>`,
      to,
      subject,
      text,
      html: html ?? `<pre style="font-family:sans-serif;white-space:pre-wrap">${escapeHtml(text)}</pre>`
    });
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[EMAIL] Send failed:", msg);
    return { ok: false, error: msg };
  }
};

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

// ---------------------------------------------------------------------------
// WhatsApp delivery — Meta Cloud API
// ---------------------------------------------------------------------------

import { env } from "../config/env.js";

/**
 * For credential_delivery notifications: use a pre-approved template so the
 * message reaches users who have never messaged the business number before.
 * For all other notification types: use free-form text (requires an open
 * 24-hour service window, i.e. user messaged first within the last 24h).
 */
const sendWhatsApp = async (
  to: string,
  message: string,
  notificationType?: string
): Promise<{ ok: boolean; error?: string }> => {
  console.log(`[WHATSAPP] Attempting send to="${to}" type=${notificationType ?? "text"}`);

  if (notificationType === "credential_delivery") {
    // Template: school_account  ({{1}} school name, {{2}} user ID, {{3}} password/access)
    const schoolMatch = message.match(/school "([^"]+)"/i) ?? message.match(/school \*([^*]+)\*/i);
    const userIdMatch = message.match(/User ID:\s*(\S+)/i);
    const passwordMatch = message.match(/Password:\s*(\S+)/i);
    const schoolName = schoolMatch?.[1] ?? "your school";
    const userId = userIdMatch?.[1] ?? "";
    const password = passwordMatch?.[1] ?? "";

    if (userId && password) {
      const result = await sendWhatsAppTemplate(to, env.WHATSAPP_CREDENTIAL_TEMPLATE, [schoolName, userId, password]);
      if (!result.ok) console.error(`[WHATSAPP] Credential template failed to "${to}": ${result.error}`);
      return result;
    }
    // Fall through to text if params could not be parsed
  }

  if (notificationType === "new_content") {
    // Template: new_content_notification  ({{1}} content title, {{2}} program name)
    const titleMatch = message.match(/PDF "([^"]+)"/i);
    const programMatch = message.match(/to the (.+?) program/i);
    const pdfTitle = titleMatch?.[1] ?? "New Content";
    const programName = programMatch?.[1] ?? "your program";

    const result = await sendWhatsAppTemplate(to, env.WHATSAPP_NEW_CONTENT_TEMPLATE, [pdfTitle, programName]);
    if (!result.ok) console.error(`[WHATSAPP] Content template failed to "${to}": ${result.error}`);
    return result;
  }

  if (notificationType === "program_assigned") {
    // Template: new_content_notification  ({{1}} program name, {{2}} school name)
    const programMatch = message.match(/Program:\s*(.+)/i);
    const schoolMatch = message.match(/School:\s*(.+)/i);
    const programName = programMatch?.[1]?.trim() ?? "New Program";
    const schoolName = schoolMatch?.[1]?.trim() ?? "i-icon Academy";
    const result = await sendWhatsAppTemplate(to, env.WHATSAPP_NEW_CONTENT_TEMPLATE, [programName, schoolName]);
    if (!result.ok) console.error(`[WHATSAPP] Program assigned template failed to "${to}": ${result.error}`);
    return result;
  }

  if (notificationType === "bulk_announcement") {
    // Template: broadcast_announcement  ({{1}} = full message body composed by admin)
    // Free-text messages require a 24-hour service window opened by the recipient,
    // which school admins will not have. A single-variable template is used instead.
    const result = await sendWhatsAppTemplate(to, env.WHATSAPP_BROADCAST_TEMPLATE, [message]);
    if (!result.ok) console.error(`[WHATSAPP] Broadcast template failed to "${to}": ${result.error}`);
    return result;
  }

  const result = await sendWhatsAppText(to, message);
  if (!result.ok) {
    console.error(`[WHATSAPP] Text delivery failed to "${to}": ${result.error}`);
  }
  return result;
};

// ---------------------------------------------------------------------------
// Configuration validators — used by the test buttons in the admin UI
// ---------------------------------------------------------------------------

export const validateEmailConfiguration = async (): Promise<{
  configured: boolean;
  provider: string;
  source: string;
  details: string;
}> => {
  const cfg = await loadEmailConfig();
  if (!cfg.configured) {
    return {
      configured: false,
      provider: "none",
      source: cfg.source,
      details: "SMTP not configured — running in mock mode. Set host/port in Settings → Email."
    };
  }
  return {
    configured: true,
    provider: "smtp",
    source: cfg.source,
    details: `SMTP: ${cfg.host}:${cfg.port}${cfg.secure ? " (SSL)" : ""} • from ${cfg.fromName ?? ""} <${cfg.fromEmail ?? ""}>`
  };
};

export const validateWhatsAppConfiguration = async (): Promise<{
  configured: boolean;
  provider: string;
  source: string;
  details: string;
}> => {
  const status = await getCloudApiStatus();
  return {
    configured: status.configured,
    provider: "whatsapp_cloud_api",
    source: status.source,
    details: status.configured
      ? `WhatsApp Cloud API configured — Phone Number ID: ${status.phoneNumberId}`
      : "WhatsApp Cloud API not configured. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in environment or System Settings."
  };
};

// ---------------------------------------------------------------------------
// Fan-out — the single helper every route should use
// ---------------------------------------------------------------------------

/**
 * Persist an in-app Notification record + push it over WebSocket, then
 * optionally also deliver via email / WhatsApp. Always resolves; delivery
 * problems are recorded on the persisted notification.
 */
export const createAndSendNotification = async (
  input: SendNotificationInput
): Promise<NotificationResult> => {
  const { recipient, type, subject, message, html } = input;

  // Decide which external channels to fire.
  // - `channels` (preferred): explicit list.
  // - `method`  (legacy):     a single hint.
  // - else:                   in-app only.
  const requested: NotificationChannel[] = (input.channels ?? (input.method ? [input.method] : []))
    .filter((c): c is NotificationChannel => c === "email" || c === "whatsapp" || c === "in_app")
    .filter((v, i, a) => a.indexOf(v) === i);

  const wantEmail = requested.includes("email");
  const wantWhatsApp = requested.includes("whatsapp");

  const results: Record<NotificationChannel, "sent" | "pending" | "failed" | "skipped"> = {
    in_app: "skipped",
    email: "skipped",
    whatsapp: "skipped"
  };
  const errors: string[] = [];

  // 1. External: email
  if (wantEmail) {
    if (!recipient.email) {
      results.email = "failed";
      errors.push("email: recipient has no email address");
    } else {
      const r = await sendEmail(recipient.email, subject, message, html);
      results.email = r.ok ? "sent" : "failed";
      if (r.error) errors.push(`email: ${r.error}`);
    }
  }

  // 2. External: WhatsApp
  if (wantWhatsApp) {
    if (!recipient.mobile_number) {
      results.whatsapp = "failed";
      errors.push("whatsapp: recipient has no mobile number");
    } else {
      const r = await sendWhatsApp(recipient.mobile_number, message, type);
      results.whatsapp = r.ok ? "sent" : "failed";
      if (r.error) errors.push(`whatsapp: ${r.error}`);
    }
  }

  // 3. In-app — ALWAYS persist a Notification record (the bell-icon feed).
  // The external `notification_method` column captures the *primary* delivery
  // intent so the admin UI can filter by channel.
  const primaryMethod: NotificationChannel = wantEmail
    ? "email"
    : wantWhatsApp
      ? "whatsapp"
      : "in_app";

  // Roll up overall status for the persisted record + return value.
  const externalCount = (wantEmail ? 1 : 0) + (wantWhatsApp ? 1 : 0);
  let overall: "sent" | "pending" | "failed" | "partial" = "sent";
  if (externalCount === 0) {
    overall = "sent"; // in-app only, always sent
  } else {
    const sent = (wantEmail && results.email === "sent" ? 1 : 0) + (wantWhatsApp && results.whatsapp === "sent" ? 1 : 0);
    if (sent === externalCount) overall = "sent";
    else if (sent === 0) overall = "failed";
    else overall = "partial";
  }

  try {
    const notif = await Notification.create({
      recipient_id: recipient.id,
      type,
      subject,
      message,
      notification_method: primaryMethod,
      status: overall === "partial" ? "sent" : overall,
      read: false,
      error_message: errors.length ? errors.join(" | ") : undefined
    });
    results.in_app = "sent";

    // Real-time bell update
    pushNotification(recipient.id, serializeDoc(notif.toObject()));

    return {
      status: overall,
      results,
      error_message: errors.length ? errors.join(" | ") : undefined,
      id: notif.id
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[NOTIFICATION] DB persist failed:", msg);
    results.in_app = "failed";
    return { status: "failed", results, error_message: msg };
  }
};
