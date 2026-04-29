import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { SettingSection, InputSetting, ToggleSetting } from '../SettingComponents.jsx';
import { Save, RotateCcw } from 'lucide-react';
import pb from '@/lib/apiClient.js';
import { toast } from 'sonner';

const GeneralSettingsTab = ({ settings, onSave, saving }) => {
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = (field, value) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    // Save system settings
    await onSave('general', {
      appName: localSettings.appName,
      appDescription: localSettings.appDescription,
      supportEmail: localSettings.supportEmail,
      supportPhone: localSettings.supportPhone,
      timezone: 'Asia/Kolkata',
      language: localSettings.language,
      maintenanceMode: localSettings.maintenanceMode,
      maintenanceMessage: localSettings.maintenanceMessage,
    });

    // Also sync maintenance mode to the maintenanceMode table
    try {
      const token = pb.authStore.token;
      const mmRes = await fetch('/api/maintenanceMode', { headers: { Authorization: `Bearer ${token}` } });
      const mmData = await mmRes.json();
      if (mmData.items && mmData.items.length > 0) {
        const mm = mmData.items[0];
        await fetch(`/api/maintenanceMode/${mm.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            isEnabled: localSettings.maintenanceMode,
            message: localSettings.maintenanceMessage || '',
          }),
        });
      }
    } catch (e) {
      console.error('Failed to sync maintenance mode:', e);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="border-border/50 shadow-soft-sm">
        <CardContent className="p-6">
          <SettingSection title="Application Details" description="Basic information about your platform.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputSetting
                label="Application Name"
                value={localSettings.appName}
                onChange={(e) => handleChange('appName', e.target.value)}
                disabled={saving}
              />
              <InputSetting
                label="Support Email"
                type="email"
                value={localSettings.supportEmail}
                onChange={(e) => handleChange('supportEmail', e.target.value)}
                disabled={saving}
              />
              <div className="col-span-1 md:col-span-2 space-y-2">
                <Label>Application Description</Label>
                <Textarea
                  value={localSettings.appDescription}
                  onChange={(e) => handleChange('appDescription', e.target.value)}
                  className="bg-background max-w-2xl"
                  disabled={saving}
                />
              </div>
            </div>
          </SettingSection>

          <SettingSection title="Localization" description="Platform timezone is fixed to IST (India Standard Time).">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
              <span className="text-sm font-medium text-foreground">Timezone:</span>
              <span className="text-sm text-muted-foreground">Asia/Kolkata — IST (UTC+5:30)</span>
            </div>
          </SettingSection>

          <SettingSection title="Maintenance Mode" description="When enabled, only platform admins can log in. All school users will see the maintenance page.">
            <ToggleSetting
              label="Enable Maintenance Mode"
              description="Blocks school_admin, school_viewer, and teacher logins. Platform admins can still access the system."
              checked={localSettings.maintenanceMode}
              onCheckedChange={(v) => handleChange('maintenanceMode', v)}
              disabled={saving}
            />
            {localSettings.maintenanceMode && (
              <div className="mt-4 space-y-2 animate-fade-in">
                <Label>Maintenance Message</Label>
                <Textarea
                  value={localSettings.maintenanceMessage}
                  onChange={(e) => handleChange('maintenanceMessage', e.target.value)}
                  className="bg-background max-w-2xl"
                  disabled={saving}
                  placeholder="We'll be back shortly..."
                />
              </div>
            )}
          </SettingSection>

          <div className="pt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setLocalSettings(settings)} disabled={saving} className="bg-background">
              <RotateCcw className="w-4 h-4 mr-2" /> Reset
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

export default GeneralSettingsTab;
