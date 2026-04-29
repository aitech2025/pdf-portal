
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import PageTransition from '@/components/PageTransition.jsx';
import PageHeader from '@/components/PageHeader.jsx';
import { User, Lock, Bell, ShieldAlert } from 'lucide-react';

const SchoolSettings = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const handleSave = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success('Settings saved successfully');
    }, 800);
  };

  return (
    <PageTransition>
      <PageHeader 
        title="Account Settings" 
        description="Manage your profile, security preferences, and notifications."
        breadcrumbs={[{ label: 'Settings' }]}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Settings Navigation */}
        <div className="flex flex-col space-y-2">
          <Button 
            variant={activeTab === 'profile' ? 'secondary' : 'ghost'} 
            className={`justify-start font-medium ${activeTab === 'profile' ? 'bg-muted/80' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('profile')}
          >
            <User className="w-4 h-4 mr-3" /> Profile
          </Button>
          <Button 
            variant={activeTab === 'security' ? 'secondary' : 'ghost'} 
            className={`justify-start font-medium ${activeTab === 'security' ? 'bg-muted/80' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('security')}
          >
            <Lock className="w-4 h-4 mr-3" /> Security
          </Button>
          <Button 
            variant={activeTab === 'notifications' ? 'secondary' : 'ghost'} 
            className={`justify-start font-medium ${activeTab === 'notifications' ? 'bg-muted/80' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('notifications')}
          >
            <Bell className="w-4 h-4 mr-3" /> Notifications
          </Button>
        </div>

        {/* Settings Content */}
        <div className="md:col-span-3 space-y-6">
          {activeTab === 'profile' && (
            <Card className="shadow-soft border-border/50 animate-in fade-in duration-300">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal and contact details.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="flex items-center gap-6 pb-6 border-b border-border/50">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                      {currentUser?.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <Button type="button" variant="outline" size="sm">Change Avatar</Button>
                      <p className="text-xs text-muted-foreground mt-2">JPG, GIF or PNG. Max size of 2MB.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" defaultValue={currentUser?.name || ''} className="bg-background" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input id="email" type="email" defaultValue={currentUser?.email || ''} readOnly className="bg-muted cursor-not-allowed opacity-70" />
                      <p className="text-xs text-muted-foreground">Email changes require admin approval.</p>
                    </div>
                  </div>
                  
                  <div className="pt-4 flex justify-end">
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <Card className="shadow-soft border-border/50">
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>Ensure your account is using a long, random password to stay secure.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSave} className="space-y-5">
                    <div className="space-y-2 max-w-md">
                      <Label>Current Password</Label>
                      <Input type="password" required className="bg-background" />
                    </div>
                    <div className="space-y-2 max-w-md">
                      <Label>New Password</Label>
                      <Input type="password" required className="bg-background" />
                    </div>
                    <div className="space-y-2 max-w-md">
                      <Label>Confirm New Password</Label>
                      <Input type="password" required className="bg-background" />
                    </div>
                    <Button type="submit" disabled={loading}>Update Password</Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="shadow-soft border-destructive/20 bg-destructive/5">
                <CardHeader>
                  <CardTitle className="text-destructive flex items-center"><ShieldAlert className="w-5 h-5 mr-2" /> Danger Zone</CardTitle>
                  <CardDescription>Irreversible actions for your account.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    If you need to permanently deactivate your institution's access, please contact the system administrator.
                  </p>
                  <Button variant="destructive" onClick={() => toast.info('Please contact admin@eduportal.com for deactivation.')}>
                    Request Account Deactivation
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'notifications' && (
            <Card className="shadow-soft border-border/50 animate-in fade-in duration-300">
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose what updates you want to receive.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between py-3 border-b border-border/50">
                  <div className="space-y-0.5">
                    <Label className="text-base">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive updates about new content and approvals via email.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between py-3 border-b border-border/50">
                  <div className="space-y-0.5">
                    <Label className="text-base">WhatsApp Alerts</Label>
                    <p className="text-sm text-muted-foreground">Get instant messages for urgent administrative updates.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between py-3">
                  <div className="space-y-0.5">
                    <Label className="text-base">Marketing Communications</Label>
                    <p className="text-sm text-muted-foreground">Receive newsletters and feature updates.</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default SchoolSettings;
