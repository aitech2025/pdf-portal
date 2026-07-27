import { useEffect, useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    Alert, ActivityIndicator, Switch, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch } from '@shared/api/index.js';

/* Design tokens mirrored from apps/web */
const BRAND = '#5b5ff1';
const BG = '#fbfcff';
const FG = '#111827';
const MUTED_FG = '#6b7280';
const BORDER = '#e8ebf0';
const CARD_BORDER = '#eef0f3';
const WARNING = '#f59e0b';
const SUCCESS = '#059669';
const RADIUS_LG = 16;
const SOFT_SM = {
    shadowColor: '#111a2e', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
};

interface AppSettings { id?: string; appName: string; supportEmail: string; supportPhone: string; }
interface MaintenanceMode { id?: string; isEnabled: boolean; message: string; }
interface EmailSettings { id?: string; smtpHost: string; smtpPort: string; smtpUsername: string; fromEmail: string; fromName: string; }

const inputStyle = {
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: BORDER, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: FG,
} as const;

const Card = ({ children }: { children: React.ReactNode }) => (
    <View style={[{ backgroundColor: 'white', marginBottom: 12, borderRadius: RADIUS_LG, padding: 16, borderWidth: 1, borderColor: CARD_BORDER }, SOFT_SM]}>
        {children}
    </View>
);

const SectionHeader = ({ icon, color, bg, title }: { icon: string; color: string; bg: string; title: string }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={icon as any} size={18} color={color} />
        </View>
        <Text style={{ fontSize: 16, fontWeight: '600', color: FG }}>{title}</Text>
    </View>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: FG, marginBottom: 6 }}>{label}</Text>
        {children}
    </View>
);

