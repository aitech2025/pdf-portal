
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Shield, Key, Database, Monitor, Globe } from 'lucide-react';
import PageTransition from '@/components/PageTransition.jsx';
import { toast } from 'sonner';

const SettingsPage = () => {
  const [loading, setLoading] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      toast.success('Settings saved successfully');
      setLoading(false);
    }, 800);
  };

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-poppins font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage system preferences and configurations.</p>
        </div>

        <Tabs defaultValue="general" className="w-full">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-64 shrink-0">
              <TabsList className="flex flex-col h-auto bg-transparent items-stretch space-y-1">
                <TabsTrigger value="general" className="justify-start data-[state=active]:bg-primary/10 data-[state=active]:text-primary border-0 rounded-[var(--radius-md)] px-4">
                  <Monitor className="w-4 h-4 mr-3" /> General
                </TabsTrigger>
                <TabsTrigger value="notifications" className="justify-start data-[state=active]:bg-primary/10 data-[state=active]:text-primary border-0 rounded-[var(--radius-md)] px-4">
                  <Bell className="w-4 h-4 mr-3" /> Notifications
                </TabsTrigger>
                <TabsTrigger value="security" className="justify-start data-[state=active]:bg-primary/10 data-[state=active]:text-primary border-0 rounded-[var(--radius-md)] px-4">
                  <Shield className="w-4 h-4 mr-3" /> Security
                </TabsTrigger>
                <TabsTrigger value="api" className="justify-start data-[state=active]:bg-primary/10 data-[state=active]:text-primary border-0 rounded-[var(--radius-md)] px-4">
                  <Key className="w-4 h-4 mr-3" /> API Keys
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1">
              <TabsContent value="general" className="m-0 space-y-6">
                <Card className="shadow-soft-sm border-border/50">
                  <CardHeader>
                    <CardTitle>System Preferences</CardTitle>
                    <CardDescription>Basic configuration for your portal.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSave} className="space-y-6">
                      <div className="grid gap-2">
                        <Label htmlFor="portalName">Portal Name</Label>
                        <Input id="portalName" defaultValue="EduPortal Production" />
                      </div>
                      <div className="grid gap-2">
                        <Label>Language</Label>
                        <select className="flex h-11 w-full rounded-[var(--radius-md)] border border-input bg-background px-3 py-2 text-sm">
                          <option>English (US)</option>
                          <option>Spanish</option>
                          <option>French</option>
                        </select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Timezone</Label>
                        <select className="flex h-11 w-full rounded-[var(--radius-md)] border border-input bg-background px-3 py-2 text-sm">
                          <option>UTC (Coordinated Universal Time)</option>
                          <option>EST (Eastern Standard Time)</option>
                          <option>PST (Pacific Standard Time)</option>
                        </select>
                      </div>
                      <Button type="submit" variant="gradient" isLoading={loading}>Save Preferences</Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notifications" className="m-0 space-y-6">
                <Card className="shadow-soft-sm border-border/50">
                  <CardHeader>
                    <CardTitle>Notification Channels</CardTitle>
                    <CardDescription>Choose how you want to be alerted.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base font-semibold">Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">Receive daily digests and critical alerts via email.</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base font-semibold">In-App Alerts</Label>
                        <p className="text-sm text-muted-foreground">Show notifications in the dashboard bell icon.</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base font-semibold">Browser Push</Label>
                        <p className="text-sm text-muted-foreground">Enable desktop notifications when app is closed.</p>
                      </div>
                      <Switch />
                    </div>
                    <Button variant="gradient" onClick={handleSave} isLoading={loading}>Update Notifications</Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Other tabs would go here, simplified for scope */}
            </div>
          </div>
        </Tabs>
      </div>
    </PageTransition>
  );
};

export default SettingsPage;
