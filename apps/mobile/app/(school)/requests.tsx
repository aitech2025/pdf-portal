import { useEffect, useState, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, TextInput,
    RefreshControl, ActivityIndicator, Alert, Modal, ScrollView,
    KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { requestsApi } from '@shared/api/index.js';
import { formatDate } from '@shared/utils/format.js';
import { useAuth } from '../../src/context/AuthContext';

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

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { bg: string; text: string }> = {
        pending: { bg: '#fef3c7', text: '#d97706' },
        approved: { bg: '#d1fae5', text: '#059669' },
        rejected: { bg: '#fee2e2', text: '#dc2626' },
    };
    const s = map[status] ?? map.pending;
    return (
        <View className="px-2.5 py-0.5 rounded-full" style={{ backgroundColor: s.bg }}>
            <Text className="text-xs font-semibold capitalize" style={{ color: s.text }}>{status}</Text>
        </View>
    );
}

export default function SchoolRequestsScreen() {
    const { user } = useAuth();
    const [requests, setRequests] = useState<UserReq[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [mobile, setMobile] = useState('');

    const fetchRequests = useCallback(async () => {
        try {
            const res = await requestsApi.listUserRequests({ per_page: 100 });
            setRequests(res.items ?? []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { fetchRequests(); }, []);

    const handleSubmit = async () => {
        if (!name.trim() || !email.trim()) {
            Alert.alert('Error', 'Name and email are required.');
            return;
        }
        if (!user?.schoolId) {
            Alert.alert('Error', 'School ID not found.');
            return;
        }
        setSubmitting(true);
        try {
            const newReq = await requestsApi.createUserRequest({
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
            Alert.alert('Error', e.message || 'Failed to submit request.');
        } finally { setSubmitting(false); }
    };

    const renderItem = ({ item }: { item: UserReq }) => (
        <View className="bg-white mx-4 mb-3 rounded-2xl p-4 border border-border">
            <View className="flex-row items-start justify-between">
                <View className="flex-row items-center gap-3 flex-1 mr-3">
                    <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center shrink-0">
                        <Text className="text-primary font-bold text-base">
                            {(item.requestedUserName || 'U').charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <View className="flex-1 min-w-0">
                        <Text className="font-semibold text-foreground" numberOfLines={1}>{item.requestedUserName}</Text>
                        <Text className="text-xs text-muted mt-0.5" numberOfLines={1}>{item.requestedUserEmail}</Text>
                        {item.requestedUserMobile && (
                            <Text className="text-xs text-muted">{item.requestedUserMobile}</Text>
                        )}
                    </View>
                </View>
                <StatusBadge status={item.status} />
            </View>
            {item.rejectionReason && (
                <View className="mt-3 bg-red-50 rounded-xl px-3 py-2">
                    <Text className="text-xs text-red-600">Reason: {item.rejectionReason}</Text>
                </View>
            )}
            <Text className="text-xs text-muted/60 mt-2">{formatDate(item.created)}</Text>
        </View>
    );

    const counts = {
        pending: requests.filter(r => r.status === 'pending').length,
        approved: requests.filter(r => r.status === 'approved').length,
    };

    return (
        <View className="flex-1 bg-background">
            <View className="bg-white px-5 pt-14 pb-4 border-b border-border">
                <View className="flex-row items-center justify-between">
                    <Text className="text-2xl font-bold text-foreground">User Requests</Text>
                    <TouchableOpacity
                        className="w-9 h-9 rounded-xl bg-primary items-center justify-center"
                        onPress={() => setShowForm(true)}
                    >
                        <Ionicons name="add" size={20} color="white" />
                    </TouchableOpacity>
                </View>
                {/* Stats row */}
                {requests.length > 0 && (
                    <View className="flex-row gap-3 mt-3">
                        <View className="flex-row items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-lg">
                            <View className="w-2 h-2 rounded-full bg-amber-400" />
                            <Text className="text-xs text-amber-700 font-medium">{counts.pending} Pending</Text>
                        </View>
                        <View className="flex-row items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg">
                            <View className="w-2 h-2 rounded-full bg-emerald-400" />
                            <Text className="text-xs text-emerald-700 font-medium">{counts.approved} Approved</Text>
                        </View>
                    </View>
                )}
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#4f46e5" />
                </View>
            ) : (
                <FlatList
                    data={requests}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); fetchRequests(); }}
                            tintColor="#4f46e5"
                        />
                    }
                    ListEmptyComponent={
                        <View className="items-center justify-center py-20">
                            <Ionicons name="person-add-outline" size={48} color="#d1d5db" />
                            <Text className="text-foreground font-medium mt-3">No requests yet</Text>
                            <Text className="text-muted text-sm mt-1">Tap + to submit a new user request</Text>
                        </View>
                    }
                />
            )}

            {/* New Request Modal */}
            <Modal visible={showForm} transparent animationType="slide">
                <KeyboardAvoidingView
                    className="flex-1"
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View className="flex-1 bg-black/50 justify-end">
                        <View className="bg-white rounded-t-3xl px-6 pt-6 pb-8">
                            <View className="flex-row items-center justify-between mb-5">
                                <Text className="text-lg font-bold text-foreground">New User Request</Text>
                                <TouchableOpacity onPress={() => setShowForm(false)}>
                                    <Ionicons name="close" size={24} color="#6b7280" />
                                </TouchableOpacity>
                            </View>

                            {[
                                { label: 'Full Name *', value: name, setter: setName, placeholder: 'Enter full name', keyboard: 'default' },
                                { label: 'Email Address *', value: email, setter: setEmail, placeholder: 'user@example.com', keyboard: 'email-address' },
                                { label: 'Mobile Number', value: mobile, setter: setMobile, placeholder: '+91 9876543210', keyboard: 'phone-pad' },
                            ].map(field => (
                                <View key={field.label} className="mb-4">
                                    <Text className="text-sm font-medium text-foreground mb-1.5">{field.label}</Text>
                                    <TextInput
                                        className="bg-gray-50 border border-border rounded-xl px-4 py-3 text-foreground text-sm"
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
                                className={`mt-2 rounded-xl py-4 items-center ${submitting ? 'bg-primary/60' : 'bg-primary'}`}
                                onPress={handleSubmit}
                                disabled={submitting}
                            >
                                {submitting
                                    ? <ActivityIndicator color="white" />
                                    : <Text className="text-white font-semibold text-base">Submit Request</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}
