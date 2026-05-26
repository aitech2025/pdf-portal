
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SettingSection, InputSetting, SelectSetting, ToggleSetting, PasswordField } from '../SettingComponents.jsx';
import { Save, Send, Zap } from 'lucide-react';
import { toast } from 'sonner';
import pb from '@/lib/apiClient';

const PROVIDER_PRESETS = {
  hostinger: {
    label: 'Hostinger Email',
    smtpHost: 'smtp.hostinger.com',
    smtpPort: 465,
    enableSSL: true,
    enableTLS: false,
    hint: 'Use the full email address as the username and the mailbox password (set in Hostinger hPanel → Emails).',
  },
  gmail: {
    label: 'Gmail (App Password)',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    enableSSL: false,
    enableTLS: true,
    hint: 'Generate an App Password at myaccount.google.com → Security → 2-Step Verification → App passwords.',
  },
  outlook: {
    label: 'Outlook / Microsoft 365',
    smtpHost: 'smtp.office365.com',
    smtpPort: 587,
    enableSSL: false,
    enableTLS: true,
    hint: 'Account must have SMTP AUTH enabled by the tenant admin.',
  },
  ses: {
    label: 'Amazon SES (SMTP)',
    smtpHost: 'email-smtp.us-east-1.amazonaws.com',
    smtpPort: 587,
    enableSSL: false,
    enableTLS: true,
    hint: 'Replace region in host if not us-east-1. Use the SMTP credentials, not the IAM access key.',
  },
};

const EmailConfigurationTab = ({ settings, onSave, saving }) => {
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = (field, value) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
  };

  const applyPreset = (key) => {
    const preset = PROVIDER_PRESETS[key];
    if (!preset) return;
    setLocalSettings(prev => ({
      ...prev,
      emailProvider: 'smtp',
      smtpHost: preset.smtpHost,
      smtpPort: preset.smtpPort,
      enableSSL: preset.enableSSL,
      enableTLS: preset.enableTLS,
    }));
    toast.info(`${preset.label} preset applied — fill in username, password, and from address, then save.`);
  };

  const handleSave = () => {
    onSave('email', {
      emailProvider: localSettings.emailProvider,
      smtpHost: localSettings.smtpHost,
      smtpPort: localSettings.smtpPort,
      smtpUsername: localSettings.smtpUsername,
      smtpPassword: localSettings.smtpPassword,
      emailFromAddress: localSettings.emailFromAddress,
      emailFromName: localSettings.emailFromName,
      enableTLS: localSettings.enableTLS,
      enableSSL: localSettings.enableSSL
    });
  };

  const handleTestEmail = async () => {
    if (!settings?.id) {
      toast.error('Save system settings first');
      return;
    }
    const to = window.prompt('Enter recipient email for test message:', localSettings.supportEmail || localSettings.emailFromAddress || '');
    if (!to) return;
    try {
      toast.info('Sending test email...');
      const res = await pb.fetch(`/systemSettings/${settings.id}/test-email`, 'POST', { to });
      if (res?.ok) {
        toast.success(`Test email delivered to ${to}`);
      } else {
        toast.error(res?.message || 'Delivery failed — check SMTP credentials');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to send test email');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="border-border/50 shadow-soft-sm">
        <CardContent className="p-6">
          <SettingSection title="Email Provider" description="Configure how the system sends emails.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SelectSetting 
                label="Provider" 
                value={localSettings.emailProvider} 
                onValueChange={(v) => handleChange('emailProvider', v)}
                options={[
                  { value: 'smtp', label: 'Nodemailer SMTP' }
                ]}
                disabled={saving}
              />
              <div className="hidden md:block"></div>
              
              <InputSetting 
                label="From Address" 
                type="email"
                value={localSettings.emailFromAddress} 
                onChange={(e) => handleChange('emailFromAddress', e.target.value)} 
                disabled={saving}
              />
              <InputSetting 
                label="From Name" 
                value={localSettings.emailFromName} 
                onChange={(e) => handleChange('emailFromName', e.target.value)} 
                disabled={saving}
              />
            </div>
          </SettingSection>

          {localSettings.emailProvider === 'smtp' && (
            <SettingSection title="Quick Presets" description="Apply provider-specific SMTP defaults, then fill in your credentials below.">
              <div className="flex flex-wrap gap-2">
                {Object.entries(PROVIDER_PRESETS).map(([key, preset]) => (
                  <Button
                    key={key}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset(key)}
                    disabled={saving}
                    className="bg-background"
                  >
                    <Zap className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                    {preset.label}
                  </Button>
                ))}
              </div>
              {localSettings.smtpHost && (
                <p className="text-xs text-muted-foreground mt-3">
                  {Object.values(PROVIDER_PRESETS).find(p => p.smtpHost === localSettings.smtpHost)?.hint}
                </p>
              )}
            </SettingSection>
          )}

          {localSettings.emailProvider === 'smtp' && (
            <SettingSection title="SMTP Configuration" description="Enter your SMTP server details.">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputSetting 
                  label="SMTP Host" 
                  value={localSettings.smtpHost} 
                  onChange={(e) => handleChange('smtpHost', e.target.value)} 
                  placeholder="smtp.example.com"
                  disabled={saving}
                />
                <InputSetting 
                  label="SMTP Port" 
                  type="number"
                  value={localSettings.smtpPort} 
                  onChange={(e) => handleChange('smtpPort', parseInt(e.target.value))} 
                  placeholder="587"
                  disabled={saving}
                />
                <InputSetting 
                  label="SMTP Username" 
                  value={localSettings.smtpUsername} 
                  onChange={(e) => handleChange('smtpUsername', e.target.value)} 
                  disabled={saving}
                />
                <PasswordField 
                  label="SMTP Password" 
                  value={localSettings.smtpPassword} 
                  onChange={(e) => handleChange('smtpPassword', e.target.value)} 
                  disabled={saving}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <ToggleSetting 
                  label="Enable TLS" 
                  checked={localSettings.enableTLS}
                  onCheckedChange={(v) => handleChange('enableTLS', v)}
                  disabled={saving}
                />
                <ToggleSetting 
                  label="Enable SSL" 
                  checked={localSettings.enableSSL}
                  onCheckedChange={(v) => handleChange('enableSSL', v)}
                  disabled={saving}
                />
              </div>
            </SettingSection>
          )}

          <div className="pt-6 flex justify-between items-center">
            <Button variant="outline" onClick={handleTestEmail} disabled={saving} className="bg-background">
              <Send className="w-4 h-4 mr-2" /> Send Test Email
            </Button>
            <Button onClick={handleSave} disabled={saving} className="shadow-soft-sm">
              <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailConfigurationTab;
