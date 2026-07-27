import { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    Alert, ActivityIndicator, Switch, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { authApi } from '@shared/api/index.js';
import { ROLE_LABELS } from '@shared/constants/roles.js';

/* Design tokens mirrored from apps/web */
const BRAND = '#5b5ff1';
const BG = '#fbfcff';
const FG = '#111827';
const MUTED_FG = '#6b7280';
const BORDER = '#e8ebf0';
const CARD_BORDER = '#eef0f3';
const SUCCESS = '#059669';
const DESTRUCTIVE = '#e11d48';
const RADIUS_LG = 16;
const SOFT_SM = {
    shadowColor: '#111a2e', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
};

const inputStyle = {
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: BORDER, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: FG,
} as const;

const Card = ({ children, style }: { children: React.ReactNode; style?: any }) => (
    <View style={[{ backgroundColor: 'white', borderRadius: RADIUS_LG, padding: 20, borderWidth: 1, borderColor: CARD_BORDER }, SOFT_SM, style]}>
        {children}
    </View>
);

export default function ProfileScreen() {
    const { user, logout, updateUser } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const u = user as any;

    const [name, setName] = useState(user?.name ?? '');
    const [mobile, setMobile] = useState(user?.mobileNumber ?? '');
    const [address, setAddress] = useState(u?.address ?? '');
    const [savingProfile, setSavingProfile] = useState(false);

    const prefs = u?.notification_preferences ?? u?.notificationPreferences ?? {};
    const [emailNotif, setEmailNotif] = useState(prefs.email !== false);
    const [whatsappNotif, setWhatsappNotif] = useState(prefs.whatsapp === true);
    const [notifLoading, setNotifLoading] = useState(false);

    const [currentPwd, setCurrentPwd] = useState('');
    const [newPwd, setNewPwd] = useState('');
    const [confirmPwd, setConfirmPwd] = useState('');
    const [pwdLoading, setPwdLoading] = useState(false);

    const handleSaveProfile = async () => {
        if (!name.trim()) { Alert.alert('Error', 'Name cannot be empty.'); return; }
        setSavingProfile(true);
        try {
            await updateUser({ name: name.trim(), mobileNumber: mobile.trim() || undefined, address: address.trim() || undefined } as any);
            Alert.alert('Saved', 'Profile updated successfully.');
        } catch (err: any) { Alert.alert('Error', err.message || 'Failed to update profile.'); }
        finally { setSavingProfile(false); }
    };

    const handleSaveNotifications = async () => {
        setNotifLoading(true);
        try {
            await authApi.updateMe({ notification_preferences: { email: emailNotif, whatsapp: whatsappNotif } });
            Alert.alert('Saved', 'Notification preferences saved.');
        } catch (err: any) { Alert.alert('Error', err.message || 'Failed to save preferences.'); }
        finally { setNotifLoading(false); }
    };

    const handleChangePassword = async () => {
        if (!currentPwd || !newPwd || !confirmPwd) { Alert.alert('Error', 'Please fill all password fields.'); return; }
        if (newPwd !== confirmPwd) { Alert.alert('Error', 'New passwords do not match.'); return; }
        if (newPwd.length < 8) { Alert.alert('Error', 'Password must be at least 8 characters.'); return; }
        setPwdLoading(true);
        try {
            await authApi.changePassword(currentPwd, newPwd);
            Alert.alert('Success', 'Password changed successfully.');
            setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
        } catch (err: any) { Alert.alert('Error', err.message || 'Failed to change password.'); }
        finally { setPwdLoading(false); }
    };

    const handleSignOut = () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/login'); } },
        ]);
    };

    const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
        <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 13, color: MUTED_FG, marginBottom: 4 }}>{label}</Text>
            {children}
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: BG }}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
                    {/* Header */}
                    <View style={{
                        backgroundColor: 'white', paddingHorizontal: 20, paddingTop: insets.top + 12,
                        paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: BORDER,
                    }}>
                        <Text style={{ fontSize: 24, fontWeight: '700', color: FG }}>My Profile</Text>
                        <Text style={{ fontSize: 13, color: MUTED_FG, marginTop: 2 }}>Manage your account and security.</Text>
                    </View>

                    <View style={{ padding: 16, gap: 16 }}>
                        {/* Avatar card */}
                        <Card style={{ alignItems: 'center' }}>
                            <View style={{ width: 80, height: 80, borderRadius: 999, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                                <Text style={{ color: BRAND, fontSize: 32, fontWeight: '700' }}>
                                    {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <Text style={{ fontSize: 20, fontWeight: '700', color: FG }}>{user?.name}</Text>
                            <Text style={{ fontSize: 13, color: MUTED_FG, marginTop: 2 }}>{user?.email}</Text>
                            {user?.mobileNumber ? <Text style={{ fontSize: 13, color: MUTED_FG, marginTop: 2 }}>{user.mobileNumber}</Text> : null}
                            <View style={{ marginTop: 8, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, backgroundColor: '#ede9fe' }}>
                                <Text style={{ color: BRAND, fontSize: 12, fontWeight: '500' }}>{ROLE_LABELS[user?.role ?? ''] ?? user?.role}</Text>
                            </View>
                            <View style={{ marginTop: 6, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, backgroundColor: user?.isActive ? '#d1fae5' : '#f1f5f9' }}>
                                <Text style={{ fontSize: 12, fontWeight: '500', color: user?.isActive ? '#047857' : '#6b7280' }}>
                                    {user?.isActive ? 'Active' : 'Inactive'}
                                </Text>
                            </View>
                        </Card>

                        {/* Personal Information */}
                        <Card>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                <Ionicons name="person-outline" size={18} color={MUTED_FG} />
                                <Text style={{ fontSize: 16, fontWeight: '600', color: FG }}>Personal Information</Text>
                            </View>
                            <Field label="Full Name">
                                <TextInput style={inputStyle} value={name} onChangeText={setName} placeholder="Your full name" placeholderTextColor="#9ca3af" autoCapitalize="words" />
                            </Field>
                            <Field label="Mobile Number">
                                <TextInput style={inputStyle} value={mobile} onChangeText={setMobile} placeholder="+91 9876543210" placeholderTextColor="#9ca3af" keyboardType="phone-pad" />
                            </Field>
                            <Field label="Address">
                                <TextInput style={inputStyle} value={address} onChangeText={setAddress} placeholder="123 Main St, City, State" placeholderTextColor="#9ca3af" />
                            </Field>
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 13, color: MUTED_FG, marginBottom: 4 }}>Email</Text>
                                <View style={{ backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
                                    <Text style={{ fontSize: 14, color: MUTED_FG }}>{user?.email}</Text>
                                </View>
                                <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Email cannot be changed</Text>
                            </View>
                            <TouchableOpacity
                                style={{ borderRadius: 12, paddingVertical: 14, alignItems: 'center', backgroundColor: savingProfile ? BRAND + '99' : BRAND }}
                                onPress={handleSaveProfile}
                                disabled={savingProfile}
                            >
                                {savingProfile ? <ActivityIndicator color="#fff" /> : <Text style={{ color: 'white', fontWeight: '600' }}>Save Changes</Text>}
                            </TouchableOpacity>
                        </Card>

                        {/* Notification Preferences */}
                        <Card>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                <Ionicons name="notifications-outline" size={18} color={MUTED_FG} />
                                <Text style={{ fontSize: 16, fontWeight: '600', color: FG }}>Notification Preferences</Text>
                            </View>
                            <View style={{
                                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                                padding: 14, borderRadius: 12, borderWidth: 1, borderColor: CARD_BORDER, marginBottom: 12,
                            }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                                    <Ionicons name="mail-outline" size={20} color="#3b82f6" />
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 14, fontWeight: '500', color: FG }}>Email Notifications</Text>
                                        <Text style={{ fontSize: 12, color: MUTED_FG }}>Receive updates and alerts via email</Text>
                                    </View>
                                </View>
                                <Switch value={emailNotif} onValueChange={setEmailNotif} trackColor={{ false: '#e5e7eb', true: '#a5b4fc' }} thumbColor={emailNotif ? BRAND : '#9ca3af'} />
                            </View>
                            <View style={{
                                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                                padding: 14, borderRadius: 12, borderWidth: 1, borderColor: CARD_BORDER, marginBottom: 16,
                            }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                                    <Ionicons name="logo-whatsapp" size={20} color="#10b981" />
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 14, fontWeight: '500', color: FG }}>WhatsApp Notifications</Text>
                                        <Text style={{ fontSize: 12, color: MUTED_FG }}>Receive updates via WhatsApp messages</Text>
                                    </View>
                                </View>
                                <Switch value={whatsappNotif} onValueChange={setWhatsappNotif} trackColor={{ false: '#e5e7eb', true: '#a5b4fc' }} thumbColor={whatsappNotif ? BRAND : '#9ca3af'} />
                            </View>
                            <TouchableOpacity
                                style={{ borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: BORDER }}
                                onPress={handleSaveNotifications}
                                disabled={notifLoading}
                            >
                                {notifLoading ? <ActivityIndicator color={BRAND} /> : <Text style={{ color: FG, fontWeight: '600' }}>Save Preferences</Text>}
                            </TouchableOpacity>
                        </Card>

                        {/* Change password */}
                        <Card>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                <Ionicons name="lock-closed-outline" size={18} color={MUTED_FG} />
                                <Text style={{ fontSize: 16, fontWeight: '600', color: FG }}>Change Password</Text>
                            </View>
                            {[
                                { label: 'Current Password', value: currentPwd, setter: setCurrentPwd },
                                { label: 'New Password', value: newPwd, setter: setNewPwd },
                                { label: 'Confirm New Password', value: confirmPwd, setter: setConfirmPwd },
                            ].map(field => (
                                <Field key={field.label} label={field.label}>
                                    <TextInput
                                        style={inputStyle}
                                        secureTextEntry
                                        value={field.value}
                                        onChangeText={field.setter}
                                        placeholder="••••••••"
                                        placeholderTextColor="#9ca3af"
                                    />
                                </Field>
                            ))}
                            <TouchableOpacity
                                style={{ borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4, backgroundColor: pwdLoading ? BRAND + '99' : BRAND }}
                                onPress={handleChangePassword}
                                disabled={pwdLoading}
                            >
                                {pwdLoading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: 'white', fontWeight: '600' }}>Update Password</Text>}
                            </TouchableOpacity>
                        </Card>

                        {/* Sign out */}
                        <TouchableOpacity
                            style={{
                                backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: RADIUS_LG,
                                padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                            }}
                            onPress={handleSignOut}
                        >
                            <Ionicons name="log-out-outline" size={20} color={DESTRUCTIVE} />
                            <Text style={{ color: DESTRUCTIVE, fontWeight: '600' }}>Sign Out</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}
