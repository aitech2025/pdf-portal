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
  reconnectTimer = setTimeout(() => connectWhatsApp(), delay);
};

export const connectWhatsApp = async (): Promise<void> => {
  // Already in an active or pending state — do not create a second socket
  if (
    waState.status === "connecting" ||
    waState.status === "qr_ready" ||
    waState.status === "connected"
  ) return;

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  // Ensure the auth directory exists
  mkdirSync(AUTH_DIR, { recursive: true });

  waState = { status: "connecting", qrDataUrl: null, phone: null, lastError: null };
  console.log("[WhatsApp] Initiating connection…");

  try {
    const { state: authState, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    sock = makeWASocket({
      auth: authState,
      printQRInTerminal: false,
      // Use a recognised browser fingerprint — custom names are rejected by WhatsApp servers
      browser: Browsers.ubuntu("Chrome"),
      logger: silentLogger,
      getMessage: async () => undefined,
      // Don't sync full history on connect — faster QR generation
      syncFullHistory: false,
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
        const err = lastDisconnect?.error as { output?: { statusCode?: number }; message?: string } | undefined;
        const code = err?.output?.statusCode;
        const loggedOut = code === DisconnectReason.loggedOut;
        const reason = err?.message || (code ? `code ${code}` : "unknown reason");

        console.error(`[WhatsApp] Connection closed — ${reason} (loggedOut=${loggedOut})`);

        sock = null;
        failureCount++;

        if (loggedOut) {
          console.log("[WhatsApp] Logged out from phone — clearing saved session");
          clearAuthFiles();
          failureCount = 0;
          waState = { status: "disconnected", qrDataUrl: null, phone: null, lastError: "Session ended from your phone. Scan a new QR to reconnect." };
        } else {
          waState = { status: "disconnected", qrDataUrl: null, phone: null, lastError: reason };
          scheduleReconnect();
        }
      }

      if (connection === "open") {
        console.log("[WhatsApp] Connected —", currentSock.user?.id);
        failureCount = 0;
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

export const sendWhatsAppText = async (
  phone: string,
  text: string
): Promise<{ ok: boolean; error?: string }> => {
  if (!sock || waState.status !== "connected") {
    return { ok: false, error: "WhatsApp not connected. Link a number in Settings → WhatsApp." };
  }
  const digits = phone.replace(/[^\d]/g, "");
  if (!digits) return { ok: false, error: "Invalid phone number" };
  const jid = `${digits}@s.whatsapp.net`;
  try {
    await sock.sendMessage(jid, { text });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
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
