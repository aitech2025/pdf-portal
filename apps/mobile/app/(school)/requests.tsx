import { useEffect, useState, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, TextInput,
    RefreshControl, ActivityIndicator, Alert, Modal, ScrollView,
    KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { requestsApi } from '@shared/api/index.js';
import { formatDate } from '@shared/utils/format.js';
import { useAuth } from '../../src/context/AuthContext';

/* Design tokens mirrored from apps/web */
const BRAND = '#5b5ff1';
const BG = '#fbfcff';
const FG = '#111827';
const MUTED_FG = '#6b7280';
const BORDER = '#e8ebf0';
const CARD_BORDER = '#eef0f3';
const SUCCESS = '#22c55e';
const WARNING = '#f59e0b';
const DESTRUCTIVE = '#e11d48';
const RADIUS_LG = 16;
const SOFT_SM = {
    shadowColor: '#111a2e', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
};

interface UserReq {
    id: string;
    requestedUserName: string;
    requestedUserEmail: string;
    requestedUserMobile?: string;
    schoolId: string;
    status: string;
    created: string;
    rejectionReason?: string;
}

const STATUS_MAP: Record<string, { bg: string; text: string }> = {
    pending: { bg: '#fef3c7', text: WARNING },
    approved: { bg: '#d1fae5', text: SUCCESS },
    rejected: { bg: '#fee2e2', text: DESTRUCTIVE },
};

function StatusBadge({ status }: { status: string }) {
    const s = STATUS_MAP[status] ?? STATUS_MAP.pending;
    return (
        <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: s.bg }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: s.text, textTransform: 'capitalize' }}>{status}</Text>
        </View>
    );
}

export default function SchoolRequestsScreen() {
    const { user } = useAuth();
    const insets = useSafeAreaInsets();
    const [requests, setRequests] = useState<UserReq[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [mobile, setMobile] = useState('');

    const fetchRequests = useCallback(async () => {
        try {
            const res: any = await requestsApi.listUserRequests({ per_page: 100 });
            setRequests(res.items ?? []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { fetchRequests(); }, [fetchRequests]);

    const handleSubmit = async () => {
        if (!name.trim() || !email.trim()) { Alert.alert('Error', 'Name and email are required.'); return; }
        if (!user?.schoolId) { Alert.alert('Error', 'School ID not found.'); return; }
        setSubmitting(true);
        try {
            const newReq: any = await requestsApi.createUserRequest({
                schoolId: user.schoolId,
                requestedUserName: name.trim(),
                requestedUserEmail: email.trim(),
                requestedUserMobile: mobile.trim() || undefined,
            });
            setRequests(prev => [newReq, ...prev]);
            setShowForm(false);
            setName(''); setEmail(''); setMobile('');
            Alert.alert('Success', 'User request submitted successfully.');
        } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to submit request.');
        } finally { setSubmitting(false); }
    };

    const counts = {
        pending: requests.filter(r => r.status === 'pending').length,
        approved: requests.filter(r => r.status === 'approved').length,
    };

    const renderItem = ({ item }: { item: UserReq }) => (
        <View style={[{
            backgroundColor: 'white', marginHorizontal: 16, marginBottom: 12,
            borderRadius: RADIUS_LG, borderWidth: 1, borderColor: CARD_BORDER, padding: 16,
        }, SOFT_SM]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: BRAND + '1a', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: BRAND, fontWeight: '700', fontSize: 16 }}>
                            {(item.requestedUserName || 'U').charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: FG }} numberOfLines={1}>{item.requestedUserName}</Text>
                        <Text style={{ fontSize: 12, color: MUTED_FG, marginTop: 1 }} numberOfLines={1}>{item.requestedUserEmail}</Text>
                        {item.requestedUserMobile ? (
                            <Text style={{ fontSize: 12, color: MUTED_FG }}>{item.requestedUserMobile}</Text>
                        ) : null}
                    </View>
                </View>
                <StatusBadge status={item.status} />
            </View>
            {item.rejectionReason ? (
                <View style={{ marginTop: 12, backgroundColor: '#fef2f2', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
                    <Text style={{ fontSize: 12, color: DESTRUCTIVE }}>Reason: {item.rejectionReason}</Text>
                </View>
            ) : null}
            <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>{formatDate(item.created)}</Text>
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: BG }}>
            <View style={{ backgroundColor: 'white', paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: CARD_BORDER }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: BRAND, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>
                    School portal
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 24, fontWeight: '700', color: FG }}>User Requests</Text>
                    <TouchableOpacity
                        onPress={() => setShowForm(true)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 5, height: 38, paddingHorizontal: 14, borderRadius: 10, backgroundColor: BRAND }}
                    >
                        <Ionicons name="add" size={18} color="white" />
                        <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>New</Text>
                    </TouchableOpacity>
                </View>
                {requests.length > 0 && (
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fffbeb', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: WARNING }} />
                            <Text style={{ fontSize: 12, color: '#b45309', fontWeight: '500' }}>{counts.pending} Pending</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ecfdf5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: SUCCESS }} />
                            <Text style={{ fontSize: 12, color: '#047857', fontWeight: '500' }}>{counts.approved} Approved</Text>
                        </View>
                    </View>
                )}
            </View>

            {loading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color={BRAND} />
                </View>
            ) : (
                <FlatList
                    data={requests}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 24 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRequests(); }} tintColor={BRAND} />
                    }
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
                            <Ionicons name="person-add-outline" size={48} color="#d1d5db" />
                            <Text style={{ fontSize: 15, fontWeight: '600', color: FG, marginTop: 12 }}>No requests yet</Text>
                            <Text style={{ fontSize: 13, color: MUTED_FG, marginTop: 4 }}>Tap New to submit a user request</Text>
                        </View>
                    }
                />
            )}

            {/* New Request Modal */}
            <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                        <View style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 24, paddingBottom: insets.bottom + 24 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                                <Text style={{ fontSize: 18, fontWeight: '700', color: FG }}>New User Request</Text>
                                <TouchableOpacity onPress={() => setShowForm(false)}>
                                    <Ionicons name="close" size={24} color={MUTED_FG} />
                                </TouchableOpacity>
                            </View>

                            {([
                                { label: 'Full Name *', value: name, setter: setName, placeholder: 'Enter full name', keyboard: 'default' },
                                { label: 'Email Address *', value: email, setter: setEmail, placeholder: 'user@example.com', keyboard: 'email-address' },
                                { label: 'Mobile Number', value: mobile, setter: setMobile, placeholder: '+91 9876543210', keyboard: 'phone-pad' },
                            ] as const).map(field => (
                                <View key={field.label} style={{ marginBottom: 16 }}>
                                    <Text style={{ fontSize: 13, fontWeight: '500', color: FG, marginBottom: 6 }}>{field.label}</Text>
                                    <TextInput
                                        style={{ backgroundColor: '#f9fafb', borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: FG, fontSize: 14 }}
                                        placeholder={field.placeholder}
                                        placeholderTextColor="#9ca3af"
                                        value={field.value}
                                        onChangeText={field.setter}
                                        keyboardType={field.keyboard as any}
                                        autoCapitalize={field.keyboard === 'email-address' ? 'none' : 'words'}
                                    />
                                </View>
                            ))}

                            <TouchableOpacity
                                onPress={handleSubmit}
                                disabled={submitting}
                                style={{ marginTop: 4, borderRadius: 12, height: 50, alignItems: 'center', justifyContent: 'center', backgroundColor: submitting ? BRAND + '99' : BRAND }}
                            >
                                {submitting ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>Submit Request</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}