export default function AdminSettingsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [appSettings, setAppSettings] = useState<AppSettings>({ appName: '', supportEmail: '', supportPhone: '' });
    const [savingApp, setSavingApp] = useState(false);

    const [maintenance, setMaintenance] = useState<MaintenanceMode>({ isEnabled: false, message: '' });
    const [maintenanceId, setMaintenanceId] = useState<string | null>(null);
    const [savingMaintenance, setSavingMaintenance] = useState(false);

    const [emailSettings, setEmailSettings] = useState<EmailSettings>({ smtpHost: '', smtpPort: '587', smtpUsername: '', fromEmail: '', fromName: '' });
    const [savingEmail, setSavingEmail] = useState(false);

    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [sysRes, maintRes] = await Promise.allSettled([
                apiFetch('/api/systemSettings'),
                apiFetch('/api/maintenanceMode'),
            ]);
            if (sysRes.status === 'fulfilled' && sysRes.value) {
                const s = sysRes.value;
                setAppSettings({ id: s.id, appName: s.appName ?? '', supportEmail: s.supportEmail ?? '', supportPhone: s.supportPhone ?? '' });
                setEmailSettings({
                    id: s.id, smtpHost: s.smtpHost ?? '', smtpPort: s.smtpPort ? String(s.smtpPort) : '587',
                    smtpUsername: s.smtpUsername ?? '', fromEmail: s.fromEmail ?? '', fromName: s.fromName ?? '',
                });
            }
            if (maintRes.status === 'fulfilled' && maintRes.value) {
                const m = Array.isArray(maintRes.value) ? maintRes.value[0] : (maintRes.value.items?.[0] ?? maintRes.value);
                if (m) {
                    setMaintenanceId(m.id ?? null);
                    setMaintenance({ isEnabled: m.isEnabled ?? false, message: m.message ?? '' });
                }
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
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
        } catch (err: any) { Alert.alert('Error', err.message ?? 'Failed to save app info.'); }
        finally { setSavingApp(false); }
    };

    const handleSaveMaintenance = async () => {
        setSavingMaintenance(true);
        try {
            if (maintenanceId) {
                await apiFetch(`/api/maintenanceMode/${maintenanceId}`, 'PATCH', { isEnabled: maintenance.isEnabled, message: maintenance.message.trim() });
            } else {
                const res = await apiFetch('/api/maintenanceMode', 'POST', { isEnabled: maintenance.isEnabled, message: maintenance.message.trim() });
                setMaintenanceId(res?.id ?? null);
            }
            Alert.alert('Saved', 'Maintenance mode updated.');
        } catch (err: any) { Alert.alert('Error', err.message ?? 'Failed to update maintenance mode.'); }
        finally { setSavingMaintenance(false); }
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
        } catch (err: any) { Alert.alert('Error', err.message ?? 'Failed to save email settings.'); }
        finally { setSavingEmail(false); }
    };

    const SaveButton = ({ saving, onPress, label, color }: { saving: boolean; onPress: () => void; label: string; color: string }) => (
        <TouchableOpacity
            style={{ borderRadius: 12, paddingVertical: 14, alignItems: 'center', backgroundColor: saving ? color + '99' : color }}
            onPress={onPress}
            disabled={saving}
        >
            {saving ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '600' }}>{label}</Text>}
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG }}>
                <ActivityIndicator size="large" color={BRAND} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: BG }}>
            {/* Header */}
            <View style={{
                backgroundColor: 'white', paddingHorizontal: 20, paddingTop: insets.top + 12,
                paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: BORDER,
                flexDirection: 'row', alignItems: 'center', gap: 12,
            }}>
                <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="arrow-back" size={20} color="#374151" />
                </TouchableOpacity>
                <View>
                    <Text style={{ fontSize: 22, fontWeight: '700', color: FG }}>System Settings</Text>
                    <Text style={{ fontSize: 12, color: MUTED_FG }}>Platform configuration</Text>
                </View>
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>

                    {/* App Info */}
                    <Card>
                        <SectionHeader icon="information-circle-outline" color={BRAND} bg="#ede9fe" title="App Info" />
                        {[
                            { key: 'appName', label: 'App Name', placeholder: 'EduPortal', keyboard: 'default' },
                            { key: 'supportEmail', label: 'Support Email', placeholder: 'support@example.com', keyboard: 'email-address' },
                            { key: 'supportPhone', label: 'Support Phone', placeholder: '+1 234 567 8900', keyboard: 'phone-pad' },
                        ].map(f => (
                            <Field key={f.key} label={f.label}>
                                <TextInput
                                    style={inputStyle}
                                    placeholder={f.placeholder}
                                    placeholderTextColor="#9ca3af"
                                    value={appSettings[f.key as keyof AppSettings] as string}
                                    onChangeText={v => setAppSettings(p => ({ ...p, [f.key]: v }))}
                                    keyboardType={f.keyboard as any}
                                    autoCapitalize={f.keyboard === 'email-address' ? 'none' : 'sentences'}
                                />
                            </Field>
                        ))}
                        <SaveButton saving={savingApp} onPress={handleSaveApp} label="Save App Info" color={BRAND} />
                    </Card>

                    {/* Maintenance Mode */}
                    <Card>
                        <SectionHeader icon="construct-outline" color={WARNING} bg="#fef3c7" title="Maintenance Mode" />
                        <View style={{
                            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                            marginBottom: 16, backgroundColor: '#f9fafb', borderRadius: 12,
                            paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: BORDER,
                        }}>
                            <View style={{ flex: 1, marginRight: 12 }}>
                                <Text style={{ fontSize: 14, fontWeight: '500', color: FG }}>Enable Maintenance Mode</Text>
                                <Text style={{ fontSize: 12, color: MUTED_FG, marginTop: 2 }}>Blocks access for non-admin users</Text>
                            </View>
                            <Switch
                                value={maintenance.isEnabled}
                                onValueChange={v => setMaintenance(p => ({ ...p, isEnabled: v }))}
                                trackColor={{ false: '#e5e7eb', true: '#a5b4fc' }}
                                thumbColor={maintenance.isEnabled ? BRAND : '#9ca3af'}
                            />
                        </View>

                        {maintenance.isEnabled && (
                            <>
                                <Field label="Maintenance Message">
                                    <TextInput
                                        style={[inputStyle, { minHeight: 80, textAlignVertical: 'top' }]}
                                        placeholder="We are currently performing maintenance..."
                                        placeholderTextColor="#9ca3af"
                                        value={maintenance.message}
                                        onChangeText={v => setMaintenance(p => ({ ...p, message: v }))}
                                        multiline
                                    />
                                </Field>
                                <View style={{
                                    backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 12,
                                    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16,
                                    flexDirection: 'row', alignItems: 'center', gap: 8,
                                }}>
                                    <Ionicons name="warning-outline" size={16} color={WARNING} />
                                    <Text style={{ fontSize: 12, color: '#b45309', flex: 1 }}>Maintenance mode will restrict access for all non-admin users.</Text>
                                </View>
                            </>
                        )}
                        <SaveButton saving={savingMaintenance} onPress={handleSaveMaintenance} label="Save Maintenance Settings" color={WARNING} />
                    </Card>

                    {/* Email Settings */}
                    <Card>
                        <SectionHeader icon="mail-outline" color={SUCCESS} bg="#d1fae5" title="Email Settings" />
                        {[
                            { key: 'smtpHost', label: 'SMTP Host', placeholder: 'smtp.gmail.com', keyboard: 'default' },
                            { key: 'smtpPort', label: 'SMTP Port', placeholder: '587', keyboard: 'numeric' },
                            { key: 'smtpUsername', label: 'SMTP Username', placeholder: 'user@gmail.com', keyboard: 'email-address' },
                            { key: 'fromEmail', label: 'From Email', placeholder: 'noreply@example.com', keyboard: 'email-address' },
                            { key: 'fromName', label: 'From Name', placeholder: 'EduPortal', keyboard: 'default' },
                        ].map(f => (
                            <Field key={f.key} label={f.label}>
                                <TextInput
                                    style={inputStyle}
                                    placeholder={f.placeholder}
                                    placeholderTextColor="#9ca3af"
                                    value={emailSettings[f.key as keyof EmailSettings] as string}
                                    onChangeText={v => setEmailSettings(p => ({ ...p, [f.key]: v }))}
                                    keyboardType={f.keyboard as any}
                                    autoCapitalize="none"
                                />
                            </Field>
                        ))}
                        <SaveButton saving={savingEmail} onPress={handleSaveEmail} label="Save Email Settings" color={SUCCESS} />
                    </Card>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}
