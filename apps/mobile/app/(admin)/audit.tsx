import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../src/lib/apiClient';
import { formatDateTime } from '@shared/utils/format.js';

interface AuditLog {
    id: string; action: string; userId?: string; userName?: string;
    ipAddress?: string; details?: string; created: string;
}

const ACTION_STYLES: Record<string, { icon: string; color: string; bg: string }> = {
    login: { icon: 'log-in', color: '#059669', bg: '#d1fae5' },
    logout: { icon: 'log-out', color: '#6b7280', bg: '#f3f4f6' },
    create: { icon: 'add-circle', color: '#2563eb', bg: '#dbeafe' },
    update: { icon: 'pencil', color: '#d97706', bg: '#fef3c7' },
    delete: { icon: 'trash', color: '#dc2626', bg: '#fee2e2' },
    approve: { icon: 'checkmark-circle', color: '#059669', bg: '#d1fae5' },
    reject: { icon: 'close-circle', color: '#dc2626', bg: '#fee2e2' },
    default: { icon: 'ellipse', color: '#4f46e5', bg: '#ede9fe' },
};

function getStyle(action: string) {
    const key = Object.keys(ACTION_STYLES).find(k => k !== 'default' && action?.toLowerCase().includes(k)) ?? 'default';
    return ACTION_STYLES[key];
}

export default function AuditScreen() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const fetchLogs = useCallback(async (pageNum = 1, append = false) => {
        try {
            const res = await apiFetch(`/api/audit?page=${pageNum}&per_page=30&sort=-created`);
            const items = res.items ?? [];
            if (append) setLogs(prev => [...prev, ...items]);
            else setLogs(items);
            setHasMore(items.length === 30);
            setPage(pageNum);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); setLoadingMore(false); }
    }, []);

    useEffect(() => { fetchLogs(1); }, []);

    const loadMore = () => {
        if (!hasMore || loadingMore) return;
        setLoadingMore(true);
        fetchLogs(page + 1, true);
    };

    const renderItem = ({ item }: { item: AuditLog }) => {
        const style = getStyle(item.action);
        return (
            <View className="bg-white mx-4 mb-2 rounded-2xl p-4 border border-border">
                <View className="flex-row items-start gap-3">
                    <View className="w-9 h-9 rounded-xl items-center justify-center shrink-0" style={{ backgroundColor: style.bg }}>
                        <Ionicons name={style.icon as any} size={18} color={style.color} />
                    </View>
                    <View className="flex-1 min-w-0">
                        <View className="flex-row items-center justify-between gap-2">
                            <Text className="text-sm font-semibold text-foreground capitalize flex-1" numberOfLines={1}>{item.action}</Text>
                            <Text className="text-xs text-muted/60 shrink-0">{formatDateTime(item.created)}</Text>
                        </View>
                        {item.userName && <Text className="text-xs text-muted mt-0.5">By: {item.userName}</Text>}
                        {item.ipAddress && <Text className="text-xs text-muted">IP: {item.ipAddress}</Text>}
                        {item.details && <Text className="text-xs text-muted mt-1" numberOfLines={2}>{item.details}</Text>}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View className="flex-1 bg-background">
            <View className="bg-white px-5 pt-14 pb-4 border-b border-border">
                <Text className="text-2xl font-bold text-foreground">Audit Logs</Text>
                <Text className="text-sm text-muted mt-0.5">Platform activity history</Text>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color="#4f46e5" /></View>
            ) : (
                <FlatList
                    data={logs} keyExtractor={item => item.id} renderItem={renderItem}
                    contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLogs(1); }} tintColor="#4f46e5" />}
                    onEndReached={loadMore} onEndReachedThreshold={0.3}
                    ListFooterComponent={loadingMore ? <ActivityIndicator color="#4f46e5" style={{ marginVertical: 16 }} /> : null}
                    ListEmptyComponent={
                        <View className="items-center justify-center py-20">
                            <Ionicons name="list-outline" size={48} color="#d1d5db" />
                            <Text className="text-foreground font-medium mt-3">No audit logs</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}
