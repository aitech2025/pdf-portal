/**
 * baileysWhatsApp.ts
 *
 * Singleton WhatsApp service powered by @whiskeysockets/baileys.
 * Uses the WhatsApp Web protocol — links a regular WhatsApp number via QR scan.
 *
 * Lifecycle:
 *   1. initWhatsAppOnStartup() — called at server boot; reconnects if creds are saved.
 *   2. connectWhatsApp()       — admin triggers; shows QR code.
 *   3. Admin scans QR with the company phone.
 *   4. Connection opens; sendWhatsAppText() becomes available.
 *   5. disconnectWhatsApp()    — logs out and clears saved creds.
 */

import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  fetchLatestBaileysVersion,
  type WASocket,
} from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import path from "path";
import { existsSync, mkdirSync, readdirSync, unlinkSync } from "fs";

export type WAConnectionStatus = "disconnected" | "connecting" | "qr_ready" | "connected";

export interface WAState {
  status: WAConnectionStatus;
  qrDataUrl: string | null;
  phone: string | null;
  lastError: string | null;
}

const AUTH_DIR = process.env.WHATSAPP_AUTH_DIR ?? path.join(process.cwd(), "baileys_auth");

// Fully pino-compatible silent logger — covers all methods Baileys calls at runtime
const silentLogger = {
  level: "silent",
  silent: () => {},
  trace: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  fatal: () => {},
  isLevelEnabled: () => false,
  setBindings: () => {},
  bindings: () => ({}),
  flush: () => {},
  flushSync: () => {},
  child() { return this; },
} as unknown as import("pino").Logger;

let sock: WASocket | null = null;
let waState: WAState = { status: "disconnected", qrDataUrl: null, phone: null, lastError: null };
let reconnectTimer: NodeJS.Timeout | null = null;
let failureCount = 0;
const MAX_AUTO_RECONNECTS = 5;
// Track when the connection last opened so we can tell whether it was stable.
// A connection that lives < STABLE_THRESHOLD_MS is treated as another failure
// rather than a fresh start — prevents the backoff from resetting on every
// brief connect-then-428 cycle.
const STABLE_THRESHOLD_MS = 30_000;
let connectionOpenedAt: number | null = null;

export const getConnectionStatus = (): WAState => ({ ...waState });

/** Remove all credential files so the next connect starts fresh with a QR scan. */
const clearAuthFiles = (): void => {
  try {
    if (!existsSync(AUTH_DIR)) return;
    for (const file of readdirSync(AUTH_DIR)) {
      try { unlinkSync(path.join(AUTH_DIR, file)); } catch { /* ignore per-file */ }
    }
  } catch { /* ignore */ }
};

const scheduleReconnect = () => {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (failureCount >= MAX_AUTO_RECONNECTS) {
    console.warn("[WhatsApp] Max reconnect attempts reached — waiting for manual reconnect");
    waState = { ...waState, lastError: "Connection failed after multiple attempts. Click 'Connect WhatsApp' to try again." };
    return;
  }
  // Exponential back-off: 5s, 10s, 20s, 40s, 80s
  const delay = Math.min(5_000 * Math.pow(2, failureCount - 1), 80_000);
  console.log(`[WhatsApp] Auto-reconnecting in ${Math.round(delay / 1000)}s (attempt ${failureCount}/${MAX_AUTO_RECONNECTS})`);
  reconnectTimer = setTimeout(() => connectWhatsApp(false), delay);
};

