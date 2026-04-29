
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SettingSection, InputSetting, SelectSetting, ToggleSetting } from '../SettingComponents.jsx';
import { Save, Shield } from 'lucide-react';

const SecuritySettingsTab = ({ settings, onSave, saving }) => {
  const [secSettings, setSecSettings] = useState(settings.securitySettings || {});

  useEffect(() => {
    setSecSettings(settings.securitySettings || {});
  }, [settings]);

  const handleChange = (field, value) => {
    setSecSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave('securitySettings', secSettings);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="border-border/50 shadow-soft-sm">
        <CardContent className="p-6">
          <SettingSection title="Password Policy" description="Enforce strong passwords for all users.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <InputSetting 
                label="Minimum Password Length" 
                type="number"
                value={secSettings.passwordMinLength} 
                onChange={(e) => handleChange('passwordMinLength', parseInt(e.target.value))} 
                disabled={saving}
              />
              <InputSetting 
                label="Password Expiration (Days)" 
                type="number"
                description="Set to 0 to disable expiration."
                value={secSettings.passwordExpirationDays} 
                onChange={(e) => handleChange('passwordExpirationDays', parseInt(e.target.value))} 
                disabled={saving}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ToggleSetting 
                label="Require Uppercase" 
                checked={secSettings.requireUppercase}
                onCheckedChange={(v) => handleChange('requireUppercase', v)}
                disabled={saving}
              />
              <ToggleSetting 
                label="Require Numbers" 
                checked={secSettings.requireNumbers}
                onCheckedChange={(v) => handleChange('requireNumbers', v)}
                disabled={saving}
              />
              <ToggleSetting 
                label="Require Special Chars" 
                checked={secSettings.requireSpecialChars}
                onCheckedChange={(v) => handleChange('requireSpecialChars', v)}
                disabled={saving}
              />
            </div>
          </SettingSection>

          <SettingSection title="Session Management" description="Control user session lifecycles.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputSetting 
                label="Session Timeout (Minutes)" 
                type="number"
                value={secSettings.sessionTimeoutMinutes} 
                onChange={(e) => handleChange('sessionTimeoutMinutes', parseInt(e.target.value))} 
                disabled={saving}
              />
              <InputSetting 
                label="Max Concurrent Sessions" 
                type="number"
                value={secSettings.maxConcurrentSessions} 
                onChange={(e) => handleChange('maxConcurrentSessions', parseInt(e.target.value))} 
                disabled={saving}
              />
            </div>
          </SettingSection>

          <SettingSection title="Two-Factor Authentication" description="Configure 2FA requirements.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <SelectSetting 
                label="Allowed 2FA Method" 
                value={secSettings.twoFactorMethod} 
                onValueChange={(v) => handleChange('twoFactorMethod', v)}
                options={[
                  { value: 'totp', label: 'Authenticator App (TOTP)' },
                  { value: 'email', label: 'Email Codes' }
                ]}
                disabled={saving}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ToggleSetting 
                label="Require 2FA for Admins" 
                checked={secSettings.require2faAdmins}
                onCheckedChange={(v) => handleChange('require2faAdmins', v)}
                disabled={saving}
              />
              <ToggleSetting 
                label="Require 2FA for All Users" 
                checked={secSettings.require2faAll}
                onCheckedChange={(v) => handleChange('require2faAll', v)}
                disabled={saving}
              />
            </div>
          </SettingSection>

          <div className="pt-6 flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="shadow-soft-sm">
              <Shield className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save Security Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecuritySettingsTab;
