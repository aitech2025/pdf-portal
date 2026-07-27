import { useEffect, useState, useCallback } from 'react';
import {
    View, Text, FlatList, RefreshControl, ActivityIndicator,
    TouchableOpacity, TextInput, ScrollView, Alert, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';
import { apiFetch } from '../../src/lib/apiClient';

/* Design tokens mirrored from apps/web (index.css / tailwind.config.js) */
const API_URL = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:8000';
const BRAND = '#5b5ff1';
const BG = '#fbfcff';
const FG = '#111827';
const MUTED_FG = '#6b7280';
const BORDER = '#e8ebf0';
const CARD_BORDER = '#eef0f3';
const RADIUS_LG = 16;
const SOFT_SM = {
    shadowColor: '#111a2e', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
};

interface AuditLog {
    id: string;
    action?: string;
    userId?: string;
    userName?: string;
    userEmail?: string;
    ipAddress?: string;
    actionDetails?: string;
    details?: string;
    resourceType?: string;
    timestamp?: string;
    created?: string;
}

/* action filter options — mirrors web ACTION_OPTIONS */
const ACTION_OPTIONS = [
    { value: 'all', label: 'All' },
    { value: 'login', label: 'Login' },
    { value: 'upload', label: 'Upload' },
    { value: 'download', label: 'Download' },
    { value: 'delete', label: 'Delete' },
    { value: 'approve', label: 'Approve' },
    { value: 'reject', label: 'Reject' },
];

const ACTION_STYLES: Record<string, { icon: string; color: string; bg: string }> = {
    login: { icon: 'log-in', color: '#059669', bg: '#d1fae5' },
    logout: { icon: 'log-out', color: '#6b7280', bg: '#f3f4f6' },
    upload: { icon: 'cloud-upload', color: '#2563eb', bg: '#dbeafe' },
    download: { icon: 'download', color: '#059669', bg: '#d1fae5' },
    create: { icon: 'add-circle', color: '#2563eb', bg: '#dbeafe' },
    update: { icon: 'pencil', color: '#d97706', bg: '#fef3c7' },
    delete: { icon: 'trash', color: '#dc2626', bg: '#fee2e2' },
    approve: { icon: 'checkmark-circle', color: '#059669', bg: '#d1fae5' },
    reject: { icon: 'close-circle', color: '#d97706', bg: '#fef3c7' },
    default: { icon: 'ellipse', color: BRAND, bg: '#ede9fe' },
};

function getStyle(action?: string) {
    const key = Object.keys(ACTION_STYLES).find(
        k => k !== 'default' && action?.toLowerCase().includes(k),
    ) ?? 'default';
    return ACTION_STYLES[key];
}

const formatDateTime = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString();
};

const PER_PAGE = 30;

