import { useEffect, useState, useCallback, useMemo } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, RefreshControl,
    ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notificationsApi } from '@shared/api/index.js';
import { timeAgo } from '@shared/utils/format.js';

/* Design tokens mirrored from apps/web */
const BRAND = '#5b5ff1';
const BG = '#fbfcff';
const FG = '#111827';
const MUTED_FG = '#6b7280';
const BORDER = '#e8ebf0';
const RADIUS_LG = 16;
const SOFT_SM = {
    shadowColor: '#111a2e', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
};

type Filter = 'all' | 'unread' | 'read';

interface Notification {
    id: string;
    type: string;
    subject: string;
    message: string;
    read: boolean;
    created: string;
}

/* mirrors web getNotificationConfig */
const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string; label: string }> = {
    onboarding_submission: { icon: 'information-circle', color: '#3b82f6', bg: '#dbeafe', label: 'Info' },
    onboarding_approval: { icon: 'checkmark-circle', color: '#059669', bg: '#d1fae5', label: 'Success' },
    onboarding_rejection: { icon: 'close-circle', color: '#f43f5e', bg: '#ffe4e6', label: 'Error' },
    user_request_submission: { icon: 'information-circle', color: '#3b82f6', bg: '#dbeafe', label: 'Info' },
    user_request_approval: { icon: 'checkmark-circle', color: '#059669', bg: '#d1fae5', label: 'Success' },
    user_request_rejection: { icon: 'close-circle', color: '#f43f5e', bg: '#ffe4e6', label: 'Error' },
    password_reset: { icon: 'shield-half', color: '#f59e0b', bg: '#fef3c7', label: 'Warning' },
    school_deactivation: { icon: 'warning', color: '#f43f5e', bg: '#ffe4e6', label: 'Error' },
    default: { icon: 'notifications', color: BRAND, bg: '#ede9fe', label: 'Notification' },
};

function getTypeConfig(type: string) {
    const key = Object.keys(TYPE_CONFIG).find(k => k !== 'default' && type?.includes(k)) ?? 'default';
    return TYPE_CONFIG[key];
}

export default function NotificationsScreen() {
    const insets = useSafeAreaInsets();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [markingAll, setMarkingAll] = useState(false);
    const [filter, setFilter] = useState<Filter>('all');
    const [search, setSearch] = useState('');

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await notificationsApi.listNotifications({ per_page: 100 });
            setNotifications(res.items ?? []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

    const handleMarkRead = async (n: Notification) => {
        if (n.read) return;
        try {
            await notificationsApi.markRead(n.id);
            setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
        } catch (e) { console.error(e); }
    };

    const handleDelete = (n: Notification) => {
        Alert.alert('Delete', 'Remove this notification?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    try {
                        await notificationsApi.deleteNotification(n.id);
                        setNotifications(prev => prev.filter(x => x.id !== n.id));
                    } catch (e: any) { Alert.alert('Error', e.message); }
                },
            },
        ]);
    };

    const handleMarkAllRead = async () => {
        setMarkingAll(true);
        try {
            await notificationsApi.markAllRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (e) { console.error(e); }
        finally { setMarkingAll(false); }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        return notifications
            .filter(n => filter === 'unread' ? !n.read : filter === 'read' ? n.read : true)
            .filter(n => !term || [n.subject, n.message, n.type].some(v => v && String(v).toLowerCase().includes(term)));
    }, [notifications, filter, search]);

    const renderItem = ({ item }: { item: Notification }) => {
        const cfg = getTypeConfig(item.type);
        return (
            <TouchableOpacity
                style={[{
                    marginBottom: 10, borderRadius: RADIUS_LG, padding: 14, borderWidth: 1,
                    backgroundColor: item.read ? 'white' : '#f5f6ff',
                    borderColor: item.read ? '#eef0f3' : '#d6d9fb',
                    overflow: 'hidden',
                }, item.read ? null : SOFT_SM]}
                onPress={() => handleMarkRead(item)}
                activeOpacity={0.7}
            >
                {!item.read && <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: BRAND }} />}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: cfg.bg, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name={cfg.icon as any} size={18} color={cfg.color} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: item.read ? FG : BRAND }} numberOfLines={1}>
                                {item.subject}
                            </Text>
                            <View style={{ backgroundColor: cfg.bg, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                                <Text style={{ fontSize: 9, fontWeight: '700', color: cfg.color, textTransform: 'uppercase' }}>{cfg.label}</Text>
                            </View>
                        </View>
                        <Text style={{ fontSize: 12, color: MUTED_FG }} numberOfLines={2}>{item.message}</Text>
                        <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>{timeAgo(item.created)}</Text>
                    </View>
                    <TouchableOpacity
                        style={{ padding: 6 }}
                        onPress={() => handleDelete(item)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons name="trash-outline" size={16} color="#9ca3af" />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: BG }}>
            {/* Header */}
            <View style={{
                backgroundColor: 'white', paddingHorizontal: 20, paddingTop: insets.top + 12,
                paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: BORDER,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <View>
                    <Text style={{ fontSize: 24, fontWeight: '700', color: FG }}>Notifications</Text>
                    {unreadCount > 0 && <Text style={{ fontSize: 12, color: MUTED_FG, marginTop: 2 }}>{unreadCount} unread</Text>}
                </View>
                {unreadCount > 0 && (
                    <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: '#ede9fe' }}
                        onPress={handleMarkAllRead}
                        disabled={markingAll}
                    >
                        {markingAll
                            ? <ActivityIndicator size="small" color={BRAND} />
                            : <Ionicons name="checkmark-done" size={16} color={BRAND} />}
                        <Text style={{ color: BRAND, fontSize: 12, fontWeight: '600' }}>Mark all read</Text>
                    </TouchableOpacity>
                )}
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
                        placeholder="Search notifications..."
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

            {/* Filter tabs */}
            <View style={{
                marginHorizontal: 16, marginTop: 12,
                flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 4,
            }}>
                {([
                    { key: 'all', label: 'All' },
                    { key: 'unread', label: `Unread${unreadCount ? ` (${unreadCount})` : ''}` },
                    { key: 'read', label: 'Read' },
                ] as { key: Filter; label: string }[]).map(t => {
                    const active = filter === t.key;
                    return (
                        <TouchableOpacity
                            key={t.key}
                            style={[{ flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center', backgroundColor: active ? 'white' : 'transparent' }, active ? SOFT_SM : null]}
                            onPress={() => setFilter(t.key)}
                        >
                            <Text style={{ fontSize: 13, fontWeight: '600', color: active ? FG : MUTED_FG }}>{t.label}</Text>
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
                    data={filtered}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 24 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNotifications(); }} tintColor={BRAND} />
                    }
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
                            <View style={{ width: 64, height: 64, borderRadius: 999, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                <Ionicons name="notifications-off-outline" size={30} color="#9ca3af" />
                            </View>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: FG }}>No notifications found</Text>
                            <Text style={{ color: MUTED_FG, fontSize: 13, marginTop: 4 }}>
                                {search ? 'Try adjusting your search.' : "You're all caught up!"}
                            </Text>
                        </View>
                    }
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}
