import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SettingSection, InputSetting, ToggleSetting, PasswordField, SelectSetting } from '../SettingComponents.jsx';
import { Save, Send, MessageCircle, CheckCircle2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import pb from '@/lib/apiClient';

const PROVIDER_OPTIONS = [
    { value: 'cloud_api', label: 'WhatsApp Cloud API (Meta) — recommended' },
    { value: 'waha', label: 'WAHA self-hosted gateway' },
    { value: 'custom', label: 'Custom HTTP gateway' },
];

const TEMPLATE_LANGUAGES = [
    { value: 'en_US', label: 'English (US)' },
    { value: 'en_GB', label: 'English (UK)' },
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'pt_BR', label: 'Portuguese (Brazil)' },
    { value: 'hi', label: 'Hindi' },
];

const WhatsAppConfigurationTab = ({ settings, onSave, saving }) => {
    const wa = settings?.integrations?.whatsapp || {};

    const [enabled, setEnabled] = useState(wa.enabled ?? false);
    const [provider, setProvider] = useState(wa.provider || 'cloud_api');

    // Meta Cloud API fields
    const [phoneNumberId, setPhoneNumberId] = useState(wa.phoneNumberId || '');
    const [accessToken, setAccessToken] = useState(wa.accessToken || '');
    const [apiVersion, setApiVersion] = useState(wa.apiVersion || 'v22.0');
    const [templateName, setTemplateName] = useState(wa.templateName || '');
    const [templateLanguage, setTemplateLanguage] = useState(wa.templateLanguage || 'en_US');

    // WAHA / custom fields
    const [fromNumber, setFromNumber] = useState(wa.fromNumber || '');
    const [apiKey, setApiKey] = useState(wa.apiKey || '');
    const [apiUrl, setApiUrl] = useState(wa.apiUrl || '');
    const [session, setSession] = useState(wa.session || 'default');

    const [testNumber, setTestNumber] = useState('');
    const [testing, setTesting] = useState(false);

    useEffect(() => {
        const w = settings?.integrations?.whatsapp || {};
        setEnabled(w.enabled ?? false);
        setProvider(w.provider || 'cloud_api');
        setPhoneNumberId(w.phoneNumberId || '');
        setAccessToken(w.accessToken || '');
        setApiVersion(w.apiVersion || 'v22.0');
        setTemplateName(w.templateName || '');
        setTemplateLanguage(w.templateLanguage || 'en_US');
        setFromNumber(w.fromNumber || '');
        setApiKey(w.apiKey || '');
        setApiUrl(w.apiUrl || '');
        setSession(w.session || 'default');
    }, [settings]);

    const handleSave = () => {
        const whatsappConfig = {
            enabled,
            provider,
            // Cloud API
            phoneNumberId,
            accessToken,
            apiVersion,
            templateName,
            templateLanguage,
            // WAHA / custom
            fromNumber,
            apiKey,
            apiUrl,
            session,
        };
        onSave('integrations', {
            ...(settings?.integrations || {}),
            whatsapp: whatsappConfig,
        });
    };

    const handleTest = async () => {
        if (!settings?.id) {
            toast.error('Save system settings first');
            return;
        }
        if (!testNumber) {
            toast.error('Enter a test phone number first');
            return;
        }
        setTesting(true);
        try {
            const res = await pb.fetch(`/systemSettings/${settings.id}/test-whatsapp`, 'POST', { to: testNumber });
            if (res?.ok) {
                toast.success(`Test message sent to ${testNumber}`);
            } else {
                toast.error(res?.message || 'Delivery failed — check provider credentials');
            }
        } catch (err) {
            toast.error(err.message || 'Failed to send test message');
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <Card className="border-border/50 shadow-soft-sm">
                <CardContent className="p-6">

                    <SettingSection
                        title="WhatsApp Integration"
                        description="Send notifications and alerts via WhatsApp to schools and users."
                    >
                        <ToggleSetting
                            label="Enable WhatsApp Notifications"
                            description="When enabled, the system sends WhatsApp messages for key events (onboarding, password reset, approvals)."
                            checked={enabled}
                            onCheckedChange={setEnabled}
                            disabled={saving}
                        />

                        {enabled && (
                            <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <p className="text-sm text-emerald-700 dark:text-emerald-400">
                                    WhatsApp integration is active. Save your changes below for the runtime to pick up the new credentials.
                                </p>
                            </div>
                        )}
                    </SettingSection>

                    <SettingSection
                        title="Provider"
                        description="Choose your WhatsApp messaging provider."
                    >
                        <SelectSetting
                            label="Provider"
                            value={provider}
                            onValueChange={setProvider}
                            options={PROVIDER_OPTIONS}
                            disabled={saving}
                        />

                        {provider === 'cloud_api' && (
                            <div className="mt-4 space-y-4">
                                <div className="p-3 rounded-lg bg-muted/40 border border-border/50 text-xs text-muted-foreground">
                                    Recommended for production. Requires a Meta for Developers App with the
                                    {' '}<span className="font-semibold text-foreground">WhatsApp Business Platform</span>{' '}
                                    product enabled, a registered phone number, and (for messages outside the
                                    24-hour service window) at least one pre-approved message template.{' '}
                                    <a
                                        href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-primary hover:underline"
                                    >
                                        Meta setup guide <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <InputSetting
                                        label="Phone Number ID"
                                        value={phoneNumberId}
                                        onChange={(e) => setPhoneNumberId(e.target.value)}
                                        placeholder="e.g. 123456789012345"
                                        description="From WhatsApp → API setup → Phone number ID."
                                        disabled={saving}
                                    />
                                    <InputSetting
                                        label="API Version"
                                        value={apiVersion}
                                        onChange={(e) => setApiVersion(e.target.value)}
                                        placeholder="v22.0"
                                        description="Graph API version. Default v22.0 is fine."
                                        disabled={saving}
                                    />
                                    <PasswordField
                                        label="Access Token"
                                        value={accessToken}
                                        onChange={(e) => setAccessToken(e.target.value)}
                                        placeholder="EAAG..."
                                        description="Use a permanent system-user token, not a 24-hour test token."
                                        disabled={saving}
                                        className="md:col-span-2"
                                    />
                                    <InputSetting
                                        label="Default Template Name (optional)"
                                        value={templateName}
                                        onChange={(e) => setTemplateName(e.target.value)}
                                        placeholder="e.g. credential_delivery"
                                        description="Required for messages outside the 24-hour service window. Leave blank for free-form text only."
                                        disabled={saving}
                                    />
                                    <SelectSetting
                                        label="Template Language"
                                        value={templateLanguage}
                                        onValueChange={setTemplateLanguage}
                                        options={TEMPLATE_LANGUAGES}
                                        disabled={saving}
                                    />
                                </div>
                            </div>
                        )}

                        {provider === 'waha' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                <InputSetting
                                    label="WAHA Base URL"
                                    value={apiUrl}
                                    onChange={(e) => setApiUrl(e.target.value)}
                                    placeholder="http://waha:3000"
                                    description="Self-hosted WAHA gateway URL"
                                    disabled={saving}
                                />
                                <InputSetting
                                    label="Session"
                                    value={session}
                                    onChange={(e) => setSession(e.target.value)}
                                    placeholder="default"
                                    disabled={saving}
                                />
                                <PasswordField
                                    label="API Key (optional)"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="Bearer token if your gateway requires one"
                                    disabled={saving}
                                />
                            </div>
                        )}

                        {provider === 'custom' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                <InputSetting
                                    label="API Endpoint URL"
                                    value={apiUrl}
                                    onChange={(e) => setApiUrl(e.target.value)}
                                    placeholder="https://api.yourprovider.com/send"
                                    disabled={saving}
                                    className="md:col-span-2"
                                />
                                <PasswordField
                                    label="API Key"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="Your API key"
                                    disabled={saving}
                                />
                                <InputSetting
                                    label="From Number"
                                    value={fromNumber}
                                    onChange={(e) => setFromNumber(e.target.value)}
                                    placeholder="+1234567890"
                                    disabled={saving}
                                />
                            </div>
                        )}
                    </SettingSection>

                    <SettingSection
                        title="Notification Events"
                        description="WhatsApp messages are sent for the following events when enabled."
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[
                                'School onboarding (credential delivery)',
                                'User creation (credential delivery)',
                                'Password reset (admin-triggered)',
                                'Forgot password (self-service)',
                                'School onboarding approval / rejection',
                                'User request approval / rejection',
                                'PDF approved / rejected',
                                'Account deactivation',
                            ].map(event => (
                                <div key={event} className="flex items-center gap-2 text-sm text-foreground">
                                    <MessageCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                                    {event}
                                </div>
                            ))}
                        </div>
                    </SettingSection>

                    <SettingSection title="Test Connection" description="Send a test WhatsApp message to verify your configuration.">
                        <div className="flex items-center gap-3 max-w-md">
                            <InputSetting
                                label="Test Phone Number"
                                value={testNumber}
                                onChange={(e) => setTestNumber(e.target.value)}
                                placeholder="+919876543210"
                                description="Include country code. For Cloud API, the number must be on your approved list while in test mode."
                                disabled={saving || testing}
                                className="flex-1"
                            />
                        </div>
                        <Button
                            variant="outline"
                            onClick={handleTest}
                            disabled={saving || testing || !enabled}
                            className="mt-2 bg-background"
                        >
                            <Send className="w-4 h-4 mr-2" />
                            {testing ? 'Sending...' : 'Send Test Message'}
                        </Button>
                        {!enabled && (
                            <p className="text-xs text-muted-foreground mt-1">Enable WhatsApp integration and save first to test.</p>
                        )}
                    </SettingSection>

                    <div className="pt-6 flex justify-end">
                        <Button onClick={handleSave} disabled={saving} className="shadow-soft-sm">
                            <Save className="w-4 h-4 mr-2" />
                            {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default WhatsAppConfigurationTab;
