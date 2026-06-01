import { useEffect, useState, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, RefreshControl,
    ActivityIndicator, Alert,
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

const TYPE_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
    pdf_approval: { icon: 'document-text', color: '#059669', bg: '#d1fae5' },
    pdf_rejection: { icon: 'document-text', color: '#dc2626', bg: '#fee2e2' },
    user_request: { icon: 'person-add', color: '#4f46e5', bg: '#ede9fe' },
    onboarding: { icon: 'business', color: '#2563eb', bg: '#dbeafe' },
    password_reset: { icon: 'key', color: '#d97706', bg: '#fef3c7' },
    default: { icon: 'notifications', color: '#6b7280', bg: '#f3f4f6' },
};

function getTypeStyle(type: string) {
    const key = Object.keys(TYPE_ICONS).find(k => type?.includes(k)) ?? 'default';
    return TYPE_ICONS[key] ?? TYPE_ICONS.default;
}

export default function NotificationsScreen() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [markingAll, setMarkingAll] = useState(false);

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await notificationsApi.listNotifications({ per_page: 100 });
            setNotifications(res.items ?? []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchNotifications(); }, []);

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

    const renderItem = ({ item }: { item: Notification }) => {
        const style = getTypeStyle(item.type);
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
                        <Ionicons name={style.icon as any} size={18} color={style.color} />
                    </View>
                    <View className="flex-1 min-w-0">
                        <View className="flex-row items-center justify-between gap-2">
                            <Text
                                className={`flex-1 text-sm font-semibold ${item.read ? 'text-foreground' : 'text-primary'}`}
                                numberOfLines={1}
                            >
                                {item.subject}
                            </Text>
                            {!item.read && (
                                <View className="w-2 h-2 rounded-full bg-primary shrink-0" />
                            )}
                        </View>
                        <Text className="text-xs text-muted mt-0.5" numberOfLines={2}>
                            {item.message}
                        </Text>
                        <Text className="text-xs text-muted/60 mt-1.5">{timeAgo(item.created)}</Text>
                    </View>
                    <TouchableOpacity
                        className="p-1.5 rounded-lg"
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
                            disabled={markingAll}
                        >
                            {markingAll
                                ? <ActivityIndicator size="small" color="#4f46e5" />
                                : <Ionicons name="checkmark-done" size={16} color="#4f46e5" />
                            }
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
