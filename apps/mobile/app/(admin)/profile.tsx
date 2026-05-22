import { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { authApi } from '@shared/api/index.js';
import { ROLE_LABELS } from '@shared/constants/roles.js';

export default function ProfileScreen() {
    const { user, logout, updateUser } = useAuth();
    const router = useRouter();

    // Profile edit
    const [name, setName] = useState(user?.name ?? '');
    const [mobile, setMobile] = useState(user?.mobileNumber ?? '');
    const [savingProfile, setSavingProfile] = useState(false);

    // Password change
    const [currentPwd, setCurrentPwd] = useState('');
    const [newPwd, setNewPwd] = useState('');
    const [confirmPwd, setConfirmPwd] = useState('');
    const [pwdLoading, setPwdLoading] = useState(false);

    const handleSaveProfile = async () => {
        if (!name.trim()) { Alert.alert('Error', 'Name cannot be empty.'); return; }
        setSavingProfile(true);
        try {
            await updateUser({ name: name.trim(), mobileNumber: mobile.trim() || undefined });
            Alert.alert('Saved', 'Profile updated successfully.');
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to update profile.');
        } finally {
            setSavingProfile(false);
        }
    };

    const handleChangePassword = async () => {
        if (!currentPwd || !newPwd || !confirmPwd) {
            Alert.alert('Error', 'Please fill all password fields.'); return;
        }
        if (newPwd !== confirmPwd) {
            Alert.alert('Error', 'New passwords do not match.'); return;
        }
        if (newPwd.length < 8) {
            Alert.alert('Error', 'Password must be at least 8 characters.'); return;
        }
        setPwdLoading(true);
        try {
            await authApi.changePassword(currentPwd, newPwd);
            Alert.alert('Success', 'Password changed successfully.');
            setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to change password.');
        } finally {
            setPwdLoading(false);
        }
    };

    const handleSignOut = () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign Out', style: 'destructive',
                onPress: async () => {
                    await logout();
                    router.replace('/(auth)/login');
                },
            },
        ]);
    };

    return (
        <ScrollView className="flex-1 bg-background">
            {/* Header */}
            <View className="bg-white px-5 pt-14 pb-5 border-b border-border">
                <Text className="text-2xl font-bold text-foreground">My Profile</Text>
            </View>

            <View className="p-4 gap-4">
                {/* Avatar card */}
                <View className="bg-white rounded-2xl p-5 border border-border items-center">
                    <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-3">
                        <Text className="text-primary text-3xl font-bold">
                            {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <Text className="text-xl font-bold text-foreground">{user?.name}</Text>
                    <Text className="text-muted text-sm mt-0.5">{user?.email}</Text>
                    {user?.mobileNumber ? (
                        <Text className="text-muted text-sm mt-0.5">{user.mobileNumber}</Text>
                    ) : null}
                    <View className="mt-2 px-3 py-1 rounded-full bg-primary/10">
                        <Text className="text-primary text-xs font-medium">
                            {ROLE_LABELS[user?.role ?? ''] ?? user?.role}
                        </Text>
                    </View>
                    <View className={`mt-1.5 px-3 py-1 rounded-full ${user?.isActive ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                        <Text className={`text-xs font-medium ${user?.isActive ? 'text-emerald-700' : 'text-gray-500'}`}>
                            {user?.isActive ? 'Active' : 'Inactive'}
                        </Text>
                    </View>
                </View>

                {/* Edit profile */}
                <View className="bg-white rounded-2xl p-5 border border-border">
                    <View className="flex-row items-center gap-2 mb-4">
                        <Ionicons name="person-outline" size={18} color="#6b7280" />
                        <Text className="text-base font-semibold text-foreground">Personal Information</Text>
                    </View>

                    <View className="mb-3">
                        <Text className="text-sm text-muted mb-1">Full Name</Text>
                        <TextInput
                            className="bg-gray-50 border border-border rounded-xl px-4 py-3 text-foreground text-sm"
                            value={name}
                            onChangeText={setName}
                            placeholder="Your full name"
                            placeholderTextColor="#9ca3af"
                            autoCapitalize="words"
                        />
                    </View>

                    <View className="mb-3">
                        <Text className="text-sm text-muted mb-1">Mobile Number</Text>
                        <TextInput
                            className="bg-gray-50 border border-border rounded-xl px-4 py-3 text-foreground text-sm"
                            value={mobile}
                            onChangeText={setMobile}
                            placeholder="+91 9876543210"
                            placeholderTextColor="#9ca3af"
                            keyboardType="phone-pad"
                        />
                    </View>

                    <View className="mb-4">
                        <Text className="text-sm text-muted mb-1">Email</Text>
                        <View className="bg-gray-100 border border-border rounded-xl px-4 py-3">
                            <Text className="text-sm text-muted">{user?.email}</Text>
                        </View>
                        <Text className="text-xs text-muted/60 mt-1">Email cannot be changed</Text>
                    </View>

                    <TouchableOpacity
                        className={`rounded-xl py-3.5 items-center ${savingProfile ? 'bg-primary/60' : 'bg-primary'}`}
                        onPress={handleSaveProfile}
                        disabled={savingProfile}
                    >
                        {savingProfile
                            ? <ActivityIndicator color="#fff" />
                            : <Text className="text-white font-semibold">Save Profile</Text>}
                    </TouchableOpacity>
                </View>

                {/* Change password */}
                <View className="bg-white rounded-2xl p-5 border border-border">
                    <View className="flex-row items-center gap-2 mb-4">
                        <Ionicons name="lock-closed-outline" size={18} color="#6b7280" />
                        <Text className="text-base font-semibold text-foreground">Change Password</Text>
                    </View>

                    {[
                        { label: 'Current Password', value: currentPwd, setter: setCurrentPwd },
                        { label: 'New Password', value: newPwd, setter: setNewPwd },
                        { label: 'Confirm New Password', value: confirmPwd, setter: setConfirmPwd },
                    ].map(field => (
                        <View key={field.label} className="mb-3">
                            <Text className="text-sm text-muted mb-1">{field.label}</Text>
                            <TextInput
                                className="bg-gray-50 border border-border rounded-xl px-4 py-3 text-foreground text-sm"
                                secureTextEntry
                                value={field.value}
                                onChangeText={field.setter}
                                placeholder="••••••••"
                                placeholderTextColor="#9ca3af"
                            />
                        </View>
                    ))}

                    <TouchableOpacity
                        className={`rounded-xl py-3.5 items-center mt-1 ${pwdLoading ? 'bg-primary/60' : 'bg-primary'}`}
                        onPress={handleChangePassword}
                        disabled={pwdLoading}
                    >
                        {pwdLoading
                            ? <ActivityIndicator color="#fff" />
                            : <Text className="text-white font-semibold">Update Password</Text>}
                    </TouchableOpacity>
                </View>

                {/* Sign out */}
                <TouchableOpacity
                    className="bg-red-50 border border-red-200 rounded-2xl p-4 flex-row items-center justify-center gap-2"
                    onPress={handleSignOut}
                >
                    <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                    <Text className="text-red-500 font-semibold">Sign Out</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}
