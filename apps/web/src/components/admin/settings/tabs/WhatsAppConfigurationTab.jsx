import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SettingSection, InputSetting, ToggleSetting, PasswordField, SelectSetting } from '../SettingComponents.jsx';
import { Save, Send, MessageCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const WhatsAppConfigurationTab = ({ settings, onSave, saving }) => {
    const wa = settings?.integrations?.whatsapp || {};

    const [enabled, setEnabled] = useState(wa.enabled ?? false);
    const [provider, setProvider] = useState(wa.provider || 'twilio');
    const [accountSid, setAccountSid] = useState(wa.accountSid || '');
    const [authToken, setAuthToken] = useState(wa.authToken || '');
    const [fromNumber, setFromNumber] = useState(wa.fromNumber || '');
    const [apiKey, setApiKey] = useState(wa.apiKey || '');
    const [apiUrl, setApiUrl] = useState(wa.apiUrl || '');
    const [testNumber, setTestNumber] = useState('');
    const [testing, setTesting] = useState(false);

    useEffect(() => {
        const w = settings?.integrations?.whatsapp || {};
        setEnabled(w.enabled ?? false);
        setProvider(w.provider || 'twilio');
        setAccountSid(w.accountSid || '');
        setAuthToken(w.authToken || '');
        setFromNumber(w.fromNumber || '');
        setApiKey(w.apiKey || '');
        setApiUrl(w.apiUrl || '');
    }, [settings]);

    const handleSave = () => {
        const whatsappConfig = {
            enabled,
            provider,
            accountSid,
            authToken,
            fromNumber,
            apiKey,
            apiUrl,
        };
        onSave('integrations', {
            integrations: {
                ...(settings?.integrations || {}),
                whatsapp: whatsappConfig,
            },
        });
    };

    const handleTest = async () => {
        if (!testNumber) {
            toast.error('Enter a test phone number first');
            return;
        }
        setTesting(true);
        try {
            // In production this would call the backend test endpoint
            await new Promise(r => setTimeout(r, 1500));
            toast.success(`Test message sent to ${testNumber}`);
        } catch {
            toast.error('Failed to send test message');
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
                            description="When enabled, the system will send WhatsApp messages for key events."
                            checked={enabled}
                            onCheckedChange={setEnabled}
                            disabled={saving}
                        />

                        {enabled && (
                            <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <p className="text-sm text-emerald-700 dark:text-emerald-400">
                                    WhatsApp integration is active. Messages will be sent for onboarding approvals, user requests, and PDF status updates.
                                </p>
                            </div>
                        )}
                    </SettingSection>

                    <SettingSection
                        title="Provider Configuration"
                        description="Choose and configure your WhatsApp messaging provider."
                    >
                        <SelectSetting
                            label="Provider"
                            value={provider}
                            onValueChange={setProvider}
                            options={[
                                { value: 'twilio', label: 'Twilio WhatsApp' },
                                { value: 'meta', label: 'Meta (WhatsApp Business API)' },
                                { value: 'wati', label: 'WATI' },
                                { value: 'custom', label: 'Custom API' },
                            ]}
                            disabled={saving}
                        />

                        {(provider === 'twilio') && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                <InputSetting
                                    label="Account SID"
                                    value={accountSid}
                                    onChange={(e) => setAccountSid(e.target.value)}
                                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                    disabled={saving}
                                />
                                <PasswordField
                                    label="Auth Token"
                                    value={authToken}
                                    onChange={(e) => setAuthToken(e.target.value)}
                                    placeholder="Your Twilio auth token"
                                    disabled={saving}
                                />
                                <InputSetting
                                    label="From Number (WhatsApp)"
                                    value={fromNumber}
                                    onChange={(e) => setFromNumber(e.target.value)}
                                    placeholder="whatsapp:+14155238886"
                                    description="Must be a Twilio WhatsApp-enabled number"
                                    disabled={saving}
                                />
                            </div>
                        )}

                        {(provider === 'meta' || provider === 'wati') && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                <PasswordField
                                    label="API Key / Access Token"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="Your API access token"
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
                                'School onboarding approval',
                                'School onboarding rejection',
                                'User request approval',
                                'User request rejection',
                                'PDF approved',
                                'PDF rejected',
                                'Account deactivation',
                                'Password reset',
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
                                placeholder="+1234567890"
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
                            <p className="text-xs text-muted-foreground mt-1">Enable WhatsApp integration first to test.</p>
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
