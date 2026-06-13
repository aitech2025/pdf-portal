/**
 * whatsappCloudApi.ts
 *
 * WhatsApp delivery via the official Meta Cloud API.
 * No session management, no QR scan — just HTTP calls with a permanent access token.
 *
 * Two send modes:
 *   sendWhatsAppText()     — free-form text (works within an open 24-hour service window
 *                            i.e. the user messaged your number first within the last 24h)
 *   sendWhatsAppTemplate() — pre-approved template message (required for first-time
 *                            proactive outreach, e.g. credential delivery to new school admins)
 *
 * Config (env or SystemSettings, env takes priority):
 *   WHATSAPP_PHONE_NUMBER_ID   — the Phone Number ID from the Meta dashboard
 *   WHATSAPP_ACCESS_TOKEN      — permanent system-user token (never expires)
 *   WHATSAPP_API_VERSION       — e.g. "v20.0" (default)
 *   WHATSAPP_CREDENTIAL_TEMPLATE — template name for credential delivery
 */

import { SystemSettings } from "../models/index.js";
import { env } from "../config/env.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WACloudConfig {
  phoneNumberId: string;
  accessToken: string;
  apiVersion: string;
}

export interface TemplateParameter {
  type: "text" | "currency" | "date_time";
  text: string;
}

// ---------------------------------------------------------------------------
// Config loader — env first, then DB SystemSettings
// ---------------------------------------------------------------------------

const loadCloudConfig = async (): Promise<WACloudConfig | null> => {
  // Env vars take priority — fastest path
  if (env.WHATSAPP_PHONE_NUMBER_ID && env.WHATSAPP_ACCESS_TOKEN) {
    return {
      phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
      accessToken: env.WHATSAPP_ACCESS_TOKEN,
      apiVersion: env.WHATSAPP_API_VERSION
    };
  }
  // Fall back to SystemSettings (editable from admin UI)
  try {
    const row = await SystemSettings.findOne().sort({ created: -1 }).lean();
    if (row) {
      const phoneNumberId = (row as Record<string, unknown>).whatsapp_phone_number_id as string | undefined;
      const accessToken = (row as Record<string, unknown>).whatsapp_access_token as string | undefined;
      const apiVersion = ((row as Record<string, unknown>).whatsapp_api_version as string | undefined) ?? env.WHATSAPP_API_VERSION;
      if (phoneNumberId && accessToken) {
        return { phoneNumberId, accessToken, apiVersion };
      }
    }
  } catch (err) {
    console.warn("[WA Cloud] SystemSettings read failed:", (err as Error).message);
  }
  return null;
};

// ---------------------------------------------------------------------------
// E.164 normalisation — same logic as before, India-centric
// ---------------------------------------------------------------------------

const toE164 = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits;
};

// ---------------------------------------------------------------------------
// Core HTTP helper
// ---------------------------------------------------------------------------

const postToCloudApi = async (
  cfg: WACloudConfig,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; error?: string; data?: Record<string, unknown> }> => {
  const url = `https://graph.facebook.com/${cfg.apiVersion}/${cfg.phoneNumberId}/messages`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cfg.accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json() as Record<string, unknown>;
    if (!res.ok) {
      const errObj = data.error as Record<string, unknown> | undefined;
      const msg = (errObj?.message as string) ?? `HTTP ${res.status}`;
      console.error("[WA Cloud] API error:", msg, JSON.stringify(data));
      return { ok: false, error: msg, data };
    }
    return { ok: true, data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[WA Cloud] Fetch failed:", msg);
    return { ok: false, error: msg };
  }
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send a free-form text message.
 * Only works within an open 24-hour customer-service window (i.e. the recipient
 * must have messaged your WhatsApp number in the last 24 hours).
 * For first-time outreach use sendWhatsAppTemplate() instead.
 */
export const sendWhatsAppText = async (
  phone: string,
  message: string
): Promise<{ ok: boolean; error?: string }> => {
  const cfg = await loadCloudConfig();
  if (!cfg) {
    console.warn("[WA Cloud] Not configured — skipping WhatsApp text send");
    return { ok: false, error: "WhatsApp Cloud API not configured. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN." };
  }
  const to = toE164(phone);
  if (!to) return { ok: false, error: "Invalid phone number" };

  console.log(`[WA Cloud] Sending text to ${to}`);
  const result = await postToCloudApi(cfg, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { preview_url: false, body: message }
  });
  if (result.ok) console.log(`[WA Cloud] Text sent to ${to}`);
  return result;
};

/**
 * Send a pre-approved template message.
 * Required for proactive outreach (e.g. credential delivery to new school admins
 * who have never messaged the business number before).
 *
 * @param phone        Recipient phone (any format — normalised to E.164 internally)
 * @param templateName Approved template name in Meta (e.g. "school_account_credentials")
 * @param bodyParams   Ordered array of {{1}}, {{2}}, … substitution strings for the body
 * @param languageCode Template language code (default "en")
 */
export const sendWhatsAppTemplate = async (
  phone: string,
  templateName: string,
  bodyParams: string[],
  languageCode = "en"
): Promise<{ ok: boolean; error?: string }> => {
  const cfg = await loadCloudConfig();
  if (!cfg) {
    console.warn("[WA Cloud] Not configured — skipping WhatsApp template send");
    return { ok: false, error: "WhatsApp Cloud API not configured." };
  }
  const to = toE164(phone);
  if (!to) return { ok: false, error: "Invalid phone number" };

  const components: Record<string, unknown>[] = [];
  if (bodyParams.length > 0) {
    components.push({
      type: "body",
      parameters: bodyParams.map(text => ({ type: "text", text }))
    });
  }

  console.log(`[WA Cloud] Sending template "${templateName}" to ${to}`);
  const result = await postToCloudApi(cfg, {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components
    }
  });
  if (result.ok) console.log(`[WA Cloud] Template "${templateName}" sent to ${to}`);
  return result;
};

/**
 * Status check — returns whether Cloud API credentials are configured.
 * Used by the admin Settings page.
 */
export const getCloudApiStatus = async (): Promise<{
  configured: boolean;
  phoneNumberId?: string;
  source: "env" | "db" | "none";
}> => {
  if (env.WHATSAPP_PHONE_NUMBER_ID && env.WHATSAPP_ACCESS_TOKEN) {
    return { configured: true, phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID, source: "env" };
  }
  try {
    const row = await SystemSettings.findOne().sort({ created: -1 }).lean();
    if (row) {
      const phoneNumberId = (row as Record<string, unknown>).whatsapp_phone_number_id as string | undefined;
      const accessToken = (row as Record<string, unknown>).whatsapp_access_token as string | undefined;
      if (phoneNumberId && accessToken) {
        return { configured: true, phoneNumberId, source: "db" };
      }
    }
  } catch { /* ignore */ }
  return { configured: false, source: "none" };
};
