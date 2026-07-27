import { useState } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput,
    KeyboardAvoidingView, Platform,
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
const ROSE = '#f43f5e';
const RADIUS_LG = 16;
const SOFT_SM = {
    shadowColor: '#111a2e', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
};
const inputStyle = {
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: BORDER, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, color: FG, fontSize: 14,
};

export default function SchoolProfile() {
    const { user, logout, updateUser } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [name, setName] = useState(user?.name ?? '');
    const [mobile, setMobile] = useState(user?.mobileNumber ?? '');
    const [savingProfile, setSavingProfile] = useState(false);

    const [currentPwd, setCurrentPwd] = useState('');
    const [newPwd, setNewPwd] = useState('');
    const [confirmPwd, setConfirmPwd] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSaveProfile = async () => {
        if (!name.trim()) { Alert.alert('Error', 'Name cannot be empty.'); return; }
        setSavingProfile(true);
        try {
            await updateUser({ name: name.trim(), mobileNumber: mobile.trim() || undefined });
            Alert.alert('Saved', 'Profile updated successfully.');
        } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to update profile.');
        } finally { setSavingProfile(false); }
    };

    const handleChangePassword = async () => {
        if (!currentPwd || !newPwd || !confirmPwd) { Alert.alert('Error', 'Please fill all password fields.'); return; }
        if (newPwd !== confirmPwd) { Alert.alert('Error', 'Passwords do not match.'); return; }
        if (newPwd.length < 8) { Alert.alert('Error', 'Min 8 characters.'); return; }
        setLoading(true);
        try {
            await authApi.changePassword(currentPwd, newPwd);
            Alert.alert('Success', 'Password updated.');
            setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
        } catch (err: any) {
            Alert.alert('Error', err?.message);
        } finally { setLoading(false); }
    };

    const handleSignOut = () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign Out', style: 'destructive',
                onPress: async () => { await logout(); router.replace('/(auth)/login'); },
            },
        ]);
    };

    return (
        <View style={{ flex: 1, backgroundColor: BG }}>
            <View style={{ backgroundColor: 'white', paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: CARD_BORDER }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: BRAND, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>
                    School portal
                </Text>
                <Text style={{ fontSize: 24, fontWeight: '700', color: FG }}>My Profile</Text>
                <Text style={{ fontSize: 14, color: MUTED_FG, marginTop: 2 }}>Manage your account information and security.</Text>
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, gap: 14 }} showsVerticalScrollIndicator={false}>

                    {/* Avatar card */}
                    <View style={[{ backgroundColor: 'white', borderRadius: RADIUS_LG, borderWidth: 1, borderColor: CARD_BORDER, padding: 20, alignItems: 'center' }, SOFT_SM]}>
                        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: BRAND + '1a', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                            <Text style={{ color: BRAND, fontSize: 30, fontWeight: '700' }}>
                                {(user?.name || 'U').charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <Text style={{ fontSize: 20, fontWeight: '700', color: FG }}>{user?.name}</Text>
                        <Text style={{ fontSize: 14, color: MUTED_FG, marginTop: 2 }}>{user?.email}</Text>
                        {user?.mobileNumber ? (
                            <Text style={{ fontSize: 14, color: MUTED_FG, marginTop: 2 }}>{user.mobileNumber}</Text>
                        ) : null}
                        <View style={{ marginTop: 10, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: BRAND + '1a' }}>
                            <Text style={{ color: BRAND, fontSize: 12, fontWeight: '600' }}>
                                {ROLE_LABELS[user?.role ?? ''] ?? user?.role}
                            </Text>
                        </View>
                    </View>

                    {/* Personal Information */}
                    <View style={[{ backgroundColor: 'white', borderRadius: RADIUS_LG, borderWidth: 1, borderColor: CARD_BORDER, padding: 16 }, SOFT_SM]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                            <Ionicons name="person-outline" size={18} color={BRAND} />
                            <Text style={{ fontSize: 16, fontWeight: '700', color: FG }}>Personal Information</Text>
                        </View>

                        <View style={{ marginBottom: 14 }}>
                            <Text style={{ fontSize: 13, color: MUTED_FG, marginBottom: 6 }}>Full Name</Text>
                            <TextInput style={inputStyle} value={name} onChangeText={setName} placeholder="Your full name" placeholderTextColor="#9ca3af" autoCapitalize="words" />
                        </View>
                        <View style={{ marginBottom: 14 }}>
                            <Text style={{ fontSize: 13, color: MUTED_FG, marginBottom: 6 }}>Mobile Number</Text>
                            <TextInput style={inputStyle} value={mobile} onChangeText={setMobile} placeholder="+91 9876543210" placeholderTextColor="#9ca3af" keyboardType="phone-pad" />
                        </View>
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 13, color: MUTED_FG, marginBottom: 6 }}>Email</Text>
                            <View style={{ backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
                                <Text style={{ fontSize: 14, color: MUTED_FG }}>{user?.email}</Text>
                            </View>
                            <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Email cannot be changed</Text>
                        </View>

                        <TouchableOpacity
                            onPress={handleSaveProfile}
                            disabled={savingProfile}
                            style={{ borderRadius: 12, height: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: savingProfile ? BRAND + '99' : BRAND }}
                        >
                            {savingProfile ? <ActivityIndicator color="#fff" /> : <Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>Save Profile</Text>}
                        </TouchableOpacity>
                    </View>

                    {/* Change Password */}
                    <View style={[{ backgroundColor: 'white', borderRadius: RADIUS_LG, borderWidth: 1, borderColor: CARD_BORDER, padding: 16 }, SOFT_SM]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                            <Ionicons name="lock-closed-outline" size={18} color={MUTED_FG} />
                            <Text style={{ fontSize: 16, fontWeight: '700', color: FG }}>Change Password</Text>
                        </View>

                        <View style={{ marginBottom: 14 }}>
                            <Text style={{ fontSize: 13, color: MUTED_FG, marginBottom: 6 }}>Current Password</Text>
                            <TextInput style={inputStyle} secureTextEntry value={currentPwd} onChangeText={setCurrentPwd} placeholder="••••••••" placeholderTextColor="#9ca3af" />
                        </View>
                        <View style={{ marginBottom: 14 }}>
                            <Text style={{ fontSize: 13, color: MUTED_FG, marginBottom: 6 }}>New Password</Text>
                            <TextInput style={inputStyle} secureTextEntry value={newPwd} onChangeText={setNewPwd} placeholder="••••••••" placeholderTextColor="#9ca3af" />
                        </View>
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 13, color: MUTED_FG, marginBottom: 6 }}>Confirm Password</Text>
                            <TextInput style={inputStyle} secureTextEntry value={confirmPwd} onChangeText={setConfirmPwd} placeholder="••••••••" placeholderTextColor="#9ca3af" />
                        </View>

                        <TouchableOpacity
                            onPress={handleChangePassword}
                            disabled={loading}
                            style={{ borderRadius: 12, height: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: loading ? BRAND + '99' : BRAND }}
                        >
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>Update Password</Text>}
                        </TouchableOpacity>
                    </View>

                    {/* Sign out */}
                    <TouchableOpacity
                        onPress={handleSignOut}
                        style={{ backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: RADIUS_LG, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    >
                        <Ionicons name="log-out-outline" size={20} color={ROSE} />
                        <Text style={{ color: ROSE, fontWeight: '600', fontSize: 15 }}>Sign Out</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}
