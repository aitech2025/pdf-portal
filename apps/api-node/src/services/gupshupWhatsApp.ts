/**
 * gupshupWhatsApp.ts
 *
 * WhatsApp delivery via Gupshup (BSP fronting the WhatsApp Business Platform).
 * Replaces the direct Meta Cloud API integration in whatsappCloudApi.ts.
 *
 * Two send modes (unchanged semantics — Gupshup proxies to the same platform):
 *   sendWhatsAppText()     — free-form text, only inside an open 24-hour service
 *                            window (recipient messaged the number in the last 24h)
 *   sendWhatsAppTemplate() — pre-approved template, required for proactive outreach
 *
 * Gupshup addresses templates by UUID, but every caller here passes the template
 * *name* (env.WHATSAPP_*_TEMPLATE). resolveTemplateId() bridges that by listing the
 * templates on the app and matching `elementName`, with a short in-process cache.
 *
 * Config (env or SystemSettings, env takes priority):
 *   GUPSHUP_API_KEY        — Gupshup dashboard, Dashboard -> API Key
 *   GUPSHUP_APP_NAME       — the Gupshup app name, sent as `src.name`
 *   GUPSHUP_SOURCE_NUMBER  — the migrated WhatsApp number, E.164 digits, no "+"
 *   GUPSHUP_APP_ID         — app UUID, required for template-name resolution
 */

import { SystemSettings } from "../models/index.js";
import { env } from "../config/env.js";

const GUPSHUP_BASE = "https://api.gupshup.io";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GupshupConfig {
  apiKey: string;
  appName: string;
  sourceNumber: string;
  appId?: string;
}

export interface SendResult {
  ok: boolean;
  error?: string;
  errorCode?: number;
  messageId?: string;
}

// ---------------------------------------------------------------------------
// Config loader — env first, then DB SystemSettings
// ---------------------------------------------------------------------------

const loadGupshupConfig = async (): Promise<GupshupConfig | null> => {
  if (env.GUPSHUP_API_KEY && env.GUPSHUP_APP_NAME && env.GUPSHUP_SOURCE_NUMBER) {
    return {
      apiKey: env.GUPSHUP_API_KEY,
      appName: env.GUPSHUP_APP_NAME,
      sourceNumber: env.GUPSHUP_SOURCE_NUMBER,
      appId: env.GUPSHUP_APP_ID
    };
  }
  try {
    const row = await SystemSettings.findOne().sort({ created: -1 }).lean();
    if (row) {
      const r = row as Record<string, unknown>;
      if (r.whatsapp_enabled === false) {
        console.log("[Gupshup] WhatsApp disabled in system settings");
        return null;
      }
      const apiKey = r.gupshup_api_key as string | undefined;
      const appName = r.gupshup_app_name as string | undefined;
      const sourceNumber = r.gupshup_source_number as string | undefined;
      const appId = r.gupshup_app_id as string | undefined;
      if (apiKey && appName && sourceNumber) {
        return { apiKey, appName, sourceNumber, appId };
      }
    }
  } catch (err) {
    console.warn("[Gupshup] SystemSettings read failed:", (err as Error).message);
  }
  return null;
};

// ---------------------------------------------------------------------------
// E.164 normalisation — India-centric, unchanged from the Cloud API integration
// ---------------------------------------------------------------------------

const toE164 = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits;
};

/**
 * Meta rejects template parameters containing newlines, tabs, or runs of 4+
 * spaces. Gupshup forwards params verbatim, so the same rule still applies.
 */
const sanitizeTemplateText = (value: string): string =>
  value.replace(/[\r\n\t]+/g, " ").replace(/ {5,}/g, "    ").trim();

// ---------------------------------------------------------------------------
// Core HTTP helper — Gupshup takes form-urlencoded, not JSON
// ---------------------------------------------------------------------------

