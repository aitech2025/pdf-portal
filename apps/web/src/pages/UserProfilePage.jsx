import React, { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { User, Mail, Shield, Camera, Lock, Phone, Eye, EyeOff, MapPin, Bell, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import PageTransition from '@/components/PageTransition.jsx';

const UserProfilePage = () => {
  const { currentUser } = useAuth();
  const fileInputRef = useRef(null);

  // Profile fields
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [mobile, setMobile] = useState(currentUser?.mobileNumber || currentUser?.mobile_number || '');
  const [address, setAddress] = useState(currentUser?.address || '');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Notification prefs
  const notifPrefs = currentUser?.notification_preferences || {};
  const [emailNotif, setEmailNotif] = useState(notifPrefs.email !== false);
  const [whatsappNotif, setWhatsappNotif] = useState(notifPrefs.whatsapp === true);
  const [notifLoading, setNotifLoading] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const body = { name, mobile_number: mobile, address };
      if (avatarFile) {
        const fd = new FormData();
        fd.append('name', name);
        fd.append('mobile_number', mobile);
        fd.append('address', address);
        fd.append('avatar', avatarFile);
        await pb.collection('users').update(currentUser.id, fd);
      } else {
        await pb.collection('users').update(currentUser.id, body);
      }
      if (email !== currentUser.email) {
        await pb.collection('users').update(currentUser.id, { email });
      }
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setNotifLoading(true);
    try {
      await pb.collection('users').update(currentUser.id, {
        notification_preferences: { email: emailNotif, whatsapp: whatsappNotif },
      });
      toast.success('Notification preferences saved');
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setNotifLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setPasswordLoading(true);
    try {
      const token = pb.authStore.token;
      const resp = await fetch(`/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ oldPassword: currentPassword, newPassword }),
      });
      if (!resp.ok) throw new Error((await resp.json()).detail || 'Failed');
      toast.success('Password changed');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const avatarSrc = avatarPreview || (currentUser?.avatar ? `/uploads/${currentUser.avatar}` : null);
  const initials = (currentUser?.name || currentUser?.email || 'U').charAt(0).toUpperCase();

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-poppins font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your account information and security.</p>
        </div>

        {/* Personal Information */}
        <Card className="shadow-soft-md border-border/50">
          <CardHeader><CardTitle className="text-lg">Personal Information</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-5">
              {/* Avatar */}
              <div className="flex items-center gap-5">
                <div
                  className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold relative overflow-hidden group cursor-pointer shrink-0 border-2 border-border"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {avatarSrc
                    ? <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
                    : <span>{initials}</span>}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                <div>
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Camera className="w-4 h-4 mr-2" /> Change Photo
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG or GIF. Max 5MB.</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="name" value={name} onChange={e => setName(e.target.value)} className="pl-9" placeholder="Your full name" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="mobile" value={mobile} onChange={e => setMobile(e.target.value)} className="pl-9" placeholder="+1 (555) 000-0000" />
                  </div>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="pl-9" placeholder="you@example.com" />
                  </div>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="address" value={address} onChange={e => setAddress(e.target.value)} className="pl-9" placeholder="123 Main St, City, State" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Account Role</Label>
                  <div className="flex items-center gap-2 h-10 px-3 rounded-md bg-muted/50 border border-border text-sm">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                    <span className="capitalize text-foreground">{currentUser?.role || 'User'}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={profileLoading}>
                  {profileLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card className="shadow-soft-md border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="w-5 h-5 text-muted-foreground" /> Notification Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card/50">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-foreground">Email Notifications</p>
                  <p className="text-xs text-muted-foreground">Receive updates and alerts via email</p>
                </div>
              </div>
              <Switch checked={emailNotif} onCheckedChange={setEmailNotif} />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card/50">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-emerald-500" />
                <div>
                  <p className="text-sm font-medium text-foreground">WhatsApp Notifications</p>
                  <p className="text-xs text-muted-foreground">Receive updates via WhatsApp messages</p>
                </div>
              </div>
              <Switch checked={whatsappNotif} onCheckedChange={setWhatsappNotif} />
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={handleSaveNotifications} disabled={notifLoading}>
                {notifLoading ? 'Saving...' : 'Save Preferences'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card className="shadow-soft-md border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="w-5 h-5 text-muted-foreground" /> Change Password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPwd">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPwd" type={showCurrent ? 'text' : 'password'}
                    value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                    className="pr-10" placeholder="Enter current password" required
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowCurrent(!showCurrent)}>
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="newPwd">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPwd" type={showNew ? 'text' : 'password'}
                      value={newPassword} onChange={e => setNewPassword(e.target.value)}
                      className="pr-10" placeholder="Min. 8 characters" required
                    />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowNew(!showNew)}>
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPwd">Confirm New Password</Label>
                  <Input id="confirmPwd" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat new password" required />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" variant="outline" disabled={passwordLoading}>
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default UserProfilePage;
