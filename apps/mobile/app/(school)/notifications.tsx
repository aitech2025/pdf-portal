import { useEffect, useState, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { notificationsApi } from '@shared/api/index.js';
import { timeAgo } from '@shared/utils/format.js';

interface Notification {
    id: string;
    type: string;
    subject: string;
    message: string;
    read: boolean;
    created: string;
}

const TYPE_STYLES: Record<string, { icon: string; color: string; bg: string }> = {
    approval: { icon: 'checkmark-circle', color: '#059669', bg: '#d1fae5' },
    rejection: { icon: 'close-circle', color: '#dc2626', bg: '#fee2e2' },
    password: { icon: 'key', color: '#d97706', bg: '#fef3c7' },
    default: { icon: 'notifications', color: '#4f46e5', bg: '#ede9fe' },
};

function getStyle(type: string) {
    const key = Object.keys(TYPE_STYLES).find(k => k !== 'default' && type?.includes(k)) ?? 'default';
    return TYPE_STYLES[key];
}

export default function SchoolNotificationsScreen() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await notificationsApi.listNotifications({ per_page: 50 });
            setNotifications(res.items ?? []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { fetchNotifications(); }, []);

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

    const unreadCount = notifications.filter(n => !n.read).length;

    const renderItem = ({ item }: { item: Notification }) => {
        const style = getStyle(item.type);
        return (
            <TouchableOpacity
                className={`mx-4 mb-2 rounded-2xl p-4 border ${item.read ? 'bg-white border-border/50' : 'bg-primary/5 border-primary/20'}`}
                onPress={() => handleMarkRead(item)}
                activeOpacity={0.7}
            >
                <View className="flex-row items-start gap-3">
                    <View
                        className="w-10 h-10 rounded-xl items-center justify-center mt-0.5 shrink-0"
                        style={{ backgroundColor: style.bg }}
                    >
                        <Ionicons name={style.icon as any} size={20} color={style.color} />
                    </View>
                    <View className="flex-1 min-w-0">
                        <View className="flex-row items-center justify-between gap-2">
                            <Text
                                className={`flex-1 text-sm font-semibold ${item.read ? 'text-foreground' : 'text-primary'}`}
                                numberOfLines={1}
                            >
                                {item.subject}
                            </Text>
                            {!item.read && <View className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                        </View>
                        <Text className="text-xs text-muted mt-0.5" numberOfLines={2}>{item.message}</Text>
                        <Text className="text-xs text-muted/60 mt-1.5">{timeAgo(item.created)}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View className="flex-1 bg-background">
            <View className="bg-white px-5 pt-14 pb-4 border-b border-border">
                <View className="flex-row items-center justify-between">
                    <View>
                        <Text className="text-2xl font-bold text-foreground">Notifications</Text>
                        {unreadCount > 0 && (
                            <Text className="text-xs text-muted mt-0.5">{unreadCount} unread</Text>
                        )}
                    </View>
                    {unreadCount > 0 && (
                        <TouchableOpacity
                            className="flex-row items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10"
                            onPress={handleMarkAllRead}
                        >
                            <Ionicons name="checkmark-done" size={16} color="#4f46e5" />
                            <Text className="text-primary text-xs font-semibold">Mark all read</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#4f46e5" />
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); fetchNotifications(); }}
                            tintColor="#4f46e5"
                        />
                    }
                    ListEmptyComponent={
                        <View className="items-center justify-center py-20">
                            <Ionicons name="notifications-off-outline" size={48} color="#d1d5db" />
                            <Text className="text-foreground font-medium mt-3">No notifications</Text>
                            <Text className="text-muted text-sm mt-1">You're all caught up!</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}