const postForm = async (
  cfg: GupshupConfig,
  path: string,
  fields: Record<string, string>
): Promise<SendResult> => {
  const body = new URLSearchParams(fields).toString();
  try {
    const res = await fetch(`${GUPSHUP_BASE}${path}`, {
      method: "POST",
      headers: {
        "apikey": cfg.apiKey,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    });
    const raw = await res.text();
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      data = { message: raw };
    }
    if (!res.ok) {
      const msg = (data.message as string) ?? `HTTP ${res.status}`;
      console.error(`[Gupshup] API error ${res.status}: ${msg}`, raw);
      return { ok: false, error: msg, errorCode: res.status };
    }
    return { ok: true, messageId: data.messageId as string | undefined };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Gupshup] Fetch failed:", msg);
    return { ok: false, error: msg };
  }
};

// ---------------------------------------------------------------------------
// Template name -> UUID resolution
// ---------------------------------------------------------------------------

interface GupshupTemplate {
  id: string;
  elementName: string;
  status: string;
  category?: string;
  languageCode?: string;
}

let templateCache: { at: number; byName: Map<string, GupshupTemplate> } | null = null;
const TEMPLATE_CACHE_TTL_MS = 5 * 60 * 1000;

const fetchTemplates = async (cfg: GupshupConfig): Promise<Map<string, GupshupTemplate>> => {
  const byName = new Map<string, GupshupTemplate>();
  if (!cfg.appId) return byName;

  const url = `${GUPSHUP_BASE}/wa/app/${cfg.appId}/template?pageSize=200`;
  try {
    const res = await fetch(url, { headers: { apikey: cfg.apiKey } });
    if (!res.ok) {
      console.error(`[Gupshup] Template list failed: HTTP ${res.status}`);
      return byName;
    }
    const data = await res.json() as { templates?: GupshupTemplate[] };
    for (const t of data.templates ?? []) {
      // Prefer an APPROVED template if the same name exists in several states.
      const existing = byName.get(t.elementName);
      if (!existing || (existing.status !== "APPROVED" && t.status === "APPROVED")) {
        byName.set(t.elementName, t);
      }
    }
  } catch (err) {
    console.error("[Gupshup] Template list fetch failed:", (err as Error).message);
  }
  return byName;
};

/**
 * Resolve a template name (elementName) to its Gupshup UUID.
 * Returns an error string when the app has no such template, or it is not approved.
 */
export const resolveTemplateId = async (
  cfg: GupshupConfig,
  templateName: string
): Promise<{ id?: string; error?: string }> => {
  const fresh = templateCache !== null && Date.now() - templateCache.at < TEMPLATE_CACHE_TTL_MS;
  if (!fresh) {
    templateCache = { at: Date.now(), byName: await fetchTemplates(cfg) };
  }
  let tpl = templateCache!.byName.get(templateName);

  // A template approved moments ago will not be in a warm cache — refetch once.
  if (!tpl && fresh) {
    templateCache = { at: Date.now(), byName: await fetchTemplates(cfg) };
    tpl = templateCache.byName.get(templateName);
  }

  if (!tpl) {
    if (!cfg.appId) {
      return { error: `Cannot resolve template "${templateName}": GUPSHUP_APP_ID is not set.` };
    }
    return { error: `Template "${templateName}" does not exist in Gupshup app "${cfg.appName}".` };
  }
  if (tpl.status !== "APPROVED") {
    return { error: `Template "${templateName}" is not approved (status: ${tpl.status}).` };
  }
  return { id: tpl.id };
};

