import { useEffect, useState, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, TextInput,
    RefreshControl, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { requestsApi } from '@shared/api/index.js';
import { formatDate } from '@shared/utils/format.js';

/* Design tokens mirrored from apps/web */
const BRAND = '#5b5ff1';
const BG = '#fbfcff';
const FG = '#111827';
const MUTED_FG = '#6b7280';
const BORDER = '#e8ebf0';
const CARD_BORDER = '#eef0f3';
const SUCCESS = '#22c55e';
const DESTRUCTIVE = '#e11d48';
const RADIUS_LG = 16;
const SOFT_SM = {
    shadowColor: '#111a2e', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
};

type Tab = 'onboarding' | 'users';

interface OnboardingReq {
    id: string; schoolName: string; email: string; location?: string;
    mobileNumber?: string; pointOfContactName?: string; status: string; created: string;
}
interface UserReq {
    id: string; requestedUserName: string; requestedUserEmail: string;
    requestedUserMobile?: string; schoolId: string; status: string; created: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
    pending: { bg: '#fef3c7', text: '#d97706' },
    approved: { bg: '#d1fae5', text: '#059669' },
    rejected: { bg: '#fee2e2', text: '#dc2626' },
};

function StatusBadge({ status }: { status: string }) {
    const s = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
    return (
        <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: s.bg }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: s.text, textTransform: 'capitalize' }}>{status}</Text>
        </View>
    );
}

