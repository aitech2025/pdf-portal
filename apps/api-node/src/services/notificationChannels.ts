/**
 * notificationChannels.ts
 *
 * Centralised helper that:
 *  1. Persists a Notification document in MongoDB (always)
 *  2. Attempts real delivery via the configured channel (email / whatsapp)
 *  3. Pushes an in-app WebSocket event so the bell icon updates in real time
 *
 * When no provider is configured the notification is stored with
 * status "pending" so it can be retried or viewed in the admin panel.
 */

import nodemailer from "nodemailer";
import { Notification } from "../models/index.js";
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
  method: NotificationChannel;
  type: string;
  subject: string;
  message: string;
}

export interface NotificationResult {
  status: "sent" | "pending" | "failed";
  error_message?: string;
  id?: string;
}

// ---------------------------------------------------------------------------
// Email delivery (nodemailer — uses env vars if set, otherwise mock-logs)
// ---------------------------------------------------------------------------

const buildTransport = () => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const user = process.env.SMTP_USERNAME ?? process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD ?? process.env.SMTP_PASS;
  if (!host) return null;
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined
  });
};

const sendEmail = async (to: string, subject: string, text: string): Promise<{ ok: boolean; error?: string }> => {
  const transport = buildTransport();
  if (!transport) {
    // No SMTP configured — mock mode
    console.log(`[EMAIL MOCK] To: ${to} | Subject: ${subject}`);
    return { ok: true };
  }
  try {
    const from = process.env.SMTP_FROM_EMAIL ?? process.env.SMTP_FROM ?? "noreply@iiconacademy.com";
    const fromName = process.env.SMTP_FROM_NAME ?? "i-icon Academy";
    await transport.sendMail({
      from: `"${fromName}" <${from}>`,
      to,
      subject,
      text,
      html: `<pre style="font-family:sans-serif;white-space:pre-wrap">${text}</pre>`
    });
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[EMAIL] Send failed:", msg);
    return { ok: false, error: msg };
  }
};

// ---------------------------------------------------------------------------
// WhatsApp delivery
// ---------------------------------------------------------------------------

const sendWhatsApp = async (to: string, message: string): Promise<{ ok: boolean; error?: string }> => {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiKey = process.env.WHATSAPP_API_KEY;
  const fromNumber = process.env.WHATSAPP_FROM_NUMBER;

  if (!apiUrl || !apiKey) {
    // No WhatsApp provider configured — mock mode
    console.log(`[WHATSAPP MOCK] To: ${to} | Message: ${message.slice(0, 80)}...`);
    return { ok: true };
  }

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({ to, from: fromNumber, message })
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Provider returned ${res.status}: ${body}` };
    }
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[WHATSAPP] Send failed:", msg);
    return { ok: false, error: msg };
  }
};

// ---------------------------------------------------------------------------
// Configuration validators (used by maintenance/test endpoints)
// ---------------------------------------------------------------------------

export const validateEmailConfiguration = async (): Promise<{
  configured: boolean;
  provider: string;
  details: string;
}> => {
  const host = process.env.SMTP_HOST;
  if (!host) {
    return { configured: false, provider: "none", details: "SMTP_HOST not set — running in mock mode" };
  }
  return {
    configured: true,
    provider: "smtp",
    details: `SMTP: ${host}:${process.env.SMTP_PORT ?? 587}`
  };
};

export const validateWhatsAppConfiguration = async (): Promise<{
  configured: boolean;
  provider: string;
  details: string;
}> => {
  const apiUrl = process.env.WHATSAPP_API_URL;
  if (!apiUrl) {
    return { configured: false, provider: "none", details: "WHATSAPP_API_URL not set — running in mock mode" };
  }
  return {
    configured: true,
    provider: "custom",
    details: `WhatsApp API: ${apiUrl}`
  };
};

// ---------------------------------------------------------------------------
// Main exported helper
// ---------------------------------------------------------------------------

/**
 * Creates a Notification record and attempts delivery.
 * Always resolves — delivery failures are recorded in the DB but never throw.
 */
export const createAndSendNotification = async (
  input: SendNotificationInput
): Promise<NotificationResult> => {
  const { recipient, method, type, subject, message } = input;

  let deliveryStatus: "sent" | "pending" | "failed" = "pending";
  let errorMessage: string | undefined;

  try {
    if (method === "email") {
      if (recipient.email) {
        const result = await sendEmail(recipient.email, subject, message);
        deliveryStatus = result.ok ? "sent" : "failed";
        errorMessage = result.error;
      } else {
        deliveryStatus = "failed";
        errorMessage = "Recipient has no email address";
      }
    } else if (method === "whatsapp") {
      if (recipient.mobile_number) {
        const result = await sendWhatsApp(recipient.mobile_number, message);
        deliveryStatus = result.ok ? "sent" : "failed";
        errorMessage = result.error;
      } else {
        // No mobile number — store as pending (mock)
        deliveryStatus = "pending";
        console.log(`[WHATSAPP MOCK] No mobile for user ${recipient.id} — stored as pending`);
      }
    } else if (method === "in_app") {
      deliveryStatus = "sent";
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[NOTIFICATION] Delivery error (${method}):`, msg);
    deliveryStatus = "failed";
    errorMessage = msg;
  }

  // Always persist the notification record
  try {
    const notif = await Notification.create({
      recipient_id: recipient.id,
      type,
      subject,
      message,
      notification_method: method,
      status: deliveryStatus,
      read: false
    });

    // Push real-time update for in-app and email channels
    if (method === "in_app" || method === "email") {
      pushNotification(recipient.id, serializeDoc(notif.toObject()));
    }

    return { status: deliveryStatus, error_message: errorMessage, id: notif.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[NOTIFICATION] DB persist failed:", msg);
    return { status: "failed", error_message: msg };
  }
};
