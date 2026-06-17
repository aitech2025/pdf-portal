import { useCallback, useEffect, useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, RefreshControl,
    ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { apiFetch } from '../../src/lib/apiClient';

const BRAND = '#5b5ff1';

interface Stats { totalDownloads: number; totalUsers: number; totalPdfs?: number; }

const QUICK_ACTIONS = [
    { label: 'Library', icon: 'library-outline', color: BRAND, bg: '#eef2ff', route: '/(school)/portal' },
    { label: 'Videos', icon: 'play-circle-outline', color: '#0891b2', bg: '#e0f2fe', route: '/(school)/videos' },
    { label: 'Bookmarks', icon: 'bookmark-outline', color: '#059669', bg: '#d1fae5', route: '/(school)/bookmarks' },
    { label: 'Analytics', icon: 'bar-chart-outline', color: '#7c3aed', bg: '#ede9fe', route: '/(school)/analytics' },
    { label: 'Alerts', icon: 'notifications-outline', color: '#d97706', bg: '#fef3c7', route: '/(school)/notifications' },
    { label: 'Requests', icon: 'clipboard-outline', color: '#be185d', bg: '#fce7f3', route: '/(school)/requests' },
] as const;

export default function SchoolDashboard() {
    const { user, canWrite } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [stats, setStats] = useState<Stats>({ totalDownloads: 0, totalUsers: 0, totalPdfs: 0 });
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const [statsRes, notifRes] = await Promise.all([
                user?.schoolId ? apiFetch(`/api/schools/${user.schoolId}/stats`) : Promise.resolve({}),
                apiFetch('/api/notifications?per_page=200').catch(() => ({ items: [] })),
            ]);
            setStats({
                totalDownloads: statsRes?.totalDownloads ?? 0,
                totalUsers: statsRes?.totalUsers ?? 0,
                totalPdfs: statsRes?.totalPdfs ?? 0,
            });
            const unread = (notifRes?.items ?? []).filter((n: any) => !n.read).length;
            setUnreadCount(unread);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    }, [user?.schoolId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const visibleActions = QUICK_ACTIONS.filter(a => {
        if (a.route === '/(school)/requests') return canWrite;
        return true;
    });

    if (loading) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
                <ActivityIndicator size="large" color={BRAND} />
            </View>
        );
    }

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: '#f9fafb' }}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={BRAND} />
            }
            showsVerticalScrollIndicator={false}
        >
            {/* Header with logo */}
            <View style={{
                backgroundColor: BRAND,
                paddingTop: insets.top + 12,
                paddingBottom: 20,
                paddingHorizontal: 20,
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <View style={{
                        backgroundColor: 'white', borderRadius: 12,
                        paddingHorizontal: 12, paddingVertical: 7,
                        shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
                    }}>
                        <Image
                            source={require('../../assets/logo-mark.png')}
                            style={{ width: 100, height: 30, resizeMode: 'contain' }}
                        />
                    </View>
                    <TouchableOpacity
                        onPress={() => router.push('/(school)/notifications')}
                        style={{
                            width: 40, height: 40, borderRadius: 20,
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        <Ionicons name="notifications-outline" size={22} color="white" />
                        {unreadCount > 0 && (
                            <View style={{
                                position: 'absolute', top: 4, right: 4,
                                width: 16, height: 16, borderRadius: 8,
                                backgroundColor: '#ef4444', borderWidth: 2, borderColor: BRAND,
                                alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Text style={{ color: 'white', fontSize: 9, fontWeight: '700' }}>
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>
                    Welcome back,
                </Text>
                <Text style={{ color: 'white', fontSize: 20, fontWeight: '700', marginTop: 2 }}>
                    {user?.name ?? 'School User'}
                </Text>
            </View>

            <View style={{ padding: 16, gap: 16 }}>
                {/* Stats */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    {[
                        { label: 'Downloads', value: stats.totalDownloads, icon: 'download', color: '#d97706', bg: '#fef3c7' },
                        { label: 'Users', value: stats.totalUsers, icon: 'people', color: '#2563eb', bg: '#dbeafe' },
                        { label: 'PDFs', value: stats.totalPdfs ?? 0, icon: 'document-text', color: '#059669', bg: '#d1fae5' },
                    ].map(tile => (
                        <View
                            key={tile.label}
                            style={{
                                flex: 1, borderRadius: 16, padding: 14,
                                backgroundColor: tile.bg, alignItems: 'center',
                            }}
                        >
                            <View style={{
                                width: 36, height: 36, borderRadius: 10,
                                backgroundColor: tile.color + '22',
                                alignItems: 'center', justifyContent: 'center', marginBottom: 8,
                            }}>
                                <Ionicons name={tile.icon as any} size={18} color={tile.color} />
                            </View>
                            <Text style={{ fontSize: 22, fontWeight: '700', color: tile.color }}>{tile.value}</Text>
                            <Text style={{ fontSize: 11, color: tile.color + 'cc', marginTop: 2, textAlign: 'center' }}>{tile.label}</Text>
                        </View>
                    ))}
                </View>

                {/* Quick access */}
                <View>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                        Quick Access
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                        {visibleActions.map(action => (
                            <TouchableOpacity
                                key={action.label}
                                onPress={() => router.push(action.route as any)}
                                style={{
                                    width: '30%', flexGrow: 1,
                                    backgroundColor: 'white', borderRadius: 16,
                                    padding: 14, alignItems: 'center',
                                    borderWidth: 1, borderColor: '#f3f4f6',
                                    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
                                }}
                                activeOpacity={0.75}
                            >
                                <View style={{
                                    width: 40, height: 40, borderRadius: 12,
                                    backgroundColor: action.bg,
                                    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
                                }}>
                                    <Ionicons name={action.icon as any} size={20} color={action.color} />
                                </View>
                                <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', textAlign: 'center' }}>
                                    {action.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* School info card */}
                {user?.schoolId && (
                    <View style={{
                        backgroundColor: 'white', borderRadius: 16,
                        borderWidth: 1, borderColor: '#f3f4f6', padding: 16,
                    }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 4 }}>
                            Your Institution
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View style={{
                                width: 40, height: 40, borderRadius: 12,
                                backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Ionicons name="business-outline" size={20} color={BRAND} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }} numberOfLines={1}>
                                    {user.name ?? 'Institution'}
                                </Text>
                                <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>
                                    {user.email}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}
            </View>
        </ScrollView>
    );
}
