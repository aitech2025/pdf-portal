import { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { authApi } from '@shared/api/index.js';
import { ROLE_LABELS } from '@shared/constants/roles.js';

export default function ProfileScreen() {
    const { user, logout } = useAuth();
    const [currentPwd, setCurrentPwd] = useState('');
    const [newPwd, setNewPwd] = useState('');
    const [confirmPwd, setConfirmPwd] = useState('');
    const [pwdLoading, setPwdLoading] = useState(false);

    const handleChangePassword = async () => {
        if (!currentPwd || !newPwd || !confirmPwd) {
            Alert.alert('Error', 'Please fill all password fields.');
            return;
        }
        if (newPwd !== confirmPwd) {
            Alert.alert('Error', 'New passwords do not match.');
            return;
        }
        if (newPwd.length < 8) {
            Alert.alert('Error', 'Password must be at least 8 characters.');
            return;
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

    return (
        <ScrollView className="flex-1 bg-background">
            <View className="bg-white px-5 pt-14 pb-5 border-b border-border">
                <Text className="text-2xl font-bold text-foreground">My Profile</Text>
            </View>

            <View className="p-4 space-y-4">
                {/* Avatar + info */}
                <View className="bg-white rounded-2xl p-5 border border-border items-center">
                    <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-3">
                        <Text className="text-primary text-3xl font-bold">
                            {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <Text className="text-xl font-bold text-foreground">{user?.name}</Text>
                    <Text className="text-muted text-sm mt-0.5">{user?.email}</Text>
                    <View className="mt-2 px-3 py-1 rounded-full bg-primary/10">
                        <Text className="text-primary text-xs font-medium">
                            {ROLE_LABELS[user?.role ?? ''] ?? user?.role}
                        </Text>
                    </View>
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
                                className="bg-gray-50 border border-border rounded-xl px-4 py-3 text-foreground"
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
                    onPress={() => Alert.alert('Sign Out', 'Are you sure?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Sign Out', style: 'destructive', onPress: logout },
                    ])}
                >
                    <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                    <Text className="text-red-500 font-semibold">Sign Out</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}
