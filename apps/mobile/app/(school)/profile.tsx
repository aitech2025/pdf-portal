import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { authApi } from '@shared/api/index.js';
import { ROLE_LABELS } from '@shared/constants/roles.js';

export default function SchoolProfile() {
    const { user, logout } = useAuth();
    const [currentPwd, setCurrentPwd] = useState('');
    const [newPwd, setNewPwd] = useState('');
    const [confirmPwd, setConfirmPwd] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChangePassword = async () => {
        if (newPwd !== confirmPwd) { Alert.alert('Error', 'Passwords do not match.'); return; }
        if (newPwd.length < 8) { Alert.alert('Error', 'Min 8 characters.'); return; }
        setLoading(true);
        try {
            await authApi.changePassword(currentPwd, newPwd);
            Alert.alert('Success', 'Password updated.');
            setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally { setLoading(false); }
    };

    return (
        <ScrollView className="flex-1 bg-background">
            <View className="bg-white px-5 pt-14 pb-5 border-b border-border">
                <Text className="text-2xl font-bold text-foreground">My Profile</Text>
            </View>

            <View className="p-4 space-y-4">
                <View className="bg-white rounded-2xl p-5 border border-border items-center">
                    <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-3">
                        <Text className="text-primary text-3xl font-bold">
                            {(user?.name || 'U').charAt(0).toUpperCase()}
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

                <View className="bg-white rounded-2xl p-5 border border-border">
                    <Text className="text-base font-semibold text-foreground mb-4">Change Password</Text>
                    {[
                        { label: 'Current Password', value: currentPwd, setter: setCurrentPwd },
                        { label: 'New Password', value: newPwd, setter: setNewPwd },
                        { label: 'Confirm Password', value: confirmPwd, setter: setConfirmPwd },
                    ].map(f => (
                        <View key={f.label} className="mb-3">
                            <Text className="text-sm text-muted mb-1">{f.label}</Text>
                            <TextInput
                                className="bg-gray-50 border border-border rounded-xl px-4 py-3 text-foreground"
                                secureTextEntry value={f.value} onChangeText={f.setter}
                                placeholder="••••••••" placeholderTextColor="#9ca3af"
                            />
                        </View>
                    ))}
                    <TouchableOpacity
                        className={`rounded-xl py-3.5 items-center ${loading ? 'bg-primary/60' : 'bg-primary'}`}
                        onPress={handleChangePassword} disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-semibold">Update Password</Text>}
                    </TouchableOpacity>
                </View>

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
