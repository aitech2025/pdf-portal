
import React, { useState, useEffect } from 'react';
import {
  Settings, Shield, Mail, ToggleLeft, Database, Activity,
  Server, HardDrive, RefreshCw, MessageCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import PageTransition from '@/components/PageTransition.jsx';
import { useSystemSettings } from '@/hooks/useSystemSettings.js';
import SystemHealthItem from '@/components/dashboard/SystemHealthItem.jsx';

// Tabs
import GeneralSettingsTab from '@/components/admin/settings/tabs/GeneralSettingsTab.jsx';
import EmailConfigurationTab from '@/components/admin/settings/tabs/EmailConfigurationTab.jsx';
import FeatureFlagsTab from '@/components/admin/settings/tabs/FeatureFlagsTab.jsx';
import SecuritySettingsTab from '@/components/admin/settings/tabs/SecuritySettingsTab.jsx';
import WhatsAppConfigurationTab from '@/components/admin/settings/tabs/WhatsAppConfigurationTab.jsx';

const SystemHealthTab = () => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = () => {
    setLoading(true);
    // Mocking real-time system health metrics
    setTimeout(() => {
      setHealthData({
        database: { status: 'success', value: 'Connected', ping: '24ms' },
        api: { status: 'success', value: 'Healthy', responseTime: '45ms' },
        storage: { status: 'warning', value: '450 GB / 1 TB', progress: 45 },
        memory: { status: 'success', value: '2.4 GB / 8 GB', progress: 30 },
        cpu: { status: 'success', value: 'Load Avg: 0.4', progress: 15 },
        uptime: { status: 'success', value: '99.99%', details: '30 days, 14 hours' },
        cache: { status: 'success', value: 'Hit Rate: 94%', progress: 94 },
        workers: { status: 'success', value: 'All Running', details: '4 active' }
      });
      setLoading(false);
    }, 800);
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground font-poppins">System Health & Metrics</h3>
          <p className="text-sm text-muted-foreground">Real-time monitoring of application infrastructure.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchHealth} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loading && !healthData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SystemHealthItem
            label="Database Connection"
            value={healthData.database.value}
            status={healthData.database.status}
          />
          <SystemHealthItem
            label="API Response Time"
            value={healthData.api.responseTime}
            status={healthData.api.status}
          />
          <SystemHealthItem
            label="System Uptime"
            value={healthData.uptime.value}
            status={healthData.uptime.status}
          />
          <SystemHealthItem
            label="Background Workers"
            value={healthData.workers.value}
            status={healthData.workers.status}
          />
          <SystemHealthItem
            label="Storage Usage"
            value={healthData.storage.value}
            status={healthData.storage.status}
            type="progress"
            progressValue={healthData.storage.progress}
          />
          <SystemHealthItem
            label="Memory Usage"
            value={healthData.memory.value}
            status={healthData.memory.status}
            type="progress"
            progressValue={healthData.memory.progress}
          />
          <SystemHealthItem
            label="CPU Load"
            value={healthData.cpu.value}
            status={healthData.cpu.status}
            type="progress"
            progressValue={healthData.cpu.progress}
          />
          <SystemHealthItem
            label="Cache Performance"
            value={healthData.cache.value}
            status={healthData.cache.status}
            type="progress"
            progressValue={healthData.cache.progress}
          />
        </div>
      )}
    </div>
  );
};

const SystemSettings = () => {
  const { settings, loading, saving, updateSection, refresh } = useSystemSettings();
  const [activeTab, setActiveTab] = useState('general');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <PageTransition className="pb-24 max-w-7xl mx-auto">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-poppins font-bold text-foreground">System Settings</h1>
          <p className="text-muted-foreground mt-1">Configure global application parameters and monitor health.</p>
        </div>
        <Button variant="outline" onClick={refresh} className="bg-card shadow-soft-sm">
          <RefreshCw className="w-4 h-4 mr-2" /> Reload Settings
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto pb-2 mb-4 scrollbar-hide">
          <TabsList className="bg-muted/30 p-1 h-12 inline-flex min-w-full sm:min-w-0">
            <TabsTrigger value="general" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
              <Settings className="w-4 h-4 mr-2" /> General
            </TabsTrigger>
            <TabsTrigger value="email" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
              <Mail className="w-4 h-4 mr-2" /> Email
            </TabsTrigger>
            <TabsTrigger value="features" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
              <ToggleLeft className="w-4 h-4 mr-2" /> Features
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
              <Shield className="w-4 h-4 mr-2" /> Security
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
              <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
            </TabsTrigger>
            <TabsTrigger value="health" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
              <Activity className="w-4 h-4 mr-2" /> System Health
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="mt-6">
          <TabsContent value="general" className="m-0 outline-none">
            <GeneralSettingsTab settings={settings} onSave={updateSection} saving={saving} />
          </TabsContent>

          <TabsContent value="email" className="m-0 outline-none">
            <EmailConfigurationTab settings={settings} onSave={updateSection} saving={saving} />
          </TabsContent>

          <TabsContent value="features" className="m-0 outline-none">
            <FeatureFlagsTab settings={settings} onSave={updateSection} saving={saving} />
          </TabsContent>

          <TabsContent value="security" className="m-0 outline-none">
            <SecuritySettingsTab settings={settings} onSave={updateSection} saving={saving} />
          </TabsContent>

          <TabsContent value="whatsapp" className="m-0 outline-none">
            <WhatsAppConfigurationTab settings={settings} onSave={updateSection} saving={saving} />
          </TabsContent>

          <TabsContent value="health" className="m-0 outline-none">
            <SystemHealthTab />
          </TabsContent>
        </div>
      </Tabs>
    </PageTransition>
  );
};

export default SystemSettings;