export default function AuditScreen() {
    const insets = useSafeAreaInsets();

    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [exporting, setExporting] = useState(false);

    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('all');

    const fetchLogs = useCallback(async (pageNum = 1, append = false) => {
        try {
            const params = new URLSearchParams({ page: String(pageNum), per_page: String(PER_PAGE) });
            if (actionFilter !== 'all') params.set('action', actionFilter);
            const res = await apiFetch(`/api/auditLogs?${params.toString()}`);
            const items: AuditLog[] = res.items ?? [];
            if (append) setLogs(prev => [...prev, ...items]);
            else setLogs(items);
            setHasMore(items.length === PER_PAGE);
            setPage(pageNum);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); setLoadingMore(false); }
    }, [actionFilter]);

    useEffect(() => { setLoading(true); fetchLogs(1); }, [fetchLogs]);

    const loadMore = () => {
        if (!hasMore || loadingMore || loading) return;
        setLoadingMore(true);
        fetchLogs(page + 1, true);
    };

    const handleExport = async () => {
        try {
            setExporting(true);
            const token = await SecureStore.getItemAsync('auth_token');
            if (!token) { Alert.alert('Session expired', 'Please login again.'); return; }
            const params = new URLSearchParams();
            if (actionFilter !== 'all') params.set('action', actionFilter);
            const stamp = new Date().toISOString().slice(0, 10);
            const fileUri = `${FileSystem.documentDirectory}audit-logs-${stamp}.csv`;
            const { uri } = await FileSystem.downloadAsync(
                `${API_URL}/api/auditLogs/export?${params.toString()}`,
                fileUri,
                { headers: { Authorization: `Bearer ${token}` } },
            );
            await Linking.openURL(uri);
        } catch (e: any) {
            Alert.alert('Export failed', e?.message || 'Unable to export audit logs.');
        } finally { setExporting(false); }
    };

    /* client-side search across displayed fields — mirrors web */
    const term = search.trim().toLowerCase();
    const filtered = term
        ? logs.filter(l => [l.action, l.userName, l.userEmail, l.actionDetails, l.details, l.resourceType, l.ipAddress]
            .some(v => v && String(v).toLowerCase().includes(term)))
        : logs;

    const renderItem = ({ item }: { item: AuditLog }) => {
        const style = getStyle(item.action);
        const details = item.actionDetails ?? item.details;
        return (
            <View style={[{
                backgroundColor: 'white', borderRadius: RADIUS_LG, borderWidth: 1,
                borderColor: CARD_BORDER, padding: 14, marginBottom: 10,
            }, SOFT_SM]}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                    <View style={{
                        width: 40, height: 40, borderRadius: 12,
                        backgroundColor: style.bg, alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Ionicons name={style.icon as any} size={18} color={style.color} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: FG, textTransform: 'capitalize', flex: 1 }} numberOfLines={1}>
                                {item.action ?? 'Action'}
                            </Text>
                            <Text style={{ fontSize: 11, color: MUTED_FG }}>{formatDateTime(item.timestamp ?? item.created)}</Text>
                        </View>
                        {(item.userName || item.userEmail) ? (
                            <Text style={{ fontSize: 12, color: MUTED_FG, marginTop: 2 }} numberOfLines={1}>
                                {item.userName ?? item.userEmail}
                            </Text>
                        ) : (
                            <Text style={{ fontSize: 12, color: MUTED_FG, marginTop: 2 }}>System</Text>
                        )}
                        {details ? (
                            <Text style={{ fontSize: 12, color: MUTED_FG, marginTop: 4 }} numberOfLines={2}>{details}</Text>
                        ) : null}
                        {item.ipAddress ? (
                            <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, fontFamily: 'monospace' }}>{item.ipAddress}</Text>
                        ) : null}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: BG }}>
            {/* Header */}
            <View style={{
                backgroundColor: 'white', paddingHorizontal: 20, paddingTop: insets.top + 12,
                paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: BORDER,
                flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12,
            }}>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 24, fontWeight: '700', color: FG }}>Audit Logs</Text>
                    <Text style={{ fontSize: 13, color: MUTED_FG, marginTop: 2 }}>Security and activity tracking.</Text>
                </View>
                <TouchableOpacity
                    onPress={handleExport}
                    disabled={exporting}
                    style={{
                        flexDirection: 'row', alignItems: 'center', gap: 6,
                        borderWidth: 1, borderColor: BORDER, borderRadius: 10,
                        paddingHorizontal: 12, paddingVertical: 8,
                    }}
                >
                    {exporting
                        ? <ActivityIndicator size="small" color={BRAND} />
                        : <Ionicons name="download-outline" size={16} color={FG} />}
                    <Text style={{ fontSize: 13, fontWeight: '600', color: FG }}>CSV</Text>
                </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
                <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 8,
                    backgroundColor: 'white', borderWidth: 1, borderColor: BORDER,
                    borderRadius: 12, paddingHorizontal: 12, height: 44,
                }}>
                    <Ionicons name="search" size={18} color={MUTED_FG} />
                    <TextInput
                        placeholder="Search user or details..."
                        placeholderTextColor="#9ca3af"
                        value={search}
                        onChangeText={setSearch}
                        style={{ flex: 1, fontSize: 14, color: FG }}
                    />
                    {search ? (
                        <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
                            <Ionicons name="close-circle" size={18} color="#9ca3af" />
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>

            {/* Action filter chips */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
                style={{ maxHeight: 56, flexGrow: 0 }}
            >
                {ACTION_OPTIONS.map(o => {
                    const active = actionFilter === o.value;
                    return (
                        <TouchableOpacity
                            key={o.value}
                            onPress={() => { setActionFilter(o.value); }}
                            style={{
                                paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
                                backgroundColor: active ? BRAND : 'white',
                                borderWidth: 1, borderColor: active ? BRAND : BORDER,
                            }}
                        >
                            <Text style={{ fontSize: 13, fontWeight: '600', color: active ? 'white' : MUTED_FG }}>{o.label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {loading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color={BRAND} />
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: insets.bottom + 24 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLogs(1); }} tintColor={BRAND} />
                    }
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.3}
                    ListFooterComponent={loadingMore ? <ActivityIndicator color={BRAND} style={{ marginVertical: 16 }} /> : null}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
                            <Ionicons name="shield-outline" size={48} color="#d1d5db" />
                            <Text style={{ color: MUTED_FG, fontWeight: '600', marginTop: 12 }}>No audit logs found.</Text>
                        </View>
                    }
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}
