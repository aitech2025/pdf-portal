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
import { sendWhatsAppText, getConnectionStatus } from "./baileysWhatsApp.js";

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
// WhatsApp delivery — Baileys (WhatsApp Web)
// ---------------------------------------------------------------------------

const sendWhatsApp = async (to: string, message: string): Promise<{ ok: boolean; error?: string }> => {
  const { status } = getConnectionStatus();
  console.log(`[WHATSAPP] Attempting send to="${to}" status=${status}`);
  if (status !== "connected") {
    console.log(`[WHATSAPP] Not connected (status: ${status}). To: ${to}`);
    return { ok: false, error: `WhatsApp not connected (status: ${status})` };
  }
  const result = await sendWhatsAppText(to, message);
  if (!result.ok) {
    console.error(`[WHATSAPP] Delivery failed to "${to}": ${result.error}`);
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
  const { status, phone } = getConnectionStatus();
  const connected = status === "connected";
  return {
    configured: connected,
    provider: "baileys",
    source: "service",
    details: connected
      ? `Baileys connected — company number: ${phone ?? "unknown"}`
      : `Baileys not connected (status: ${status}). Scan QR in Settings → WhatsApp.`
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
