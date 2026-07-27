import { useEffect, useState, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert,
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
const CARD_BORDER = '#eef0f3';
const SUCCESS = '#22c55e';
const WARNING = '#f59e0b';
const DESTRUCTIVE = '#e11d48';
const RADIUS_LG = 16;
const SOFT_SM = {
    shadowColor: '#111a2e', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
};

interface Notification {
    id: string; type: string; subject: string; message: string;
    read: boolean; created: string; notificationMethod?: string;
}

const TYPE_STYLES: Record<string, { icon: string; color: string; bg: string }> = {
    approval: { icon: 'checkmark-circle', color: SUCCESS, bg: '#d1fae5' },
    rejection: { icon: 'close-circle', color: DESTRUCTIVE, bg: '#fee2e2' },
    password: { icon: 'key', color: WARNING, bg: '#fef3c7' },
    default: { icon: 'notifications', color: BRAND, bg: '#eef2ff' },
};

function getStyle(type: string) {
    const key = Object.keys(TYPE_STYLES).find(k => k !== 'default' && type?.includes(k)) ?? 'default';
    return TYPE_STYLES[key];
}

type Tab = 'all' | 'unread' | 'read';

export default function SchoolNotificationsScreen() {
    const insets = useSafeAreaInsets();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [tab, setTab] = useState<Tab>('all');

    const fetchNotifications = useCallback(async () => {
        try {
            const res: any = await notificationsApi.listNotifications({ per_page: 50 });
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

    const handleMarkAllRead = async () => {
        try {
            await notificationsApi.markAllRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (e) { console.error(e); }
    };

    const handleDelete = (n: Notification) => {
        Alert.alert('Delete', 'Delete this message?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        await notificationsApi.deleteNotification(n.id);
                        setNotifications(prev => prev.filter(x => x.id !== n.id));
                    } catch (e: any) { Alert.alert('Error', e?.message ?? 'Failed to delete'); }
                },
            },
        ]);
    };

    const unreadCount = notifications.filter(n => !n.read).length;
    const visible = tab === 'all' ? notifications : tab === 'unread' ? notifications.filter(n => !n.read) : notifications.filter(n => n.read);

    const TABS: { key: Tab; label: string }[] = [
        { key: 'all', label: `All (${notifications.length})` },
        { key: 'unread', label: `Unread (${unreadCount})` },
        { key: 'read', label: 'Read' },
    ];

    const renderItem = ({ item }: { item: Notification }) => {
        const style = getStyle(item.type);
        return (
            <View style={[{
                marginHorizontal: 16, marginBottom: 10, borderRadius: RADIUS_LG, padding: 14,
                backgroundColor: item.read ? 'white' : '#f5f6ff',
                borderWidth: 1, borderColor: item.read ? CARD_BORDER : BRAND + '40',
            }, SOFT_SM]}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: style.bg, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name={style.icon as any} size={20} color={style.color} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: item.read ? FG : BRAND }} numberOfLines={1}>
                                {item.subject}
                            </Text>
                            {!item.read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: BRAND }} />}
                        </View>
                        <Text style={{ fontSize: 12, color: MUTED_FG, marginTop: 3 }} numberOfLines={3}>{item.message}</Text>
                        <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
                            {timeAgo(item.created)}{item.notificationMethod ? ` · ${item.notificationMethod}` : ''}
                        </Text>
                    </View>
                    <View style={{ gap: 6 }}>
                        {!item.read && (
                            <TouchableOpacity onPress={() => handleMarkRead(item)} hitSlop={6} style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="checkmark" size={17} color={MUTED_FG} />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={6} style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="trash-outline" size={16} color={MUTED_FG} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: BG }}>
            <View style={{ backgroundColor: 'white', paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: CARD_BORDER }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: BRAND, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>
                    School portal
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 24, fontWeight: '700', color: FG }}>Messages</Text>
                        <Text style={{ fontSize: 13, color: MUTED_FG, marginTop: 1 }}>
                            Notifications and announcements from the platform
                        </Text>
                    </View>
                    {unreadCount > 0 && (
                        <TouchableOpacity
                            onPress={handleMarkAllRead}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: BRAND + '1a' }}
                        >
                            <Ionicons name="checkmark-done" size={16} color={BRAND} />
                            <Text style={{ color: BRAND, fontSize: 12, fontWeight: '600' }}>Mark all read</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Tabs */}
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 14 }}>
                    {TABS.map(t => (
                        <TouchableOpacity
                            key={t.key}
                            onPress={() => setTab(t.key)}
                            style={{
                                paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
                                backgroundColor: tab === t.key ? BRAND : '#f3f4f6',
                            }}
                        >
                            <Text style={{ fontSize: 12, fontWeight: '600', color: tab === t.key ? 'white' : '#4b5563' }}>{t.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {loading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color={BRAND} />
                </View>
            ) : (
                <FlatList
                    data={visible}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 24 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNotifications(); }} tintColor={BRAND} />
                    }
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
                            <Ionicons name="notifications-off-outline" size={48} color="#d1d5db" />
                            <Text style={{ fontSize: 15, fontWeight: '600', color: FG, marginTop: 12 }}>
                                {notifications.length === 0 ? 'No messages yet.' : 'No messages in this tab.'}
                            </Text>
                            <Text style={{ fontSize: 13, color: MUTED_FG, marginTop: 4 }}>You're all caught up!</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}
