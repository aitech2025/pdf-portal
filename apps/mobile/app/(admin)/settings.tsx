import { useEffect, useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    Alert, ActivityIndicator, Switch, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { apiFetch } from '@shared/api/index.js';

interface AppSettings {
    id?: string;
    appName: string;
    supportEmail: string;
    supportPhone: string;
}

interface MaintenanceMode {
    id?: string;
    isEnabled: boolean;
    message: string;
}

interface EmailSettings {
    id?: string;
    smtpHost: string;
    smtpPort: string;
    smtpUsername: string;
    fromEmail: string;
    fromName: string;
}

export default function AdminSettingsScreen() {
    const router = useRouter();

    // App Info
    const [appSettings, setAppSettings] = useState<AppSettings>({ appName: '', supportEmail: '', supportPhone: '' });
    const [savingApp, setSavingApp] = useState(false);

    // Maintenance
    const [maintenance, setMaintenance] = useState<MaintenanceMode>({ isEnabled: false, message: '' });
    const [maintenanceId, setMaintenanceId] = useState<string | null>(null);
    const [savingMaintenance, setSavingMaintenance] = useState(false);

    // Email
    const [emailSettings, setEmailSettings] = useState<EmailSettings>({ smtpHost: '', smtpPort: '587', smtpUsername: '', fromEmail: '', fromName: '' });
    const [savingEmail, setSavingEmail] = useState(false);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [sysRes, maintRes] = await Promise.allSettled([
                apiFetch('/api/systemSettings'),
                apiFetch('/api/maintenanceMode'),
            ]);

            if (sysRes.status === 'fulfilled' && sysRes.value) {
                const s = sysRes.value;
                setAppSettings({
                    id: s.id,
                    appName: s.appName ?? '',
                    supportEmail: s.supportEmail ?? '',
                    supportPhone: s.supportPhone ?? '',
                });
                setEmailSettings({
                    id: s.id,
                    smtpHost: s.smtpHost ?? '',
                    smtpPort: s.smtpPort ? String(s.smtpPort) : '587',
                    smtpUsername: s.smtpUsername ?? '',
                    fromEmail: s.fromEmail ?? '',
                    fromName: s.fromName ?? '',
                });
            }

            if (maintRes.status === 'fulfilled' && maintRes.value) {
                const m = Array.isArray(maintRes.value)
                    ? maintRes.value[0]
                    : (maintRes.value.items?.[0] ?? maintRes.value);
                if (m) {
                    setMaintenanceId(m.id ?? null);
                    setMaintenance({ isEnabled: m.isEnabled ?? false, message: m.message ?? '' });
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveApp = async () => {
        setSavingApp(true);
        try {
            await apiFetch('/api/systemSettings', 'PATCH', {
                appName: appSettings.appName.trim(),
                supportEmail: appSettings.supportEmail.trim(),
                supportPhone: appSettings.supportPhone.trim(),
            });
            Alert.alert('Saved', 'App info updated successfully.');
        } catch (err: any) {
            Alert.alert('Error', err.message ?? 'Failed to save app info.');
        } finally {
            setSavingApp(false);
        }
    };

    const handleSaveMaintenance = async () => {
        setSavingMaintenance(true);
        try {
            if (maintenanceId) {
                await apiFetch(`/api/maintenanceMode/${maintenanceId}`, 'PATCH', {
                    isEnabled: maintenance.isEnabled,
                    message: maintenance.message.trim(),
                });
            } else {
                const res = await apiFetch('/api/maintenanceMode', 'POST', {
                    isEnabled: maintenance.isEnabled,
                    message: maintenance.message.trim(),
                });
                setMaintenanceId(res?.id ?? null);
            }
            Alert.alert('Saved', 'Maintenance mode updated.');
        } catch (err: any) {
            Alert.alert('Error', err.message ?? 'Failed to update maintenance mode.');
        } finally {
            setSavingMaintenance(false);
        }
    };

    const handleSaveEmail = async () => {
        setSavingEmail(true);
        try {
            await apiFetch('/api/systemSettings', 'PATCH', {
                smtpHost: emailSettings.smtpHost.trim(),
                smtpPort: parseInt(emailSettings.smtpPort, 10) || 587,
                smtpUsername: emailSettings.smtpUsername.trim(),
                fromEmail: emailSettings.fromEmail.trim(),
                fromName: emailSettings.fromName.trim(),
            });
            Alert.alert('Saved', 'Email settings updated successfully.');
        } catch (err: any) {
            Alert.alert('Error', err.message ?? 'Failed to save email settings.');
        } finally {
            setSavingEmail(false);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator size="large" color="#4f46e5" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-background">
            <View className="bg-white px-5 pt-14 pb-4 border-b border-border">
                <View className="flex-row items-center gap-3">
                    <TouchableOpacity onPress={() => router.back()} className="w-9 h-9 rounded-xl bg-gray-100 items-center justify-center">
                        <Ionicons name="arrow-back" size={20} color="#374151" />
                    </TouchableOpacity>
                    <View>
                        <Text className="text-2xl font-bold text-foreground">System Settings</Text>
                        <Text className="text-xs text-muted">Platform configuration</Text>
                    </View>
                </View>
            </View>

            <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

                    {/* App Info Section */}
                    <View className="bg-white mb-3 rounded-2xl p-4 border border-border">
                        <View className="flex-row items-center gap-2 mb-4">
                            <View className="w-8 h-8 rounded-lg bg-primary/10 items-center justify-center">
                                <Ionicons name="information-circle-outline" size={18} color="#4f46e5" />
                            </View>
                            <Text className="text-base font-semibold text-foreground">App Info</Text>
                        </View>

                        {[
                            { key: 'appName', label: 'App Name', placeholder: 'EduPortal', keyboard: 'default' },
                            { key: 'supportEmail', label: 'Support Email', placeholder: 'support@example.com', keyboard: 'email-address' },
                            { key: 'supportPhone', label: 'Support Phone', placeholder: '+1 234 567 8900', keyboard: 'phone-pad' },
                        ].map(f => (
                            <View key={f.key} className="mb-4">
                                <Text className="text-sm font-medium text-foreground mb-1.5">{f.label}</Text>
                                <TextInput
                                    className="bg-gray-50 border border-border rounded-xl px-4 py-3 text-foreground text-sm"
                                    placeholder={f.placeholder}
                                    placeholderTextColor="#9ca3af"
                                    value={appSettings[f.key as keyof AppSettings]}
                                    onChangeText={v => setAppSettings(p => ({ ...p, [f.key]: v }))}
                                    keyboardType={f.keyboard as any}
                                    autoCapitalize={f.keyboard === 'email-address' ? 'none' : 'sentences'}
                                />
                            </View>
                        ))}

                        <TouchableOpacity
                            className={`rounded-xl py-3.5 items-center ${savingApp ? 'bg-primary/60' : 'bg-primary'}`}
                            onPress={handleSaveApp}
                            disabled={savingApp}
                        >
                            {savingApp ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold">Save App Info</Text>}
                        </TouchableOpacity>
                    </View>

                    {/* Maintenance Mode Section */}
                    <View className="bg-white mb-3 rounded-2xl p-4 border border-border">
                        <View className="flex-row items-center gap-2 mb-4">
                            <View className="w-8 h-8 rounded-lg bg-amber-100 items-center justify-center">
                                <Ionicons name="construct-outline" size={18} color="#d97706" />
                            </View>
                            <Text className="text-base font-semibold text-foreground">Maintenance Mode</Text>
                        </View>

                        <View className="flex-row items-center justify-between mb-4 bg-gray-50 rounded-xl px-4 py-3 border border-border">
                            <View className="flex-1 mr-3">
                                <Text className="text-sm font-medium text-foreground">Enable Maintenance Mode</Text>
                                <Text className="text-xs text-muted mt-0.5">Blocks access for non-admin users</Text>
                            </View>
                            <Switch
                                value={maintenance.isEnabled}
                                onValueChange={v => setMaintenance(p => ({ ...p, isEnabled: v }))}
                                trackColor={{ false: '#e5e7eb', true: '#a5b4fc' }}
                                thumbColor={maintenance.isEnabled ? '#4f46e5' : '#9ca3af'}
                            />
                        </View>

                        {maintenance.isEnabled && (
                            <View className="mb-4">
                                <Text className="text-sm font-medium text-foreground mb-1.5">Maintenance Message</Text>
                                <TextInput
                                    className="bg-gray-50 border border-border rounded-xl px-4 py-3 text-foreground text-sm"
                                    placeholder="We are currently performing maintenance..."
                                    placeholderTextColor="#9ca3af"
                                    value={maintenance.message}
                                    onChangeText={v => setMaintenance(p => ({ ...p, message: v }))}
                                    multiline
                                    numberOfLines={3}
                                    textAlignVertical="top"
                                    style={{ minHeight: 80 }}
                                />
                            </View>
                        )}

                        {maintenance.isEnabled && (
                            <View className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-4 flex-row items-center gap-2">
                                <Ionicons name="warning-outline" size={16} color="#d97706" />
                                <Text className="text-xs text-amber-700 flex-1">Maintenance mode will restrict access for all non-admin users.</Text>
                            </View>
                        )}

                        <TouchableOpacity
                            className={`rounded-xl py-3.5 items-center ${savingMaintenance ? 'bg-amber-400' : 'bg-amber-500'}`}
                            onPress={handleSaveMaintenance}
                            disabled={savingMaintenance}
                        >
                            {savingMaintenance ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold">Save Maintenance Settings</Text>}
                        </TouchableOpacity>
                    </View>

                    {/* Email Settings Section */}
                    <View className="bg-white mb-3 rounded-2xl p-4 border border-border">
                        <View className="flex-row items-center gap-2 mb-4">
                            <View className="w-8 h-8 rounded-lg bg-emerald-100 items-center justify-center">
                                <Ionicons name="mail-outline" size={18} color="#059669" />
                            </View>
                            <Text className="text-base font-semibold text-foreground">Email Settings</Text>
                        </View>

                        {[
                            { key: 'smtpHost', label: 'SMTP Host', placeholder: 'smtp.gmail.com', keyboard: 'default' },
                            { key: 'smtpPort', label: 'SMTP Port', placeholder: '587', keyboard: 'numeric' },
                            { key: 'smtpUsername', label: 'SMTP Username', placeholder: 'user@gmail.com', keyboard: 'email-address' },
                            { key: 'fromEmail', label: 'From Email', placeholder: 'noreply@example.com', keyboard: 'email-address' },
                            { key: 'fromName', label: 'From Name', placeholder: 'EduPortal', keyboard: 'default' },
                        ].map(f => (
                            <View key={f.key} className="mb-4">
                                <Text className="text-sm font-medium text-foreground mb-1.5">{f.label}</Text>
                                <TextInput
                                    className="bg-gray-50 border border-border rounded-xl px-4 py-3 text-foreground text-sm"
                                    placeholder={f.placeholder}
                                    placeholderTextColor="#9ca3af"
                                    value={emailSettings[f.key as keyof EmailSettings]}
                                    onChangeText={v => setEmailSettings(p => ({ ...p, [f.key]: v }))}
                                    keyboardType={f.keyboard as any}
                                    autoCapitalize="none"
                                />
                            </View>
                        ))}

                        <TouchableOpacity
                            className={`rounded-xl py-3.5 items-center ${savingEmail ? 'bg-emerald-400' : 'bg-emerald-600'}`}
                            onPress={handleSaveEmail}
                            disabled={savingEmail}
                        >
                            {savingEmail ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold">Save Email Settings</Text>}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}
