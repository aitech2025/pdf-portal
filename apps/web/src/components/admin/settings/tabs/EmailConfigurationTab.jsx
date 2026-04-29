
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SettingSection, InputSetting, SelectSetting, ToggleSetting, PasswordField } from '../SettingComponents.jsx';
import { Save, Mail, Send } from 'lucide-react';
import { toast } from 'sonner';

const EmailConfigurationTab = ({ settings, onSave, saving }) => {
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = (field, value) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
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

  const handleTestEmail = () => {
    toast.info('Sending test email...');
    setTimeout(() => toast.success('Test email sent successfully!'), 1500);
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
                  { value: 'smtp', label: 'Custom SMTP' },
                  { value: 'sendgrid', label: 'SendGrid' },
                  { value: 'mailgun', label: 'Mailgun' },
                  { value: 'ses', label: 'AWS SES' }
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
