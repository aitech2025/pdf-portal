
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SettingSection, ToggleSetting } from '../SettingComponents.jsx';
import { Save } from 'lucide-react';

const FeatureFlagsTab = ({ settings, onSave, saving }) => {
  const [flags, setFlags] = useState(settings.featureFlags || {});

  useEffect(() => {
    setFlags(settings.featureFlags || {});
  }, [settings]);

  const handleChange = (field, value) => {
    setFlags(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave('featureFlags', flags);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="border-border/50 shadow-soft-sm">
        <CardContent className="p-6">
          <SettingSection title="Core Features" description="Enable or disable major platform capabilities.">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ToggleSetting 
                label="User Registration" 
                description="Allow new users to sign up independently."
                checked={flags.userRegistration}
                onCheckedChange={(v) => handleChange('userRegistration', v)}
                disabled={saving}
              />
              <ToggleSetting 
                label="Social Login" 
                description="Allow login via Google, GitHub, etc."
                checked={flags.socialLogin}
                onCheckedChange={(v) => handleChange('socialLogin', v)}
                disabled={saving}
              />
              <ToggleSetting 
                label="Two-Factor Authentication" 
                description="Enable 2FA support for user accounts."
                checked={flags.twoFactorAuth}
                onCheckedChange={(v) => handleChange('twoFactorAuth', v)}
                disabled={saving}
              />
              <ToggleSetting 
                label="Advanced Search" 
                description="Enable full-text search across document contents."
                checked={flags.advancedSearch}
                onCheckedChange={(v) => handleChange('advancedSearch', v)}
                disabled={saving}
              />
            </div>
          </SettingSection>

          <SettingSection title="Content Features" description="Manage document and content capabilities.">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ToggleSetting 
                label="PDF Annotations" 
                description="Allow users to highlight and comment on PDFs."
                checked={flags.pdfAnnotations}
                onCheckedChange={(v) => handleChange('pdfAnnotations', v)}
                disabled={saving}
              />
              <ToggleSetting 
                label="PDF Sharing" 
                description="Allow users to generate shareable links."
                checked={flags.pdfSharing}
                onCheckedChange={(v) => handleChange('pdfSharing', v)}
                disabled={saving}
              />
              <ToggleSetting 
                label="Bulk Upload" 
                description="Enable the bulk upload interface for admins."
                checked={flags.bulkUpload}
                onCheckedChange={(v) => handleChange('bulkUpload', v)}
                disabled={saving}
              />
            </div>
          </SettingSection>

          <SettingSection title="Developer & System" description="Advanced system capabilities.">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ToggleSetting 
                label="API Access" 
                description="Allow generation of API keys for external access."
                checked={flags.apiAccess}
                onCheckedChange={(v) => handleChange('apiAccess', v)}
                disabled={saving}
              />
              <ToggleSetting 
                label="Webhooks" 
                description="Enable outbound webhooks for system events."
                checked={flags.webhooks}
                onCheckedChange={(v) => handleChange('webhooks', v)}
                disabled={saving}
              />
            </div>
          </SettingSection>

          <div className="pt-6 flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="shadow-soft-sm">
              <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeatureFlagsTab;