export const connectWhatsApp = async (isManualConnect = false): Promise<void> => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  // Manual connect: always start completely fresh — clear stale session, reset counters, kill socket
  if (isManualConnect) {
    // Always clear auth files on manual connect — stale sessions cause immediate 401/loggedOut disconnect
    clearAuthFiles();
    failureCount = 0;
    // Tear down lingering socket without triggering a server-side logout
    if (sock) {
      try { (sock.ws as { close?: () => void })?.close?.(); } catch { /* ignore */ }
      sock = null;
    }
    // CRITICAL: Reset waState so the guard below does not short-circuit the new connection
    waState = { status: "disconnected", qrDataUrl: null, phone: null, lastError: null };
  }

  // Already in an active or pending state — do not create a second socket
  if (
    waState.status === "connecting" ||
    waState.status === "qr_ready" ||
    waState.status === "connected"
  ) return;

  // Ensure the auth directory exists
  mkdirSync(AUTH_DIR, { recursive: true });

  waState = { status: "connecting", qrDataUrl: null, phone: null, lastError: null };
  console.log("[WhatsApp] Initiating connection…");

  try {
    const { state: authState, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    // Fetch the latest WhatsApp Web client version so the connection isn't rejected
    // for using an outdated version string
    let waVersion: [number, number, number] | undefined;
    try {
      const { version, isLatest } = await fetchLatestBaileysVersion();
      waVersion = version;
      console.log(`[WhatsApp] Using WA client version ${version.join(".")} (isLatest: ${isLatest})`);
    } catch {
      console.warn("[WhatsApp] Could not fetch latest version — using Baileys default");
    }

    sock = makeWASocket({
      ...(waVersion ? { version: waVersion } : {}),
      auth: authState,
      printQRInTerminal: true,
      browser: Browsers.ubuntu("Chrome"),
      logger: silentLogger,
      getMessage: async () => undefined,
      syncFullHistory: false,
      connectTimeoutMs: 60_000,
      defaultQueryTimeoutMs: 60_000,
      // Keep-alive pings prevent idle-timeout 428s from WhatsApp servers
      keepAliveIntervalMs: 15_000,
    });

    const currentSock = sock;
    currentSock.ev.on("creds.update", saveCreds);

    currentSock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log("[WhatsApp] QR code received — generating data URL");
        waState.status = "qr_ready";
        waState.lastError = null;
        failureCount = 0;
        try {
          waState.qrDataUrl = await QRCode.toDataURL(qr, {
            errorCorrectionLevel: "M",
            type: "image/png",
            margin: 2,
            width: 256,
          });
        } catch (err) {
          try {
            waState.qrDataUrl = await QRCode.toDataURL(qr);
          } catch {
            console.error("[WhatsApp] QRCode.toDataURL failed:", err);
            waState.qrDataUrl = null;
          }
        }
      }

      if (connection === "close") {
        const err = lastDisconnect?.error as {
          output?: { statusCode?: number };
          statusCode?: number;
          message?: string;
        } | undefined;
        const code = err?.output?.statusCode ?? err?.statusCode;
        const loggedOut = code === DisconnectReason.loggedOut;
        const reason = err?.message || (code ? `code ${code}` : "unknown reason");

        // Was this connection stable long enough to be treated as a fresh start?
        const uptime = connectionOpenedAt ? Date.now() - connectionOpenedAt : 0;
        connectionOpenedAt = null;
        const wasStable = uptime >= STABLE_THRESHOLD_MS;

        console.error(`[WhatsApp] Connection closed — code=${code ?? "N/A"} reason="${reason}" loggedOut=${loggedOut} uptime=${Math.round(uptime / 1000)}s stable=${wasStable}`);

        sock = null;

        if (loggedOut) {
          console.log("[WhatsApp] Logged out from phone — clearing saved session");
          clearAuthFiles();
          failureCount = 0;
          waState = { status: "disconnected", qrDataUrl: null, phone: null, lastError: "Session ended from your phone. Scan a new QR to reconnect." };
        } else {
          // Only reset failureCount when the connection was genuinely stable.
          // A brief connect-then-428 cycle must NOT reset the counter —
          // that would keep the backoff at 5 s forever.
          if (wasStable) {
            failureCount = 1;
          } else {
            failureCount++;
          }
          waState = { status: "disconnected", qrDataUrl: null, phone: null, lastError: reason };
          scheduleReconnect();
        }
      }

      if (connection === "open") {
        connectionOpenedAt = Date.now();
        console.log("[WhatsApp] Connected —", currentSock.user?.id);
        waState = {
          status: "connected",
          qrDataUrl: null,
          phone: currentSock.user?.id?.split(":")[0] ?? null,
          lastError: null,
        };
      }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[WhatsApp] Failed to initialise socket:", msg);
    sock = null;
    failureCount++;
    waState = { status: "disconnected", qrDataUrl: null, phone: null, lastError: msg };
    scheduleReconnect();
  }
};