/** Drop the cached template list — call after creating or editing templates. */
export const invalidateTemplateCache = (): void => {
  templateCache = null;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send a free-form text message.
 * Only works within an open 24-hour customer-service window.
 * For first-time outreach use sendWhatsAppTemplate() instead.
 */
export const sendWhatsAppText = async (
  phone: string,
  message: string
): Promise<SendResult> => {
  const cfg = await loadGupshupConfig();
  if (!cfg) {
    console.warn("[Gupshup] Not configured — skipping WhatsApp text send");
    return { ok: false, error: "Gupshup not configured. Set GUPSHUP_API_KEY, GUPSHUP_APP_NAME and GUPSHUP_SOURCE_NUMBER." };
  }
  const to = toE164(phone);
  if (!to) return { ok: false, error: "Invalid phone number" };

  console.log(`[Gupshup] Sending text to ${to}`);
  const result = await postForm(cfg, "/wa/api/v1/msg", {
    channel: "whatsapp",
    source: cfg.sourceNumber,
    destination: to,
    "src.name": cfg.appName,
    message: JSON.stringify({ type: "text", text: message }),
    disablePreview: "true"
  });
  if (result.ok) console.log(`[Gupshup] Text sent to ${to} (${result.messageId})`);
  return result;
};

/**
 * Send a pre-approved template message.
 *
 * @param phone         Recipient phone (any format — normalised to E.164 internally)
 * @param templateName  Approved template name (Gupshup `elementName`)
 * @param bodyParams    Ordered array of {{1}}, {{2}}, … substitution strings
 * @param _languageCode Accepted for signature compatibility with the old Cloud API
 *                      service. Gupshup selects the language from the template UUID,
 *                      so it is not sent on the wire.
 */
export const sendWhatsAppTemplate = async (
  phone: string,
  templateName: string,
  bodyParams: string[],
  _languageCode = "en"
): Promise<SendResult> => {
  const cfg = await loadGupshupConfig();
  if (!cfg) {
    console.warn("[Gupshup] Not configured — skipping WhatsApp template send");
    return { ok: false, error: "Gupshup not configured." };
  }
  const to = toE164(phone);
  if (!to) return { ok: false, error: "Invalid phone number" };

  const { id, error } = await resolveTemplateId(cfg, templateName);
  if (!id) return { ok: false, error, errorCode: 404 };

  const params = bodyParams.map(sanitizeTemplateText);

  console.log(`[Gupshup] Sending template "${templateName}" (id=${id}, params=${params.length}) to ${to}`);
  const result = await postForm(cfg, "/wa/api/v1/template/msg", {
    channel: "whatsapp",
    source: cfg.sourceNumber,
    destination: to,
    "src.name": cfg.appName,
    template: JSON.stringify({ id, params })
  });
  if (result.ok) {
    console.log(`[Gupshup] Template "${templateName}" sent to ${to} (${result.messageId})`);
  }
  return result;
};

/**
 * Status check — returns whether Gupshup credentials are configured.
 * Used by the admin Settings page and the notification config validator.
 */
export const getWhatsAppProviderStatus = async (): Promise<{
  configured: boolean;
  enabled: boolean;
  appName?: string;
  sourceNumber?: string;
  source: "env" | "db" | "none";
}> => {
  if (env.GUPSHUP_API_KEY && env.GUPSHUP_APP_NAME && env.GUPSHUP_SOURCE_NUMBER) {
    return {
      configured: true,
      enabled: true,
      appName: env.GUPSHUP_APP_NAME,
      sourceNumber: env.GUPSHUP_SOURCE_NUMBER,
      source: "env"
    };
  }
  try {
    const row = await SystemSettings.findOne().sort({ created: -1 }).lean();
    if (row) {
      const r = row as Record<string, unknown>;
      const apiKey = r.gupshup_api_key as string | undefined;
      const appName = r.gupshup_app_name as string | undefined;
      const sourceNumber = r.gupshup_source_number as string | undefined;
      const enabled = r.whatsapp_enabled !== false && !!r.whatsapp_enabled;
      if (apiKey && appName && sourceNumber) {
        return { configured: true, enabled, appName, sourceNumber, source: "db" };
      }
      return { configured: false, enabled, source: "db" };
    }
  } catch { /* ignore */ }
  return { configured: false, enabled: false, source: "none" };
};
