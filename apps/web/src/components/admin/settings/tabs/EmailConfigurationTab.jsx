
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SettingSection, InputSetting, ToggleSetting, PasswordField } from '../SettingComponents.jsx';
import { Save, Send, Zap, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import pb from '@/lib/apiClient';

const PRIMARY_PRESET = {
  smtpHost: 'smtp.resend.com',
  smtpPort: 465,
  enableSsl: true,
  enableTls: false,
  hint: 'Username is always "resend". Password is your Resend API key (starts with re_). From address must use a verified domain at resend.com/domains.',
};

const BREVO_PRESET = {
  smtp2Host: 'smtp-relay.brevo.com',
  smtp2Port: 587,
  enableSsl2: false,
  hint: 'Use your Brevo account email as username and a Brevo SMTP key as password. From address must be verified in your Brevo account (brevo.com/smtp).',
};

const EmailConfigurationTab = ({ settings, onSave, saving }) => {
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = (field, value) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
  };

  const applyResendPreset = () => {
    setLocalSettings(prev => ({
      ...prev,
      smtpHost: PRIMARY_PRESET.smtpHost,
      smtpPort: PRIMARY_PRESET.smtpPort,
      enableSsl: PRIMARY_PRESET.enableSsl,
      enableTls: PRIMARY_PRESET.enableTls,
    }));
    toast.info('Resend preset applied — fill in username, password, and from address, then save.');
  };

  const applyBrevoPreset = () => {
    setLocalSettings(prev => ({
      ...prev,
      smtp2Host: BREVO_PRESET.smtp2Host,
      smtp2Port: BREVO_PRESET.smtp2Port,
      enableSsl2: BREVO_PRESET.enableSsl2,
    }));
    toast.info('Brevo preset applied — fill in username, password, and from address, then save.');
  };

  const handleSave = () => {
    onSave('email', {
      emailProvider: localSettings.emailProvider,
      // Primary (Resend)
      smtpHost: localSettings.smtpHost,
      smtpPort: localSettings.smtpPort,
      smtpUsername: localSettings.smtpUsername,
      smtpPassword: localSettings.smtpPassword,
      emailFromAddress: localSettings.emailFromAddress,
      emailFromName: localSettings.emailFromName,
      enableTls: localSettings.enableTls,
      enableSsl: localSettings.enableSsl,
      // Brevo
      smtp2Host: localSettings.smtp2Host,
      smtp2Port: localSettings.smtp2Port,
      smtp2Username: localSettings.smtp2Username,
      smtp2Password: localSettings.smtp2Password,
      email2FromAddress: localSettings.email2FromAddress,
      email2FromName: localSettings.email2FromName,
      enableSsl2: localSettings.enableSsl2,
      // Active provider toggle
      activeEmailProvider: localSettings.activeEmailProvider ?? 'primary',
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

  const activeProvider = localSettings.activeEmailProvider ?? 'primary';

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Active provider selector */}
      <Card className="border-border/50 shadow-soft-sm">
        <CardContent className="p-6">
          <SettingSection
            title="Active Email Provider"
            description="Choose which SMTP provider is used for all outgoing emails. Both configurations are saved simultaneously — switch instantly without re-entering credentials."
          >
            <div className="flex flex-wrap gap-3 mt-2">
              <button
                type="button"
                onClick={() => handleChange('activeEmailProvider', 'primary')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  activeProvider === 'primary'
                    ? 'bg-primary text-primary-foreground border-primary shadow-soft-sm'
                    : 'bg-background text-foreground border-border hover:border-primary/50'
                }`}
              >
                {activeProvider === 'primary' && <CheckCircle2 className="w-4 h-4" />}
                Primary (Resend)
                {activeProvider === 'primary' && (
                  <Badge variant="secondary" className="ml-1 text-xs bg-primary-foreground/20 text-primary-foreground border-0">
                    Active
                  </Badge>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleChange('activeEmailProvider', 'brevo')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  activeProvider === 'brevo'
                    ? 'bg-primary text-primary-foreground border-primary shadow-soft-sm'
                    : 'bg-background text-foreground border-border hover:border-primary/50'
                }`}
              >
                {activeProvider === 'brevo' && <CheckCircle2 className="w-4 h-4" />}
                Brevo
                {activeProvider === 'brevo' && (
                  <Badge variant="secondary" className="ml-1 text-xs bg-primary-foreground/20 text-primary-foreground border-0">
                    Active
                  </Badge>
                )}
              </button>
            </div>
          </SettingSection>
        </CardContent>
      </Card>

      {/* Primary SMTP (Resend) */}
      <Card className={`border-2 shadow-soft-sm transition-colors ${activeProvider === 'primary' ? 'border-primary/40' : 'border-border/50'}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-semibold text-foreground">Primary SMTP (Resend)</h3>
              <p className="text-sm text-muted-foreground">Resend transactional email service configuration.</p>
            </div>
            {activeProvider === 'primary' && (
              <Badge className="bg-primary/10 text-primary border border-primary/20">Active</Badge>
            )}
          </div>

          <div className="flex gap-2 mb-3">
            <Button type="button" variant="outline" size="sm" onClick={applyResendPreset} disabled={saving} className="bg-background">
              <Zap className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
              Apply Resend Defaults
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mb-5">{PRIMARY_PRESET.hint}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <InputSetting
              label="SMTP Host"
              value={localSettings.smtpHost}
              onChange={(e) => handleChange('smtpHost', e.target.value)}
              placeholder="smtp.resend.com"
              disabled={saving}
            />
            <InputSetting
              label="SMTP Port"
              type="number"
              value={localSettings.smtpPort}
              onChange={(e) => handleChange('smtpPort', parseInt(e.target.value))}
              placeholder="465"
              disabled={saving}
            />
            <InputSetting
              label="SMTP Username"
              value={localSettings.smtpUsername}
              onChange={(e) => handleChange('smtpUsername', e.target.value)}
              disabled={saving}
            />
            <PasswordField
              label="SMTP Password / API Key"
              value={localSettings.smtpPassword}
              onChange={(e) => handleChange('smtpPassword', e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <ToggleSetting
              label="Enable TLS"
              checked={!!localSettings.enableTls}
              onCheckedChange={(v) => handleChange('enableTls', v)}
              disabled={saving}
            />
            <ToggleSetting
              label="Enable SSL"
              checked={!!localSettings.enableSsl}
              onCheckedChange={(v) => handleChange('enableSsl', v)}
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Brevo SMTP */}
      <Card className={`border-2 shadow-soft-sm transition-colors ${activeProvider === 'brevo' ? 'border-primary/40' : 'border-border/50'}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-semibold text-foreground">Brevo SMTP</h3>
              <p className="text-sm text-muted-foreground">Brevo (formerly Sendinblue) transactional email configuration.</p>
            </div>
            {activeProvider === 'brevo' && (
              <Badge className="bg-primary/10 text-primary border border-primary/20">Active</Badge>
            )}
          </div>

          <div className="flex gap-2 mb-3">
            <Button type="button" variant="outline" size="sm" onClick={applyBrevoPreset} disabled={saving} className="bg-background">
              <Zap className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
              Apply Brevo Defaults
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mb-5">{BREVO_PRESET.hint}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputSetting
              label="From Address"
              type="email"
              value={localSettings.email2FromAddress}
              onChange={(e) => handleChange('email2FromAddress', e.target.value)}
              disabled={saving}
            />
            <InputSetting
              label="From Name"
              value={localSettings.email2FromName}
              onChange={(e) => handleChange('email2FromName', e.target.value)}
              disabled={saving}
            />
            <InputSetting
              label="SMTP Host"
              value={localSettings.smtp2Host}
              onChange={(e) => handleChange('smtp2Host', e.target.value)}
              placeholder="smtp-relay.brevo.com"
              disabled={saving}
            />
            <InputSetting
              label="SMTP Port"
              type="number"
              value={localSettings.smtp2Port}
              onChange={(e) => handleChange('smtp2Port', parseInt(e.target.value))}
              placeholder="587"
              disabled={saving}
            />
            <InputSetting
              label="SMTP Username"
              value={localSettings.smtp2Username}
              onChange={(e) => handleChange('smtp2Username', e.target.value)}
              disabled={saving}
            />
            <PasswordField
              label="SMTP Password / API Key"
              value={localSettings.smtp2Password}
              onChange={(e) => handleChange('smtp2Password', e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <ToggleSetting
              label="Enable SSL"
              checked={!!localSettings.enableSsl2}
              onCheckedChange={(v) => handleChange('enableSsl2', v)}
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Footer actions */}
      <Card className="border-border/50 shadow-soft-sm">
        <CardContent className="p-6">
          <div className="flex justify-between items-center">
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