export const disconnectWhatsApp = async (): Promise<void> => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  failureCount = 0;
  if (sock) {
    try { await sock.logout(); } catch { /* ignore logout errors */ }
    sock = null;
  }
  // Clear saved credentials so next connect forces a fresh QR scan
  clearAuthFiles();
  waState = { status: "disconnected", qrDataUrl: null, phone: null, lastError: null };
};

/**
 * Normalise an arbitrary phone string to a digit-only E.164 string (no leading +).
 * Defaults to India (91) for 10-digit numbers since the platform is India-centric.
 *   "9550432743"       → "919550432743"
 *   "09550432743"      → "919550432743"
 *   "919550432743"     → "919550432743"
 *   "+919550432743"    → "919550432743"
 *   "+1 650 555 0100"  → "16505550100"  (already has country code)
 */
const toE164Digits = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits;
};

export const sendWhatsAppText = async (
  phone: string,
  text: string
): Promise<{ ok: boolean; error?: string }> => {
  if (!sock || waState.status !== "connected") {
    console.warn(`[WhatsApp] sendWhatsAppText: not connected (status=${waState.status}, sock=${sock ? "present" : "null"})`);
    return { ok: false, error: "WhatsApp not connected. Link a number in Settings → WhatsApp." };
  }
  const e164 = toE164Digits(phone);
  if (!e164) {
    console.warn(`[WhatsApp] sendWhatsAppText: invalid phone number "${phone}"`);
    return { ok: false, error: "Invalid phone number" };
  }

  const candidateJid = `${e164}@s.whatsapp.net`;

  // Verify the number is registered on WhatsApp and get the canonical JID.
  // sendMessage with an unverified JID is silently dropped by WA servers.
  let resolvedJid = candidateJid;
  try {
    const currentSock = sock;
    const results = await currentSock.onWhatsApp(candidateJid);
    const result = results?.[0];
    if (!result?.exists) {
      console.warn(`[WhatsApp] ${phone} → ${candidateJid} is not registered on WhatsApp`);
      return { ok: false, error: `${phone} is not registered on WhatsApp` };
    }
    resolvedJid = result.jid;
    console.log(`[WhatsApp] Verified JID: ${resolvedJid}`);
  } catch (err) {
    // onWhatsApp query failed (network hiccup) — proceed with constructed JID as fallback
    console.warn(`[WhatsApp] onWhatsApp check failed for ${candidateJid}, proceeding anyway:`, (err as Error).message);
  }

  console.log(`[WhatsApp] Sending message to ${resolvedJid} (${text.length} chars)`);
  try {
    await sock!.sendMessage(resolvedJid, { text });
    console.log(`[WhatsApp] Message sent to ${resolvedJid}`);
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[WhatsApp] Send failed to ${resolvedJid}:`, msg);
    return { ok: false, error: msg };
  }
};

// Called at server startup — reconnects silently if valid credentials exist.
export const initWhatsAppOnStartup = async (): Promise<void> => {
  try {
    mkdirSync(AUTH_DIR, { recursive: true });
    const { state: authState } = await useMultiFileAuthState(AUTH_DIR);
    if (authState.creds.me) {
      console.log("[WhatsApp] Saved session found — reconnecting automatically");
      await connectWhatsApp();
    }
  } catch {
    // No saved credentials or directory issue — wait for admin to initiate QR scan
  }
};
