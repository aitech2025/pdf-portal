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

interface WhatsAppConfig {
  configured: boolean;
  source: "db" | "env" | "none";
  enabled: boolean;
  provider: "cloud_api" | "waha" | "custom" | "none";
  // Meta Cloud API
  phoneNumberId?: string;
  accessToken?: string;
  apiVersion?: string;
  templateName?: string;
  templateLanguage?: string;
  // WAHA / custom HTTP gateway
  apiUrl?: string;
  apiKey?: string;
  session?: string;
  fromNumber?: string;
}

const loadEmailConfig = async (): Promise<EmailConfig> => {
  // 1. DB takes precedence
  try {
    const row = await SystemSettings.findOne().sort({ created: -1 }).lean();
    if (row && row.smtp_host) {
      const port = row.smtp_port ?? 587;
      return {
        configured: true,
        source: "db",
        host: row.smtp_host,
        port,
        username: row.smtp_username ?? undefined,
        password: row.smtp_password ?? undefined,
        fromEmail: row.email_from_address ?? undefined,
        fromName: row.email_from_name ?? undefined,
        secure: row.enable_ssl === true || port === 465
      };
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

const loadWhatsAppConfig = async (): Promise<WhatsAppConfig> => {
  // 1. DB
  try {
    const row = await SystemSettings.findOne().sort({ created: -1 }).lean();
    const wa = (row?.integrations as Record<string, unknown> | undefined)?.whatsapp as
      | Record<string, unknown>
      | undefined;
    if (wa && (wa.enabled === true || wa.enabled === "true")) {
      const provider = (wa.provider as string) || "custom";
      return {
        configured: Boolean(wa.accessToken || wa.apiKey || wa.apiUrl),
        source: "db",
        enabled: true,
        provider: provider as WhatsAppConfig["provider"],
        phoneNumberId: (wa.phoneNumberId as string) || undefined,
        accessToken: (wa.accessToken as string) || undefined,
        apiVersion: (wa.apiVersion as string) || "v22.0",
        templateName: (wa.templateName as string) || undefined,
        templateLanguage: (wa.templateLanguage as string) || "en_US",
        apiUrl: (wa.apiUrl as string) || undefined,
        apiKey: (wa.apiKey as string) || undefined,
        session: (wa.session as string) || "default",
        fromNumber: (wa.fromNumber as string) || undefined
      };
    }
  } catch (err) {
    console.warn("[notify] SystemSettings read failed for whatsapp:", (err as Error).message);
  }

  // 2. Env fallback (custom gateway only — Cloud API config is too rich for env)
  const apiUrl = process.env.WHATSAPP_API_URL;
  if (apiUrl) {
    return {
      configured: true,
      source: "env",
      enabled: true,
      provider: "custom",
      apiUrl,
      apiKey: process.env.WHATSAPP_API_KEY ?? undefined,
      fromNumber: process.env.WHATSAPP_FROM_NUMBER ?? undefined
    };
  }

  return { configured: false, source: "none", enabled: false, provider: "none" };
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

const sendEmail = async (
  to: string,
  subject: string,
  text: string,
  html?: string
): Promise<{ ok: boolean; error?: string }> => {
  const cfg = await loadEmailConfig();
  const transport = buildTransport(cfg);
  if (!transport) {
    console.log(`[EMAIL MOCK] To: ${to} | Subject: ${subject}`);
    return { ok: true };
  }
  try {
    const from = cfg.fromEmail ?? "noreply@iiconacademy.com";
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
// WhatsApp delivery — Meta Cloud API + WAHA + custom HTTP gateway
// ---------------------------------------------------------------------------

/** Strip everything except digits and a leading '+' — Meta wants E.164 without the '+'. */
const normaliseMsisdn = (raw: string): string => raw.replace(/[^\d]/g, "");

const sendWhatsAppCloudApi = async (
  cfg: WhatsAppConfig,
  to: string,
  message: string
): Promise<{ ok: boolean; error?: string }> => {
  if (!cfg.phoneNumberId || !cfg.accessToken) {
    return { ok: false, error: "Cloud API requires phoneNumberId and accessToken" };
  }
  const version = cfg.apiVersion ?? "v22.0";
  const url = `https://graph.facebook.com/${version}/${cfg.phoneNumberId}/messages`;

  /*
   * Outside the 24-hour service window Meta only allows pre-approved template
   * messages. Use a template when one is configured; otherwise fall back to
   * plain text (works in the open service window — fine for tests).
   */
  const body = cfg.templateName
    ? {
        messaging_product: "whatsapp",
        to: normaliseMsisdn(to),
        type: "template",
        template: {
          name: cfg.templateName,
          language: { code: cfg.templateLanguage ?? "en_US" },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: message.slice(0, 1024) }]
            }
          ]
        }
      }
    : {
        messaging_product: "whatsapp",
        to: normaliseMsisdn(to),
        type: "text",
        text: { body: message.slice(0, 4096), preview_url: false }
      };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { ok: false, error: `Meta Cloud API ${res.status}: ${txt.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
};

const sendWhatsAppWaha = async (
  cfg: WhatsAppConfig,
  to: string,
  message: string
): Promise<{ ok: boolean; error?: string }> => {
  if (!cfg.apiUrl) return { ok: false, error: "WAHA apiUrl is not set" };
  const url = `${cfg.apiUrl.replace(/\/$/, "")}/api/sendText`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cfg.apiKey) headers["Authorization"] = `Bearer ${cfg.apiKey}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        session: cfg.session ?? "default",
        chatId: `${normaliseMsisdn(to)}@c.us`,
        text: message
      })
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { ok: false, error: `WAHA ${res.status}: ${txt.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
};

const sendWhatsAppCustom = async (
  cfg: WhatsAppConfig,
  to: string,
  message: string
): Promise<{ ok: boolean; error?: string }> => {
  if (!cfg.apiUrl) return { ok: false, error: "Custom gateway apiUrl is not set" };
  try {
    const res = await fetch(cfg.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {})
      },
      body: JSON.stringify({ to, from: cfg.fromNumber, message })
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { ok: false, error: `Gateway ${res.status}: ${txt.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
};

const sendWhatsApp = async (to: string, message: string): Promise<{ ok: boolean; error?: string }> => {
  const cfg = await loadWhatsAppConfig();
  if (!cfg.enabled) {
    console.log(`[WHATSAPP MOCK] (disabled) To: ${to} | Message: ${message.slice(0, 80)}...`);
    return { ok: true };
  }
  if (!cfg.configured) {
    console.log(`[WHATSAPP MOCK] (unconfigured) To: ${to} | Message: ${message.slice(0, 80)}...`);
    return { ok: true };
  }
  switch (cfg.provider) {
    case "cloud_api":
      return sendWhatsAppCloudApi(cfg, to, message);
    case "waha":
      return sendWhatsAppWaha(cfg, to, message);
    case "custom":
      return sendWhatsAppCustom(cfg, to, message);
    default:
      return { ok: false, error: `Unknown provider: ${cfg.provider}` };
  }
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
  const cfg = await loadWhatsAppConfig();
  if (!cfg.enabled) {
    return {
      configured: false,
      provider: cfg.provider,
      source: cfg.source,
      details: "WhatsApp integration is disabled in Settings → WhatsApp."
    };
  }
  if (!cfg.configured) {
    return {
      configured: false,
      provider: cfg.provider,
      source: cfg.source,
      details: "WhatsApp enabled but credentials missing."
    };
  }
  if (cfg.provider === "cloud_api") {
    return {
      configured: true,
      provider: "cloud_api",
      source: cfg.source,
      details: `Meta Cloud API ${cfg.apiVersion} • phone ID ${cfg.phoneNumberId}${cfg.templateName ? ` • template "${cfg.templateName}"` : ""}`
    };
  }
  return {
    configured: true,
    provider: cfg.provider,
    source: cfg.source,
    details: `${cfg.provider}: ${cfg.apiUrl}`
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
      const r = await sendWhatsApp(recipient.mobile_number, message);
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
