import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SettingSection, InputSetting, ToggleSetting, PasswordField, SelectSetting } from '../SettingComponents.jsx';
import { Save, Send, MessageCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import pb from '@/lib/apiClient';

const WhatsAppConfigurationTab = ({ settings, onSave, saving }) => {
    const wa = settings?.integrations?.whatsapp || {};

    const [enabled, setEnabled] = useState(wa.enabled ?? false);
    const [provider, setProvider] = useState(wa.provider || 'waha');
    const [fromNumber, setFromNumber] = useState(wa.fromNumber || '');
    const [apiKey, setApiKey] = useState(wa.apiKey || '');
    const [apiUrl, setApiUrl] = useState(wa.apiUrl || '');
    const [session, setSession] = useState(wa.session || 'default');
    const [testNumber, setTestNumber] = useState('');
    const [testing, setTesting] = useState(false);

    useEffect(() => {
        const w = settings?.integrations?.whatsapp || {};
        setEnabled(w.enabled ?? false);
        setProvider(w.provider || 'waha');
        setFromNumber(w.fromNumber || '');
        setApiKey(w.apiKey || '');
        setApiUrl(w.apiUrl || '');
        setSession(w.session || 'default');
    }, [settings]);

    const handleSave = () => {
        const whatsappConfig = {
            enabled,
            provider,
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
            await pb.fetch(`/systemSettings/${settings.id}/test-whatsapp`, 'POST', { to: testNumber });
            toast.success(`Test message sent to ${testNumber}`);
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
                                { value: 'waha', label: 'WAHA self-hosted API' },
                                { value: 'custom', label: 'Custom HTTP gateway' },
                            ]}
                            disabled={saving}
                        />

                        {provider === 'waha' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                <InputSetting
                                    label="WAHA Base URL"
                                    value={apiUrl}
                                    onChange={(e) => setApiUrl(e.target.value)}
                                    placeholder="http://localhost:3000"
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
                                    label="API Key (Optional)"
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
