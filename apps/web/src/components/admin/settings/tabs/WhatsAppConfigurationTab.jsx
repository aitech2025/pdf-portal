import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SettingSection, InputSetting } from '../SettingComponents.jsx';
import {
  Send, RefreshCw, Wifi, WifiOff, QrCode, CheckCircle2,
  Loader2, MessageCircle, Phone, AlertCircle, Smartphone, XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import pb from '@/lib/apiClient';

const STATUS_LABELS = {
  disconnected: { label: 'Disconnected',  Icon: WifiOff },
  connecting:   { label: 'Connecting…',   Icon: Loader2 },
  qr_ready:     { label: 'Scan QR Code',  Icon: QrCode },
  connected:    { label: 'Connected',     Icon: CheckCircle2 },
};

const WhatsAppConfigurationTab = () => {
  const [waStatus, setWaStatus] = useState({
    status: 'disconnected', qrDataUrl: null, phone: null, lastError: null,
  });
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [testNumber, setTestNumber] = useState('');
  const [testing, setTesting] = useState(false);
  const [connectingSeconds, setConnectingSeconds] = useState(0);

  // All interval/timer handles live in refs so they never go stale in closures
  const pollIntervalRef = useRef(null);   // main status poll
  const countIntervalRef = useRef(null);  // elapsed-seconds counter
  const pollModeRef = useRef('off');      // 'fast' | 'slow' | 'off'
  const watchEndRef = useRef(0);          // epoch ms when slow-poll should stop

  // ── helpers ────────────────────────────────────────────────────────────────

  const clearPoll = useCallback(() => {
    if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
    if (countIntervalRef.current) { clearInterval(countIntervalRef.current); countIntervalRef.current = null; }
    pollModeRef.current = 'off';
    setConnectingSeconds(0);
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await pb.fetch('/whatsapp/status', 'GET');
      if (res) setWaStatus(res);
      return res;
    } catch {
      return null;
    }
  }, []);

  // Handle a freshly fetched status — decides whether to change poll mode
  const handleStatusResult = useCallback((res) => {
    if (!res) return;
    const s = res.status;

    if (s === 'connected') {
      // Done — stop all polling
      clearPoll();
      return;
    }

    if (s === 'connecting' || s === 'qr_ready') {
      // Active connection attempt — ensure fast poll is running
      if (pollModeRef.current !== 'fast') {
        clearPoll();
        pollModeRef.current = 'fast';
        pollIntervalRef.current = setInterval(async () => {
          const r = await pb.fetch('/whatsapp/status', 'GET').catch(() => null);
          if (!r) return;
          setWaStatus(r);
          if (r.status === 'connected') {
            clearInterval(pollIntervalRef.current); pollIntervalRef.current = null;
            if (countIntervalRef.current) { clearInterval(countIntervalRef.current); countIntervalRef.current = null; }
            pollModeRef.current = 'off';
            setConnectingSeconds(0);
          } else if (r.status !== 'connecting' && r.status !== 'qr_ready') {
            // Went disconnected — switch to slow reconnect-watch
            clearInterval(pollIntervalRef.current); pollIntervalRef.current = null;
            if (countIntervalRef.current) { clearInterval(countIntervalRef.current); countIntervalRef.current = null; }
            setConnectingSeconds(0);
            pollModeRef.current = 'slow';
            watchEndRef.current = Date.now() + 90_000; // watch for 90 s
            pollIntervalRef.current = setInterval(async () => {
              if (Date.now() > watchEndRef.current) {
                clearInterval(pollIntervalRef.current); pollIntervalRef.current = null;
                pollModeRef.current = 'off';
                return;
              }
              const r2 = await pb.fetch('/whatsapp/status', 'GET').catch(() => null);
              if (!r2) return;
              setWaStatus(r2);
              // If backend auto-reconnected, handleStatusResult will switch back to fast mode
              if (r2.status === 'connecting' || r2.status === 'qr_ready' || r2.status === 'connected') {
                clearInterval(pollIntervalRef.current); pollIntervalRef.current = null;
                pollModeRef.current = 'off';
                // Trigger a mode switch via the outer logic on next render
              }
            }, 4000);
          }

          if (r.status === 'connecting' && !countIntervalRef.current) {
            countIntervalRef.current = setInterval(() => setConnectingSeconds(s => s + 1), 1000);
          }
          if (r.status === 'qr_ready' && countIntervalRef.current) {
            clearInterval(countIntervalRef.current); countIntervalRef.current = null;
            setConnectingSeconds(0);
          }
        }, 1500);
      }

      // Start / stop the elapsed counter
      if (s === 'connecting' && !countIntervalRef.current) {
        countIntervalRef.current = setInterval(() => setConnectingSeconds(n => n + 1), 1000);
      }
      if (s === 'qr_ready' && countIntervalRef.current) {
        clearInterval(countIntervalRef.current); countIntervalRef.current = null;
        setConnectingSeconds(0);
      }
    }
  }, [clearPoll]);

  // ── mount / unmount ────────────────────────────────────────────────────────

  useEffect(() => {
    fetchStatus().then(handleStatusResult);
    return clearPoll;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When the status returned in state changes, re-evaluate poll mode
  useEffect(() => {
    handleStatusResult(waStatus);
  }, [waStatus.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── actions ────────────────────────────────────────────────────────────────

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await pb.fetch('/whatsapp/connect', 'POST');
      // Kick off several quick fetches to catch fast QR generation
      for (const delay of [0, 800, 2000, 4000, 7000]) {
        setTimeout(async () => {
          const r = await fetchStatus();
          handleStatusResult(r);
        }, delay);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to start WhatsApp connection');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('This will log out the linked WhatsApp number and clear the session. You will need to scan a new QR code to reconnect. Continue?')) return;
    setDisconnecting(true);
    try {
      await pb.fetch('/whatsapp/disconnect', 'POST');
      setWaStatus({ status: 'disconnected', qrDataUrl: null, phone: null, lastError: null });
      clearPoll();
      toast.success('WhatsApp disconnected and session cleared');
    } catch (err) {
      toast.error(err.message || 'Failed to disconnect');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleTest = async () => {
    if (!testNumber) { toast.error('Enter a phone number'); return; }
    if (waStatus.status !== 'connected') { toast.error('WhatsApp must be connected first'); return; }
    setTesting(true);
    try {
      const settings = await pb.fetch('/systemSettings', 'GET');
      const id = settings?.items?.[0]?.id;
      if (!id) { toast.error('Save system settings first'); return; }
      const res = await pb.fetch(`/systemSettings/${id}/test-whatsapp`, 'POST', { to: testNumber });
      if (res?.ok) {
        toast.success(`Test message sent to ${testNumber}`);
      } else {
        toast.error(res?.message || 'Delivery failed');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to send test message');
    } finally {
      setTesting(false);
    }
  };

  // ── derived state ──────────────────────────────────────────────────────────

  const info = STATUS_LABELS[waStatus.status] ?? STATUS_LABELS.disconnected;
  const isConnected   = waStatus.status === 'connected';
  const isQrReady     = waStatus.status === 'qr_ready';
  const isConnecting  = waStatus.status === 'connecting';
  const isBusy        = connecting || disconnecting;
  const showQrPanel   = isQrReady || isConnecting;
  const connectingTooLong = connectingSeconds > 25;
  const hasError      = waStatus.status === 'disconnected' && !!waStatus.lastError;

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="border-border/50 shadow-soft-sm">
        <CardContent className="p-6 space-y-6">

          {/* ── Status header ─────────────────────────────────────────────── */}
          <SettingSection
            title="WhatsApp via Baileys"
            description="Sends WhatsApp messages directly from a company-owned WhatsApp number using the WhatsApp Web protocol. No third-party API keys required — scan a QR code once with your company phone."
          >
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <info.Icon className={`w-5 h-5 ${isConnecting ? 'animate-spin' : ''} ${isConnected ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                <div>
                  <p className="font-medium text-sm">{info.label}</p>
                  {isConnected && waStatus.phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="w-3 h-3" /> +{waStatus.phone}
                    </p>
                  )}
                  {isQrReady && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Open WhatsApp on your phone → Linked Devices → Link a Device
                    </p>
                  )}
                  {isConnecting && (
                    <p className="text-xs text-muted-foreground">
                      Generating QR code{connectingSeconds > 0 ? ` (${connectingSeconds}s)` : '…'}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => fetchStatus().then(handleStatusResult)} title="Refresh status" className="h-8 w-8">
                  <RefreshCw className={`w-4 h-4 ${pollModeRef.current === 'fast' ? 'animate-spin' : ''}`} />
                </Button>

                {isConnected ? (
                  <Button
                    variant="outline" size="sm"
                    onClick={handleDisconnect}
                    disabled={isBusy}
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    {disconnecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <WifiOff className="w-4 h-4 mr-2" />}
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleConnect}
                    disabled={isBusy || isConnecting || isQrReady}
                  >
                    {connecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wifi className="w-4 h-4 mr-2" />}
                    {isConnecting ? 'Generating QR…' : isQrReady ? 'Waiting for scan…' : 'Connect WhatsApp'}
                  </Button>
                )}
              </div>
            </div>

            {/* Connected banner */}
            {isConnected && (
              <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-700 dark:text-emerald-400">
                  WhatsApp is linked and ready. Messages will be delivered through the company number.
                  The session persists across server restarts — no need to scan again.
                </p>
              </div>
            )}

            {/* Connection error */}
            {hasError && (
              <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
                <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-destructive">Connection failed</p>
                  <p className="text-xs mt-0.5 text-destructive/80">{waStatus.lastError}</p>
                  <p className="text-xs mt-1 text-muted-foreground">
                    The server retries automatically. Click "Connect WhatsApp" to retry now.
                  </p>
                </div>
              </div>
            )}

            {/* Timeout warning */}
            {isConnecting && connectingTooLong && (
              <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-700 dark:text-amber-400">
                  <p className="font-medium">Taking longer than expected</p>
                  <p className="text-xs mt-0.5">
                    Check that the server can reach WhatsApp servers (edge.whatsapp.net on port 443).
                  </p>
                </div>
              </div>
            )}
          </SettingSection>

          {/* ── QR Code panel ─────────────────────────────────────────────── */}
          {showQrPanel && (
            <SettingSection
              title="Scan QR Code"
              description="Open WhatsApp on your company phone → tap ⋮ Menu → Linked Devices → Link a Device → scan this QR. The QR refreshes every ~20 seconds."
            >
              <div className="flex flex-col items-center gap-4">
                {isQrReady && waStatus.qrDataUrl ? (
                  <>
                    <div className="p-4 bg-white rounded-2xl shadow-md border border-border/50 inline-block">
                      <img
                        src={waStatus.qrDataUrl}
                        alt="WhatsApp QR Code — scan with your phone"
                        className="w-64 h-64 block"
                      />
                    </div>
                    <div className="flex items-start gap-2 max-w-sm text-center">
                      <Smartphone className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">
                        WhatsApp → <strong>⋮ Menu</strong> → <strong>Linked Devices</strong> → <strong>Link a Device</strong> → Scan above QR
                      </p>
                    </div>
                    <p className="text-[11px] text-muted-foreground/60">
                      QR refreshes automatically if it expires before scanning
                    </p>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <div className="w-64 h-64 border-2 border-dashed border-border/50 rounded-2xl flex flex-col items-center justify-center gap-3 bg-muted/20">
                      <Loader2 className="w-10 h-10 animate-spin text-primary/50" />
                      <p className="text-sm text-muted-foreground font-medium">Generating QR code…</p>
                      <p className="text-xs text-muted-foreground/70 text-center px-6">
                        Connecting to WhatsApp servers. This usually takes 2–5 seconds.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </SettingSection>
          )}

          {/* ── Notification events ───────────────────────────────────────── */}
          <SettingSection
            title="Notification Events"
            description="WhatsApp messages are sent for these events when connected."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                'School onboarding (credential delivery)',
                'User creation (credential delivery)',
                'Password reset (admin-triggered)',
                'Forgot password (self-service)',
                'School onboarding approval / rejection',
                'User request approval / rejection',
                'Account deactivation',
              ].map(event => (
                <div key={event} className="flex items-center gap-2 text-sm text-foreground">
                  <MessageCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  {event}
                </div>
              ))}
            </div>
          </SettingSection>

          {/* ── Test message ──────────────────────────────────────────────── */}
          <SettingSection title="Send Test Message" description="Verify delivery by sending a test message to any WhatsApp number.">
            <div className="flex items-end gap-3 max-w-md">
              <div className="flex-1">
                <InputSetting
                  label="Phone Number"
                  value={testNumber}
                  onChange={e => setTestNumber(e.target.value)}
                  placeholder="+919876543210"
                  description="Include country code, e.g. +91 for India."
                  disabled={testing || !isConnected}
                />
              </div>
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={testing || !isConnected || !testNumber}
                className="mb-6 shrink-0 bg-background"
              >
                {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                {testing ? 'Sending…' : 'Send Test'}
              </Button>
            </div>
            {!isConnected && (
              <p className="text-xs text-muted-foreground">Connect WhatsApp first to send a test message.</p>
            )}
          </SettingSection>

        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppConfigurationTab;
