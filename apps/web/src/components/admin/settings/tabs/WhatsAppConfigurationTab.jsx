import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SettingSection, InputSetting, PasswordField, ToggleSetting } from '../SettingComponents.jsx';
import {
  Send, RefreshCw, CheckCircle2, Loader2, MessageCircle,
  XCircle, Info
} from 'lucide-react';
import { toast } from 'sonner';
import pb from '@/lib/apiClient';

const WhatsAppConfigurationTab = ({ settings, onSave, saving }) => {
  const [providerStatus, setProviderStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [testNumber, setTestNumber] = useState('');
  const [testing, setTesting] = useState(false);
  const [refreshingTemplates, setRefreshingTemplates] = useState(false);
  const [form, setForm] = useState({
    whatsappEnabled: false,
    gupshupApiKey: '',
    gupshupAppName: '',
    gupshupSourceNumber: '',
    gupshupAppId: '',
  });

  const fetchStatus = async () => {
    setStatusLoading(true);
    try {
      const res = await pb.fetch('/whatsapp/status', 'GET');
      setProviderStatus(res);
    } catch {
      setProviderStatus(null);
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => { fetchStatus(); }, []);

  useEffect(() => {
    if (settings) {
      // PATCH accepts camelCase, but GET serializes the raw snake_case document —
      // read both so the form repopulates after a save or reload.
      setForm({
        whatsappEnabled: settings.whatsappEnabled ?? settings.whatsapp_enabled ?? false,
        gupshupApiKey: settings.gupshupApiKey ?? settings.gupshup_api_key ?? '',
        gupshupAppName: settings.gupshupAppName ?? settings.gupshup_app_name ?? '',
        gupshupSourceNumber: settings.gupshupSourceNumber ?? settings.gupshup_source_number ?? '',
        gupshupAppId: settings.gupshupAppId ?? settings.gupshup_app_id ?? '',
      });
    }
  }, [settings]);

  const handleSave = async () => {
    await onSave('whatsapp', form);
    setTimeout(fetchStatus, 600);
  };

  const handleRefreshTemplates = async () => {
    setRefreshingTemplates(true);
    try {
      await pb.fetch('/whatsapp/templates/refresh', 'POST');
      toast.success('Template cache cleared — newly approved templates will be picked up on the next send');
    } catch (err) {
      toast.error(err.message || 'Failed to refresh template cache');
    } finally {
      setRefreshingTemplates(false);
    }
  };

  const handleTest = async () => {
    if (!testNumber) { toast.error('Enter a phone number'); return; }
    setTesting(true);
    try {
      const settingsRes = await pb.fetch('/systemSettings', 'GET');
      const id = settingsRes?.items?.[0]?.id;
      if (!id) { toast.error('Save system settings first'); return; }
      const res = await pb.fetch(`/systemSettings/${id}/test-whatsapp`, 'POST', { to: testNumber });
      if (res?.ok) {
        toast.success(`Test WhatsApp sent to ${testNumber} via template "${res.template_name}"`);
      } else {
        const description = res?.hint || 'Check server logs for full details.';
        toast.error(res?.message || 'Delivery failed', { description, duration: 10000 });
        console.error('[WhatsApp Test]', res);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to send test message');
    } finally {
      setTesting(false);
    }
  };

  const fromEnv = providerStatus?.source === 'env';
  const isConfigured = providerStatus?.configured === true;
  const isEnabled = form.whatsappEnabled;
  const canTest = isConfigured && isEnabled;
  const sendingFrom = providerStatus?.sourceNumber
    ? `app "${providerStatus.appName}" · from ${providerStatus.sourceNumber}`
    : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="border-border/50 shadow-soft-sm">
        <CardContent className="p-6 space-y-6">

          {/* ── Configuration Status ─────────────────────────────────────────── */}
          <SettingSection
            title="WhatsApp via Gupshup"
            description="Send WhatsApp messages through Gupshup, the Business Solution Provider hosting this number. Templates are created and approved in the Gupshup dashboard."
          >
            {statusLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Checking configuration…
              </div>
            ) : (
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  {isConfigured ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-destructive" />
                  )}
                  <div>
                    <p className="font-medium text-sm">
                      {isConfigured ? 'Gupshup Configured' : 'Not Configured'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {fromEnv
                        ? `Credentials from environment variables · ${sendingFrom}`
                        : isConfigured
                          ? `Credentials stored in database · ${sendingFrom}`
                          : 'Set credentials below or via environment variables'}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={fetchStatus} title="Refresh status" className="h-8 w-8">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            )}

            {fromEnv && (
              <div className="mt-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  Credentials are set via environment variables and cannot be edited here.
                  Update <code className="font-mono text-xs bg-blue-500/10 px-1 rounded">GUPSHUP_API_KEY</code>,{' '}
                  <code className="font-mono text-xs bg-blue-500/10 px-1 rounded">GUPSHUP_APP_NAME</code> and{' '}
                  <code className="font-mono text-xs bg-blue-500/10 px-1 rounded">GUPSHUP_SOURCE_NUMBER</code> in your{' '}
                  <code className="font-mono text-xs">.env</code> file to change them.
                </p>
              </div>
            )}

            {isConfigured && isEnabled && (
              <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-700 dark:text-emerald-400">
                  Gupshup delivery is active. School credential delivery, new content alerts,
                  marks broadcasts, and announcements will be sent via WhatsApp.
                </p>
              </div>
            )}
          </SettingSection>

          {/* ── Enable / Disable ──────────────────────────────────────────────── */}
          <SettingSection
            title="Enable WhatsApp Notifications"
            description={
              fromEnv
                ? 'Credentials are loaded from environment variables — WhatsApp is always active when env vars are set. This toggle has no effect on env-based credentials.'
                : 'Toggle WhatsApp delivery globally. When disabled, no WhatsApp messages are sent even if credentials are configured.'
            }
          >
            <ToggleSetting
              label="WhatsApp Messaging"
              description={
                fromEnv
                  ? 'Always enabled when credentials come from environment variables.'
                  : isConfigured
                    ? 'Send WhatsApp messages to school admins for credential delivery, content alerts, and broadcasts.'
                    : 'Configure credentials below before enabling.'
              }
              checked={fromEnv ? true : isEnabled}
              onCheckedChange={fromEnv ? undefined : (v) => setForm(f => ({ ...f, whatsappEnabled: v }))}
              disabled={saving || fromEnv}
            />
          </SettingSection>

          {/* ── Credentials (DB-sourced only) ─────────────────────────────────── */}
          {!fromEnv && (
            <SettingSection
              title="Gupshup Credentials"
              description="Get these from the Gupshup dashboard. The API key is under Dashboard → API Key; the app name and app ID are on the app's detail page."
            >
              <div className="space-y-4">
                <PasswordField
                  label="API Key"
                  value={form.gupshupApiKey}
                  onChange={e => setForm(f => ({ ...f, gupshupApiKey: e.target.value }))}
                  placeholder="sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  disabled={saving}
                />
                <InputSetting
                  label="App Name"
                  value={form.gupshupAppName}
                  onChange={e => setForm(f => ({ ...f, gupshupAppName: e.target.value }))}
                  placeholder="IiconAcademy"
                  description="Sent as src.name on every request — must match the app name in Gupshup exactly"
                  disabled={saving}
                />
                <InputSetting
                  label="Source Number"
                  value={form.gupshupSourceNumber}
                  onChange={e => setForm(f => ({ ...f, gupshupSourceNumber: e.target.value }))}
                  placeholder="919876543210"
                  description="The migrated WhatsApp number in E.164 digits, without a leading + or spaces"
                  disabled={saving}
                />
                <InputSetting
                  label="App ID"
                  value={form.gupshupAppId}
                  onChange={e => setForm(f => ({ ...f, gupshupAppId: e.target.value }))}
                  placeholder="c6aecef6-bcb0-4fb1-8100-28c094e3bc6b"
                  description="Required to resolve template names to Gupshup template IDs. Without it, template sends will fail."
                  disabled={saving}
                />
              </div>
            </SettingSection>
          )}

          {/* ── Save button ───────────────────────────────────────────────────── */}
          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving} className="shadow-soft-sm">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {saving ? 'Saving…' : 'Save Settings'}
            </Button>
          </div>

          {/* ── Message Templates ─────────────────────────────────────────────── */}
          <SettingSection
            title="Active Message Templates"
            description="Templates must exist and be APPROVED in the Gupshup dashboard under the same names. Names are configured via environment variables; Gupshup template IDs are resolved automatically and cached for 5 minutes."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  label: 'Credential Delivery',
                  value: 'school_account',
                  description: '3 variables — school name, user ID, password. Category: Authentication.',
                },
                {
                  label: 'New Content Alert',
                  value: 'new_content_notification',
                  description: '2 variables — content title, program name. Category: Marketing.',
                },
                {
                  label: 'Broadcast',
                  value: 'broadcast_announcement',
                  description: '1 variable — the full announcement body. Category: Marketing.',
                },
                {
                  label: 'Student Marks',
                  value: 'student_marks_v3',
                  description: '5 variables — student, class, program, results, total. Category: Utility.',
                },
              ].map(t => (
                <div key={t.value} className="p-3 rounded-lg border border-border/50 bg-card/50">
                  <p className="font-medium text-sm text-foreground">{t.label}</p>
                  <p className="text-xs font-mono text-primary mt-1">{t.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshTemplates}
                disabled={refreshingTemplates || !isConfigured}
                className="bg-background"
              >
                {refreshingTemplates
                  ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  : <RefreshCw className="w-4 h-4 mr-2" />}
                Refresh template cache
              </Button>
            </div>
          </SettingSection>

          {/* ── Notification Events ───────────────────────────────────────────── */}
          <SettingSection
            title="Notification Events"
            description="WhatsApp messages are delivered for these events when Gupshup is configured and enabled."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                'School onboarding — credential delivery (template)',
                'User creation — credential delivery (template)',
                'New PDF uploaded — content alert (template)',
                'Platform broadcast — announcement (template)',
                'Student marks broadcast (template)',
                'School onboarding approval / rejection',
              ].map(event => (
                <div key={event} className="flex items-center gap-2 text-sm text-foreground">
                  <MessageCircle className={`w-4 h-4 shrink-0 ${canTest ? 'text-emerald-500' : 'text-muted-foreground/50'}`} />
                  {event}
                </div>
              ))}
            </div>
          </SettingSection>

          {/* ── Test Message ──────────────────────────────────────────────────── */}
          <SettingSection
            title="Send Test Message"
            description="Send a test template message to verify your Gupshup credentials. Uses the school_account template with sample values."
          >
            <div className="flex items-end gap-3 max-w-md">
              <div className="flex-1">
                <InputSetting
                  label="Phone Number"
                  value={testNumber}
                  onChange={e => setTestNumber(e.target.value)}
                  placeholder="+919876543210"
                  description="Include country code (e.g. +91 for India). Must have WhatsApp installed."
                  disabled={testing || !canTest}
                />
              </div>
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={testing || !canTest || !testNumber}
                className="mb-6 shrink-0 bg-background"
              >
                {testing
                  ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  : <Send className="w-4 h-4 mr-2" />}
                {testing ? 'Sending…' : 'Send Test'}
              </Button>
            </div>
            {!isConfigured && (
              <p className="text-xs text-destructive">Configure credentials above to enable test messages.</p>
            )}
            {isConfigured && !isEnabled && (
              <p className="text-xs text-muted-foreground">Enable WhatsApp messaging above, then save to send test messages.</p>
            )}
          </SettingSection>

        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppConfigurationTab;