export default function RequestsScreen() {
    const insets = useSafeAreaInsets();
    const [tab, setTab] = useState<Tab>('onboarding');
    const [onboarding, setOnboarding] = useState<OnboardingReq[]>([]);
    const [userReqs, setUserReqs] = useState<UserReq[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
    const [rejectModal, setRejectModal] = useState<{ id: string; type: Tab } | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    const fetchAll = useCallback(async () => {
        try {
            const [ob, ur] = await Promise.all([
                requestsApi.listOnboardingRequests({ per_page: 100 }),
                requestsApi.listUserRequests({ per_page: 100 }),
            ]);
            setOnboarding(ob.items ?? []);
            setUserReqs(ur.items ?? []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleApprove = (id: string, type: Tab) => {
        Alert.alert('Approve', 'Are you sure you want to approve this request?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Approve',
                onPress: async () => {
                    setActionLoading(p => ({ ...p, [id]: true }));
                    try {
                        if (type === 'onboarding') {
                            await requestsApi.approveOnboardingRequest(id);
                            setOnboarding(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));
                        } else {
                            await requestsApi.approveUserRequest(id);
                            setUserReqs(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));
                        }
                    } catch (e: any) { Alert.alert('Error', e.message); }
                    finally { setActionLoading(p => ({ ...p, [id]: false })); }
                },
            },
        ]);
    };

    const handleReject = (id: string, type: Tab) => {
        setRejectReason('');
        setRejectModal({ id, type });
    };

    const submitReject = async () => {
        if (!rejectModal) return;
        const { id, type } = rejectModal;
        setActionLoading(p => ({ ...p, [id]: true }));
        setRejectModal(null);
        try {
            if (type === 'onboarding') {
                await requestsApi.rejectOnboardingRequest(id, rejectReason);
                setOnboarding(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r));
            } else {
                await requestsApi.rejectUserRequest(id, rejectReason);
                setUserReqs(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r));
            }
        } catch (e: any) { Alert.alert('Error', e.message); }
        finally { setActionLoading(p => ({ ...p, [id]: false })); }
    };

    const ActionRow = ({ id, type }: { id: string; type: Tab }) => (
        <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
                style={{
                    flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: SUCCESS,
                    alignItems: 'center', justifyContent: 'center',
                }}
                onPress={() => handleApprove(id, type)}
                disabled={!!actionLoading[id]}
            >
                {actionLoading[id]
                    ? <ActivityIndicator size="small" color="white" />
                    : <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>Approve</Text>}
            </TouchableOpacity>
            <TouchableOpacity
                style={{
                    flex: 1, paddingVertical: 10, borderRadius: 12,
                    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca',
                    alignItems: 'center', justifyContent: 'center',
                }}
                onPress={() => handleReject(id, type)}
                disabled={!!actionLoading[id]}
            >
                <Text style={{ color: DESTRUCTIVE, fontSize: 14, fontWeight: '600' }}>Reject</Text>
            </TouchableOpacity>
        </View>
    );

    const renderOnboarding = ({ item }: { item: OnboardingReq }) => (
        <View style={[{
            backgroundColor: 'white', borderRadius: RADIUS_LG, borderWidth: 1,
            borderColor: CARD_BORDER, padding: 16, marginBottom: 12,
        }, SOFT_SM]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flex: 1, marginRight: 12, minWidth: 0 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: FG }} numberOfLines={1}>{item.schoolName}</Text>
                    <Text style={{ fontSize: 12, color: MUTED_FG, marginTop: 2 }}>{item.email}</Text>
                    {item.location ? <Text style={{ fontSize: 12, color: MUTED_FG }}>{item.location}</Text> : null}
                    {item.pointOfContactName ? <Text style={{ fontSize: 12, color: MUTED_FG }}>Contact: {item.pointOfContactName}</Text> : null}
                </View>
                <StatusBadge status={item.status} />
            </View>
            <Text style={{ fontSize: 11, color: '#9ca3af', marginBottom: 12 }}>{formatDate(item.created)}</Text>
            {item.status === 'pending' && <ActionRow id={item.id} type="onboarding" />}
        </View>
    );

    const renderUserReq = ({ item }: { item: UserReq }) => (
        <View style={[{
            backgroundColor: 'white', borderRadius: RADIUS_LG, borderWidth: 1,
            borderColor: CARD_BORDER, padding: 16, marginBottom: 12,
        }, SOFT_SM]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flex: 1, marginRight: 12, minWidth: 0 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: FG }} numberOfLines={1}>{item.requestedUserName}</Text>
                    <Text style={{ fontSize: 12, color: MUTED_FG, marginTop: 2 }}>{item.requestedUserEmail}</Text>
                    {item.requestedUserMobile ? <Text style={{ fontSize: 12, color: MUTED_FG }}>{item.requestedUserMobile}</Text> : null}
                </View>
                <StatusBadge status={item.status} />
            </View>
            <Text style={{ fontSize: 11, color: '#9ca3af', marginBottom: 12 }}>{formatDate(item.created)}</Text>
            {item.status === 'pending' && <ActionRow id={item.id} type="users" />}
        </View>
    );

    const currentData = tab === 'onboarding' ? onboarding : userReqs;
    const pendingCount = {
        onboarding: onboarding.filter(r => r.status === 'pending').length,
        users: userReqs.filter(r => r.status === 'pending').length,
    };

    return (
        <View style={{ flex: 1, backgroundColor: BG }}>
            {/* Header */}
            <View style={{
                backgroundColor: 'white', paddingHorizontal: 20, paddingTop: insets.top + 12,
                paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: BORDER,
            }}>
                <Text style={{ fontSize: 24, fontWeight: '700', color: FG }}>Requests</Text>
                <Text style={{ fontSize: 13, color: MUTED_FG, marginTop: 2 }}>Review onboarding and user requests.</Text>
            </View>

            {/* Tab Switch */}
            <View style={{
                marginHorizontal: 16, marginTop: 12, marginBottom: 4,
                flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 4,
            }}>
                {([
                    { key: 'onboarding', label: 'Onboarding' },
                    { key: 'users', label: 'User Requests' },
                ] as { key: Tab; label: string }[]).map(t => {
                    const active = tab === t.key;
                    return (
                        <TouchableOpacity
                            key={t.key}
                            style={[{
                                flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                                gap: 6, paddingVertical: 10, borderRadius: 9,
                                backgroundColor: active ? 'white' : 'transparent',
                            }, active ? SOFT_SM : null]}
                            onPress={() => setTab(t.key)}
                        >
                            <Text style={{ fontSize: 14, fontWeight: '600', color: active ? FG : MUTED_FG }}>{t.label}</Text>
                            {pendingCount[t.key] > 0 && (
                                <View style={{ minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center' }}>
                                    <Text style={{ color: 'white', fontSize: 10, fontWeight: '700' }}>{pendingCount[t.key]}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>

            {loading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color={BRAND} />
                </View>
            ) : (
                <FlatList
                    data={currentData as any}
                    keyExtractor={item => (item as any).id}
                    renderItem={tab === 'onboarding' ? renderOnboarding as any : renderUserReq as any}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 24 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor={BRAND} />}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
                            <Ionicons name="clipboard-outline" size={48} color="#d1d5db" />
                            <Text style={{ color: MUTED_FG, fontWeight: '600', marginTop: 12 }}>No requests</Text>
                        </View>
                    }
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Reject Reason Modal */}
            <Modal visible={!!rejectModal} transparent animationType="fade">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: insets.bottom + 24 }}>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: FG, marginBottom: 4 }}>Reject Request</Text>
                        <Text style={{ fontSize: 13, color: MUTED_FG, marginBottom: 16 }}>Provide a reason for rejection (optional)</Text>
                        <TextInput
                            style={{
                                backgroundColor: '#f9fafb', borderWidth: 1, borderColor: BORDER, borderRadius: 12,
                                paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: FG,
                                marginBottom: 16, minHeight: 80, textAlignVertical: 'top',
                            }}
                            placeholder="Enter rejection reason..."
                            placeholderTextColor="#9ca3af"
                            value={rejectReason}
                            onChangeText={setRejectReason}
                            multiline
                        />
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                                style={{ flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: BORDER, alignItems: 'center' }}
                                onPress={() => setRejectModal(null)}
                            >
                                <Text style={{ color: FG, fontWeight: '600' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: DESTRUCTIVE, alignItems: 'center' }}
                                onPress={submitReject}
                            >
                                <Text style={{ color: 'white', fontWeight: '600' }}>Reject</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
