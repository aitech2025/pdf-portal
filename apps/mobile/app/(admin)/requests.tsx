import { useEffect, useState, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, TextInput,
    RefreshControl, ActivityIndicator, Alert, Modal, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { requestsApi } from '@shared/api/index.js';
import { formatDate } from '@shared/utils/format.js';

type Tab = 'onboarding' | 'users';

interface OnboardingReq {
    id: string;
    schoolName: string;
    email: string;
    location?: string;
    mobileNumber?: string;
    pointOfContactName?: string;
    status: string;
    created: string;
}
interface UserReq {
    id: string;
    requestedUserName: string;
    requestedUserEmail: string;
    requestedUserMobile?: string;
    schoolId: string;
    status: string;
    created: string;
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, { bg: string; text: string }> = {
        pending: { bg: '#fef3c7', text: '#d97706' },
        approved: { bg: '#d1fae5', text: '#059669' },
        rejected: { bg: '#fee2e2', text: '#dc2626' },
    };
    const s = styles[status] ?? styles.pending;
    return (
        <View className="px-2.5 py-0.5 rounded-full" style={{ backgroundColor: s.bg }}>
            <Text className="text-xs font-semibold capitalize" style={{ color: s.text }}>{status}</Text>
        </View>
    );
}

export default function RequestsScreen() {
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

    useEffect(() => { fetchAll(); }, []);

    const handleApprove = async (id: string, type: Tab) => {
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

    const renderOnboarding = ({ item }: { item: OnboardingReq }) => (
        <View className="bg-white mx-4 mb-3 rounded-2xl p-4 border border-border">
            <View className="flex-row items-start justify-between mb-2">
                <View className="flex-1 mr-3">
                    <Text className="font-semibold text-foreground text-base" numberOfLines={1}>{item.schoolName}</Text>
                    <Text className="text-xs text-muted mt-0.5">{item.email}</Text>
                    {item.location && <Text className="text-xs text-muted">{item.location}</Text>}
                    {item.pointOfContactName && (
                        <Text className="text-xs text-muted">Contact: {item.pointOfContactName}</Text>
                    )}
                </View>
                <StatusBadge status={item.status} />
            </View>
            <Text className="text-xs text-muted/60 mb-3">{formatDate(item.created)}</Text>
            {item.status === 'pending' && (
                <View className="flex-row gap-2">
                    <TouchableOpacity
                        className="flex-1 py-2.5 rounded-xl bg-emerald-500 items-center"
                        onPress={() => handleApprove(item.id, 'onboarding')}
                        disabled={!!actionLoading[item.id]}
                    >
                        {actionLoading[item.id]
                            ? <ActivityIndicator size="small" color="white" />
                            : <Text className="text-white text-sm font-semibold">Approve</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity
                        className="flex-1 py-2.5 rounded-xl bg-red-50 border border-red-200 items-center"
                        onPress={() => handleReject(item.id, 'onboarding')}
                        disabled={!!actionLoading[item.id]}
                    >
                        <Text className="text-red-600 text-sm font-semibold">Reject</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    const renderUserReq = ({ item }: { item: UserReq }) => (
        <View className="bg-white mx-4 mb-3 rounded-2xl p-4 border border-border">
            <View className="flex-row items-start justify-between mb-2">
                <View className="flex-1 mr-3">
                    <Text className="font-semibold text-foreground text-base">{item.requestedUserName}</Text>
                    <Text className="text-xs text-muted mt-0.5">{item.requestedUserEmail}</Text>
                    {item.requestedUserMobile && (
                        <Text className="text-xs text-muted">{item.requestedUserMobile}</Text>
                    )}
                </View>
                <StatusBadge status={item.status} />
            </View>
            <Text className="text-xs text-muted/60 mb-3">{formatDate(item.created)}</Text>
            {item.status === 'pending' && (
                <View className="flex-row gap-2">
                    <TouchableOpacity
                        className="flex-1 py-2.5 rounded-xl bg-emerald-500 items-center"
                        onPress={() => handleApprove(item.id, 'users')}
                        disabled={!!actionLoading[item.id]}
                    >
                        {actionLoading[item.id]
                            ? <ActivityIndicator size="small" color="white" />
                            : <Text className="text-white text-sm font-semibold">Approve</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity
                        className="flex-1 py-2.5 rounded-xl bg-red-50 border border-red-200 items-center"
                        onPress={() => handleReject(item.id, 'users')}
                        disabled={!!actionLoading[item.id]}
                    >
                        <Text className="text-red-600 text-sm font-semibold">Reject</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    const currentData = tab === 'onboarding' ? onboarding : userReqs;
    const pendingCount = {
        onboarding: onboarding.filter(r => r.status === 'pending').length,
        users: userReqs.filter(r => r.status === 'pending').length,
    };

    return (
        <View className="flex-1 bg-background">
            {/* Header */}
            <View className="bg-white px-5 pt-14 pb-4 border-b border-border">
                <Text className="text-2xl font-bold text-foreground">Requests</Text>
            </View>

            {/* Tab Switch */}
            <View className="mx-4 mt-3 mb-1 flex-row bg-gray-100 rounded-xl p-1">
                {([
                    { key: 'onboarding', label: 'Onboarding' },
                    { key: 'users', label: 'User Requests' },
                ] as { key: Tab; label: string }[]).map(t => (
                    <TouchableOpacity
                        key={t.key}
                        className={`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-lg ${tab === t.key ? 'bg-white shadow-sm' : ''}`}
                        onPress={() => setTab(t.key)}
                    >
                        <Text className={`text-sm font-semibold ${tab === t.key ? 'text-foreground' : 'text-muted'}`}>
                            {t.label}
                        </Text>
                        {pendingCount[t.key] > 0 && (
                            <View className="w-5 h-5 rounded-full bg-primary items-center justify-center">
                                <Text className="text-white text-[10px] font-bold">{pendingCount[t.key]}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#4f46e5" />
                </View>
            ) : (
                <FlatList
                    data={currentData as any}
                    keyExtractor={item => (item as any).id}
                    renderItem={tab === 'onboarding' ? renderOnboarding : renderUserReq}
                    contentContainerStyle={{ paddingTop: 8, paddingBottom: 24 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor="#4f46e5" />}
                    ListEmptyComponent={
                        <View className="items-center justify-center py-20">
                            <Ionicons name="clipboard-outline" size={48} color="#d1d5db" />
                            <Text className="text-foreground font-medium mt-3">No requests</Text>
                        </View>
                    }
                />
            )}

            {/* Reject Reason Modal */}
            <Modal visible={!!rejectModal} transparent animationType="fade">
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white rounded-t-3xl p-6">
                        <Text className="text-lg font-bold text-foreground mb-1">Reject Request</Text>
                        <Text className="text-sm text-muted mb-4">Provide a reason for rejection (optional)</Text>
                        <TextInput
                            className="bg-gray-50 border border-border rounded-xl px-4 py-3 text-foreground text-sm mb-4"
                            placeholder="Enter rejection reason..."
                            placeholderTextColor="#9ca3af"
                            value={rejectReason}
                            onChangeText={setRejectReason}
                            multiline
                            numberOfLines={3}
                            style={{ textAlignVertical: 'top', minHeight: 80 }}
                        />
                        <View className="flex-row gap-3">
                            <TouchableOpacity
                                className="flex-1 py-3 rounded-xl border border-border items-center"
                                onPress={() => setRejectModal(null)}
                            >
                                <Text className="text-foreground font-semibold">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="flex-1 py-3 rounded-xl bg-red-500 items-center"
                                onPress={submitReject}
                            >
                                <Text className="text-white font-semibold">Reject</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
