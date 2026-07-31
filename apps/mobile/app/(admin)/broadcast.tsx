import { useEffect, useMemo, useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    Alert, ActivityIndicator, Modal, KeyboardAvoidingView, Platform, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { schoolsApi, notificationsApi } from '@shared/api/index.js';

const DEFAULT_MARKS_MESSAGE =
    'Dear Student/Parent,\nMarks for {name}:\n{marks}\nTotal: {total}\n— i-icon Academy';

/* Design tokens mirrored from apps/web (index.css / tailwind.config.js) */
const BRAND = '#5b5ff1';
const BG = '#fbfcff';
const FG = '#111827';
const MUTED_FG = '#6b7280';
const BORDER = '#e5e7eb';
const CARD_BORDER = '#eef0f3';
const SUCCESS = '#22c55e';
const WA_GREEN = '#16a34a';
const SOFT_SM = {
    shadowColor: '#111a2e', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
};

type Channel = 'email' | 'whatsapp';
type RecipientMode = 'all_schools' | 'selected_schools';

interface School { id: string; schoolName: string; }

const EMAIL_TEMPLATES = [
    {
        name: 'General Announcement',
        subject: 'Important Announcement from i-icon Academy',
        message: 'Dear {SchoolName},\n\nWe have an important update to share with you.\n\n[Your message here]\n\nPlease log in to the portal for more details.\n\nBest regards,\ni-icon Academy Team',
    },
    {
        name: 'New Content Available',
        subject: 'New Educational Content on i-icon Academy',
        message: 'Dear {SchoolName},\n\nWe are pleased to inform you that new educational content has been added to your program on i-icon Academy.\n\nPlease log in to explore the latest materials available for your students.\n\nBest regards,\ni-icon Academy Team',
    },
    {
        name: 'Scheduled Maintenance',
        subject: 'Scheduled Maintenance — i-icon Academy',
        message: 'Dear {SchoolName},\n\nPlease be informed that i-icon Academy will undergo scheduled maintenance on [Date] from [Time] to [Time].\n\nDuring this period, access to the platform may be temporarily unavailable. We apologise for any inconvenience caused.\n\nBest regards,\ni-icon Academy Team',
    },
    {
        name: 'Renewal / Subscription',
        subject: 'Subscription Renewal Reminder — i-icon Academy',
        message: 'Dear {SchoolName},\n\nThis is a friendly reminder that your subscription on i-icon Academy is due for renewal on [Date].\n\nPlease contact us to ensure uninterrupted access to all educational resources.\n\nBest regards,\ni-icon Academy Team',
    },
];

const WHATSAPP_TEMPLATES = [
    { name: 'General Announcement', message: 'Dear {SchoolName}, we have an important update from i-icon Academy. Please log in to the portal or check your email for full details. — i-icon Academy Team' },
    { name: 'New Content', message: 'Dear {SchoolName}, new educational content is now available on i-icon Academy for your program. Log in to explore the latest materials! — i-icon Academy Team' },
    { name: 'Maintenance Notice', message: 'Dear {SchoolName}, i-icon Academy will undergo scheduled maintenance on [Date] from [Time] to [Time]. Access may be temporarily unavailable. We apologise for any inconvenience. — i-icon Academy Team' },
    { name: 'Renewal Reminder', message: 'Dear {SchoolName}, your i-icon Academy subscription is due for renewal on [Date]. Please contact us at support@iiconacademy.in to ensure uninterrupted access. — i-icon Academy Team' },
];

export default function BroadcastScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [channel, setChannel] = useState<Channel>('email');

    // Compose
    const [emailSubject, setEmailSubject] = useState('');
    const [emailMessage, setEmailMessage] = useState('');
    const [waMessage, setWaMessage] = useState('');
    const [includeInApp, setIncludeInApp] = useState(true);

    // Targeting
    const [recipientMode, setRecipientMode] = useState<RecipientMode>('all_schools');
    const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>([]);
    const [schools, setSchools] = useState<School[]>([]);
    const [loadingSchools, setLoadingSchools] = useState(true);

    const [sending, setSending] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [showSchoolPicker, setShowSchoolPicker] = useState(false);
    const [lastResult, setLastResult] = useState<string | null>(null);

    // Mode: announcement (existing) vs student marks broadcast
    const [mode, setMode] = useState<'announcement' | 'marks'>('announcement');
    const [marksRows, setMarksRows] = useState<any[]>([]);
    const [marksSummary, setMarksSummary] = useState<{ total: number; valid: number; invalid: number } | null>(null);
    const [marksMessage, setMarksMessage] = useState(DEFAULT_MARKS_MESSAGE);
    const [marksFileName, setMarksFileName] = useState('');
    const [marksBusy, setMarksBusy] = useState(false);

    useEffect(() => {
        schoolsApi.listSchools({ per_page: 500, sort: 'schoolName' })
            .then((res: any) => setSchools(res.items ?? []))
            .catch(() => Alert.alert('Error', 'Failed to load schools'))
            .finally(() => setLoadingSchools(false));
    }, []);

    const selectedCount = useMemo(() => selectedSchoolIds.length, [selectedSchoolIds]);
    const isEmail = channel === 'email';
    const message = isEmail ? emailMessage : waMessage;
    const previewText = message ? message.replace(/{SchoolName}/g, 'Sample Academy') : '';

    const toggleSchool = (id: string) => {
        setSelectedSchoolIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const applyTemplate = (tpl: { subject?: string; message: string }) => {
        if (isEmail) { setEmailSubject(tpl.subject ?? ''); setEmailMessage(tpl.message); }
        else setWaMessage(tpl.message);
        setShowTemplates(false);
    };

    const handleSend = async () => {
        const subject = isEmail ? emailSubject.trim() : 'WhatsApp Message';
        if (!message.trim() || (isEmail && !emailSubject.trim())) {
            Alert.alert('Validation', isEmail ? 'Subject and message are required.' : 'Message is required.');
            return;
        }
        if (recipientMode === 'selected_schools' && selectedSchoolIds.length === 0) {
            Alert.alert('No Recipients', 'Please select at least one school.');
            return;
        }

        const channels = isEmail
            ? (includeInApp ? ['email', 'in_app'] : ['email'])
            : (includeInApp ? ['whatsapp', 'in_app'] : ['whatsapp']);

        const targetLabel = recipientMode === 'all_schools' ? 'all schools' : `${selectedCount} selected school${selectedCount !== 1 ? 's' : ''}`;

        Alert.alert('Confirm Broadcast', `Send this ${channel} message to ${targetLabel}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Send', onPress: async () => {
                    setSending(true);
                    setLastResult(null);
                    try {
                        const result: any = await notificationsApi.adminSend({
                            subject,
                            message: message.trim(),
                            type: 'bulk_announcement',
                            channels,
                            targetMode: recipientMode,
                            schoolIds: recipientMode === 'selected_schools' ? selectedSchoolIds : [],
                        });
                        const total = result?.totalRecipients ?? 0;
                        const sent = result?.sent ?? total;
                        const failed = result?.failed ?? 0;
                        setLastResult(`Sent to ${total} recipients (${sent} delivered, ${failed} failed)`);
                        if (isEmail) { setEmailSubject(''); setEmailMessage(''); }
                        else setWaMessage('');
                        setSelectedSchoolIds([]);
                    } catch (err: any) {
                        Alert.alert('Error', err?.message ?? 'Failed to send broadcast.');
                    } finally {
                        setSending(false);
                    }
                },
            },
        ]);
    };

    // ── Student marks broadcast ──
    const apiUrl = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:8000';

    const downloadMarksTemplate = async () => {
        try {
            setMarksBusy(true);
            const token = await SecureStore.getItemAsync('auth_token');
            const fileUri = `${FileSystem.documentDirectory}marks-template.xlsx`;
            const { uri } = await FileSystem.downloadAsync(
                `${apiUrl}/api/broadcast/marks/template`,
                fileUri,
                { headers: token ? { Authorization: `Bearer ${token}` } : {} },
            );
            await Linking.openURL(uri);
        } catch (err: any) {
            Alert.alert('Download failed', err?.message ?? 'Could not download the template.');
        } finally { setMarksBusy(false); }
    };

    const pickAndPreviewMarks = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
                copyToCacheDirectory: true,
            });
            if (result.canceled) return;
            const asset = result.assets?.[0];
            if (!asset) return;

            setMarksBusy(true);
            const token = await SecureStore.getItemAsync('auth_token');
            const formData = new FormData();
            formData.append('file', { uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } as any);
            const res = await fetch(`${apiUrl}/api/broadcast/marks/preview`, {
                method: 'POST',
                headers: { Authorization: token ? `Bearer ${token}` : '' },
                body: formData,
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: res.statusText }));
                throw new Error(err.detail ?? 'Failed to parse the Excel file');
            }
            const data = await res.json();
            setMarksRows(data.rows ?? []);
            setMarksSummary(data.summary ?? null);
            setMarksFileName(asset.name);
        } catch (err: any) {
            Alert.alert('Upload failed', err?.message ?? 'Could not read the Excel file.');
            setMarksRows([]); setMarksSummary(null); setMarksFileName('');
        } finally { setMarksBusy(false); }
    };

    const sendMarks = async () => {
        const validRows = marksRows.filter(r => r.valid);
        if (validRows.length === 0) { Alert.alert('Nothing to send', 'No valid rows found.'); return; }
        Alert.alert('Confirm', `Send marks to ${validRows.length} student(s) via WhatsApp?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Send', onPress: async () => {
                    setMarksBusy(true);
                    try {
                        const result: any = await notificationsApi.sendMarks({ rows: validRows, messageTemplate: marksMessage });
                        Alert.alert('Done', `${result?.sent ?? 0} sent, ${result?.failed ?? 0} failed.`);
                    } catch (err: any) {
                        Alert.alert('Error', err?.message ?? 'Failed to send marks.');
                    } finally { setMarksBusy(false); }
                },
            },
        ]);
    };

    const templates = isEmail ? EMAIL_TEMPLATES : WHATSAPP_TEMPLATES;
    const accent = isEmail ? BRAND : WA_GREEN;

    const card = [{ backgroundColor: 'white', marginBottom: 12, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: CARD_BORDER }, SOFT_SM];
    const inputStyle = {
        backgroundColor: '#f9fafb', borderWidth: 1, borderColor: BORDER, borderRadius: 12,
        paddingHorizontal: 16, paddingVertical: 12, color: FG, fontSize: 14,
    };

    return (
        <View style={{ flex: 1, backgroundColor: BG }}>
            <View style={{ backgroundColor: 'white', paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: BORDER }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="arrow-back" size={20} color="#374151" />
                    </TouchableOpacity>
                    <View>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: BRAND, textTransform: 'uppercase', letterSpacing: 2 }}>Broadcast</Text>
                        <Text style={{ fontSize: 22, fontWeight: '700', color: FG }}>Broadcast Messages</Text>
                    </View>
                </View>
                {/* Mode toggle: Announcement vs Marks */}
                <View style={{ flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 12, padding: 4, marginBottom: 8 }}>
                    {([['announcement', 'Announcement', 'megaphone-outline'], ['marks', 'Student Marks', 'school-outline']] as const).map(([m, label, icon]) => {
                        const active = mode === m;
                        return (
                            <TouchableOpacity
                                key={m}
                                style={[{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }, active && { backgroundColor: 'white', ...SOFT_SM }]}
                                onPress={() => setMode(m)}
                            >
                                <Ionicons name={icon as any} size={16} color={active ? BRAND : MUTED_FG} />
                                <Text style={{ fontSize: 14, fontWeight: '600', color: active ? FG : MUTED_FG }}>{label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
                {/* Channel tabs */}
                {mode === 'announcement' && (
                <View style={{ flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 12, padding: 4 }}>
                    {(['email', 'whatsapp'] as Channel[]).map(c => {
                        const active = channel === c;
                        return (
                            <TouchableOpacity
                                key={c}
                                style={[{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }, active && { backgroundColor: 'white', ...SOFT_SM }]}
                                onPress={() => { setChannel(c); setShowTemplates(false); }}
                            >
                                <Ionicons name={c === 'email' ? 'mail-outline' : 'logo-whatsapp'} size={16} color={active ? (c === 'email' ? BRAND : WA_GREEN) : MUTED_FG} />
                                <Text style={{ fontSize: 14, fontWeight: '600', color: active ? FG : MUTED_FG }}>{c === 'email' ? 'Email' : 'WhatsApp'}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
                )}
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>

                    {mode === 'marks' ? (
                    <>
                        {/* Step 1: template + upload */}
                        <View style={card}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: FG, marginBottom: 4 }}>Broadcast Student Marks</Text>
                            <Text style={{ fontSize: 12, color: MUTED_FG, marginBottom: 14 }}>Download the template, fill marks & mobile numbers, upload it back, then send.</Text>
                            <TouchableOpacity
                                disabled={marksBusy}
                                onPress={downloadMarksTemplate}
                                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingVertical: 12, marginBottom: 10 }}
                            >
                                <Ionicons name="download-outline" size={18} color={BRAND} />
                                <Text style={{ fontSize: 14, fontWeight: '600', color: FG }}>Download Excel Template</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                disabled={marksBusy}
                                onPress={pickAndPreviewMarks}
                                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: BRAND, borderRadius: 12, paddingVertical: 12 }}
                            >
                                {marksBusy ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="cloud-upload-outline" size={18} color="white" />}
                                <Text style={{ fontSize: 14, fontWeight: '600', color: 'white' }}>Upload Filled Excel</Text>
                            </TouchableOpacity>
                            {!!marksFileName && (
                                <Text style={{ fontSize: 12, color: MUTED_FG, marginTop: 8 }} numberOfLines={1}>📄 {marksFileName}</Text>
                            )}
                        </View>

                        {/* Step 2: preview */}
                        {marksSummary && (
                            <View style={card}>
                                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: FG, backgroundColor: '#f3f4f6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>{marksSummary.total} rows</Text>
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#15803d', backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>{marksSummary.valid} valid</Text>
                                    {marksSummary.invalid > 0 && (
                                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#b91c1c', backgroundColor: '#fee2e2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>{marksSummary.invalid} skipped</Text>
                                    )}
                                </View>
                                {marksRows.slice(0, 50).map((r, i) => (
                                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: CARD_BORDER }}>
                                        <View style={{ flex: 1, paddingRight: 8 }}>
                                            <Text style={{ fontSize: 14, fontWeight: '600', color: FG }} numberOfLines={1}>{r.studentName || '—'}</Text>
                                            <Text style={{ fontSize: 11, color: MUTED_FG }} numberOfLines={1}>{r.mobileNumber || '—'}  ·  Total: {r.total || '—'}</Text>
                                        </View>
                                        <Ionicons name={r.valid ? 'checkmark-circle' : 'close-circle'} size={20} color={r.valid ? SUCCESS : '#ef4444'} />
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Step 3: message + send */}
                        <View style={card}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: FG, marginBottom: 8 }}>Message Template</Text>
                            <TextInput
                                style={[inputStyle, { minHeight: 120, textAlignVertical: 'top' }]}
                                multiline
                                value={marksMessage}
                                onChangeText={setMarksMessage}
                            />
                            <Text style={{ fontSize: 11, color: MUTED_FG, marginTop: 8 }}>Placeholders: {'{name}'}, {'{marks}'}, {'{total}'}. Sent via the approved <Text style={{ fontWeight: '600' }}>student_marks_v2</Text> WhatsApp template.</Text>
                            <TouchableOpacity
                                disabled={marksBusy || !(marksSummary?.valid ?? 0)}
                                onPress={sendMarks}
                                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: (marksSummary?.valid ?? 0) ? WA_GREEN : '#9ca3af', borderRadius: 12, paddingVertical: 14, marginTop: 14 }}
                            >
                                {marksBusy ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="logo-whatsapp" size={18} color="white" />}
                                <Text style={{ fontSize: 15, fontWeight: '700', color: 'white' }}>Send WhatsApp{marksSummary?.valid ? ` (${marksSummary.valid})` : ''}</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                    ) : (
                    <>
                    {/* Compose */}
                    <View style={card}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: FG }}>Compose {isEmail ? 'Email' : 'WhatsApp'}</Text>
                            <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}
                                onPress={() => setShowTemplates(true)}
                            >
                                <Text style={{ fontSize: 12, fontWeight: '600', color: FG }}>Templates</Text>
                                <Ionicons name="chevron-down" size={12} color={MUTED_FG} />
                            </TouchableOpacity>
                        </View>
                        <Text style={{ fontSize: 12, color: MUTED_FG, marginBottom: 12 }}>Use {'{SchoolName}'} to personalise for each recipient.</Text>

                        {isEmail && (
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 13, fontWeight: '600', color: FG, marginBottom: 6 }}>Subject *</Text>
                                <TextInput
                                    style={inputStyle}
                                    placeholder="e.g. Important Platform Update"
                                    placeholderTextColor="#9ca3af"
                                    value={emailSubject}
                                    onChangeText={setEmailSubject}
                                />
                            </View>
                        )}

                        <View>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: FG, marginBottom: 6 }}>Message *</Text>
                            <TextInput
                                style={{ ...inputStyle, textAlignVertical: 'top', minHeight: 140 }}
                                placeholder={isEmail ? 'Hello {SchoolName}, we have an update...' : 'Dear {SchoolName}, ...'}
                                placeholderTextColor="#9ca3af"
                                value={message}
                                onChangeText={isEmail ? setEmailMessage : setWaMessage}
                                multiline
                            />
                            {!isEmail && (
                                <Text style={{ fontSize: 12, color: waMessage.length > 900 ? '#d97706' : MUTED_FG, textAlign: 'right', marginTop: 4 }}>
                                    {waMessage.length} / 1024 characters
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* Recipients */}
                    <View style={card}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: FG, marginBottom: 12 }}>Targeting & Delivery</Text>
                        {([
                            { value: 'all_schools' as RecipientMode, label: 'All Schools & Colleges', icon: 'people' },
                            { value: 'selected_schools' as RecipientMode, label: 'Selected Institutions', icon: 'business' },
                        ]).map(opt => {
                            const active = recipientMode === opt.value;
                            return (
                                <TouchableOpacity
                                    key={opt.value}
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: active ? BRAND : BORDER, backgroundColor: active ? BRAND + '0d' : '#f9fafb' }}
                                    onPress={() => setRecipientMode(opt.value)}
                                >
                                    <View style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? BRAND + '26' : '#e5e7eb' }}>
                                        <Ionicons name={opt.icon as any} size={18} color={active ? BRAND : MUTED_FG} />
                                    </View>
                                    <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: active ? BRAND : FG }}>
                                        {opt.label}{opt.value === 'selected_schools' && selectedCount > 0 ? ` (${selectedCount})` : ''}
                                    </Text>
                                    {active && <Ionicons name="checkmark-circle" size={20} color={BRAND} />}
                                </TouchableOpacity>
                            );
                        })}

                        {recipientMode === 'selected_schools' && (
                            <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: BORDER, borderRadius: 10, paddingVertical: 10, marginTop: 4 }}
                                onPress={() => setShowSchoolPicker(true)}
                            >
                                <Ionicons name="list-outline" size={16} color={FG} />
                                <Text style={{ fontSize: 13, fontWeight: '600', color: FG }}>
                                    {loadingSchools ? 'Loading schools...' : `Choose schools (${selectedCount} selected)`}
                                </Text>
                            </TouchableOpacity>
                        )}

                        {/* In-app toggle */}
                        <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}
                            onPress={() => setIncludeInApp(v => !v)}
                        >
                            <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: includeInApp ? BRAND : BORDER, backgroundColor: includeInApp ? BRAND : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                                {includeInApp && <Ionicons name="checkmark" size={14} color="white" />}
                            </View>
                            <Ionicons name="notifications-outline" size={16} color={MUTED_FG} />
                            <Text style={{ fontSize: 13, color: FG }}>Also send as in-app notification</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Preview */}
                    {(isEmail ? (emailSubject.trim() || emailMessage.trim()) : waMessage.trim()) ? (
                        <View style={card}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: FG, marginBottom: 12 }}>Preview</Text>
                            {isEmail ? (
                                <View style={{ backgroundColor: '#eef2ff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e0e7ff' }}>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: FG, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#e0e7ff', paddingBottom: 8 }}>
                                        <Text style={{ color: MUTED_FG, fontWeight: '400' }}>Subject: </Text>{emailSubject.trim() || 'No subject'}
                                    </Text>
                                    <Text style={{ fontSize: 13, color: FG, lineHeight: 19 }}>{previewText || 'Email body will appear here...'}</Text>
                                </View>
                            ) : (
                                <View style={{ backgroundColor: '#dcf8c6', borderRadius: 12, padding: 14, alignSelf: 'flex-start', maxWidth: '85%' }}>
                                    <Text style={{ fontSize: 13, color: FG, lineHeight: 19 }}>{previewText || 'Message will appear here...'}</Text>
                                    <Text style={{ fontSize: 10, color: MUTED_FG, textAlign: 'right', marginTop: 6 }}>i-icon Academy</Text>
                                </View>
                            )}
                        </View>
                    ) : null}

                    {/* Result banner */}
                    {lastResult && (
                        <View style={{ backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <Ionicons name="checkmark-circle" size={24} color={SUCCESS} />
                            <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: '#047857' }}>{lastResult}</Text>
                        </View>
                    )}

                    {/* Send button */}
                    <TouchableOpacity
                        style={{ borderRadius: 12, height: 50, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, backgroundColor: (sending || !message.trim() || (isEmail && !emailSubject.trim())) ? accent + '80' : accent }}
                        onPress={handleSend}
                        disabled={sending || !message.trim() || (isEmail && !emailSubject.trim())}
                    >
                        {sending ? (
                            <><ActivityIndicator color="white" size="small" /><Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>Sending...</Text></>
                        ) : (
                            <>
                                <Ionicons name={isEmail ? 'send' : 'logo-whatsapp'} size={18} color="white" />
                                <Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>Send {isEmail ? 'Email' : 'WhatsApp'} Broadcast</Text>
                            </>
                        )}
                    </TouchableOpacity>
                    </>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Templates Modal */}
            <Modal visible={showTemplates} transparent animationType="fade">
                <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 24 }} activeOpacity={1} onPress={() => setShowTemplates(false)}>
                    <View style={{ backgroundColor: 'white', borderRadius: 16, overflow: 'hidden' }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: FG, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: BORDER }}>Choose Template</Text>
                        {templates.map(tpl => (
                            <TouchableOpacity
                                key={tpl.name}
                                style={{ paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: CARD_BORDER }}
                                onPress={() => applyTemplate(tpl)}
                            >
                                <Text style={{ fontSize: 14, color: FG, fontWeight: '500' }}>{tpl.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* School Picker Modal */}
            <Modal visible={showSchoolPicker} transparent animationType="slide">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '75%', paddingBottom: insets.bottom + 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: BORDER }}>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: FG }}>Select Schools ({selectedCount})</Text>
                            <TouchableOpacity onPress={() => setShowSchoolPicker(false)}><Ionicons name="close" size={24} color={MUTED_FG} /></TouchableOpacity>
                        </View>
                        <ScrollView>
                            {loadingSchools ? (
                                <View style={{ paddingVertical: 40, alignItems: 'center' }}><ActivityIndicator color={BRAND} /></View>
                            ) : schools.length === 0 ? (
                                <Text style={{ textAlign: 'center', color: MUTED_FG, paddingVertical: 40 }}>No schools found.</Text>
                            ) : (
                                schools.map(s => {
                                    const checked = selectedSchoolIds.includes(s.id);
                                    return (
                                        <TouchableOpacity
                                            key={s.id}
                                            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: CARD_BORDER }}
                                            onPress={() => toggleSchool(s.id)}
                                        >
                                            <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: checked ? BRAND : BORDER, backgroundColor: checked ? BRAND : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                                                {checked && <Ionicons name="checkmark" size={14} color="white" />}
                                            </View>
                                            <Text style={{ flex: 1, fontSize: 14, color: FG }} numberOfLines={1}>{s.schoolName}</Text>
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                        </ScrollView>
                        <TouchableOpacity
                            style={{ margin: 16, borderRadius: 12, height: 48, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center' }}
                            onPress={() => setShowSchoolPicker(false)}
                        >
                            <Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>Done ({selectedCount})</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
