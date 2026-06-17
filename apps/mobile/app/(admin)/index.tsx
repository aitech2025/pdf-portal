import { useCallback, useEffect, useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, RefreshControl,
    ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { analyticsApi } from '@shared/api/index.js';
import { useAuth } from '../../src/context/AuthContext';
import { apiFetch } from '../../src/lib/apiClient';

const BRAND = '#5b5ff1';

interface Metrics { totalUsers: number; totalSchools: number; totalPdfs: number; totalDownloads: number; }
interface PendingItems { pdfApprovals: number; userRequests: number; schoolRegistrations: number; }

const METRIC_TILES = [
    { key: 'totalUsers', label: 'Users', icon: 'people', color: '#7c3aed', bg: '#ede9fe' },
    { key: 'totalSchools', label: 'Schools', icon: 'business', color: '#2563eb', bg: '#dbeafe' },
    { key: 'totalPdfs', label: 'PDFs', icon: 'document-text', color: '#059669', bg: '#d1fae5' },
    { key: 'totalDownloads', label: 'Downloads', icon: 'download', color: '#d97706', bg: '#fef3c7' },
] as const;

const QUICK_ACTIONS = [
    { label: 'Analytics', icon: 'bar-chart', color: '#7c3aed', bg: '#ede9fe', route: '/(admin)/analytics' },
    { label: 'Requests', icon: 'clipboard', color: '#2563eb', bg: '#dbeafe', route: '/(admin)/requests' },
    { label: 'Broadcast', icon: 'megaphone', color: '#db2777', bg: '#fce7f3', route: '/(admin)/broadcast' },
    { label: 'Upload PDF', icon: 'cloud-upload', color: BRAND, bg: '#eef2ff', route: '/(admin)/upload' },
    { label: 'Bulk Create', icon: 'layers', color: '#0891b2', bg: '#e0f2fe', route: '/(admin)/bulk' },
    { label: 'Audit Logs', icon: 'list', color: '#059669', bg: '#d1fae5', route: '/(admin)/audit' },
    { label: 'Alerts', icon: 'notifications', color: '#d97706', bg: '#fef3c7', route: '/(admin)/notifications' },
    { label: 'Settings', icon: 'settings', color: '#6b7280', bg: '#f3f4f6', route: '/(admin)/settings' },
] as const;

export default function AdminDashboard() {
    const { user } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [pending, setPending] = useState<PendingItems | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const [dashData, notifRes] = await Promise.all([
                analyticsApi.getDashboard(),
                apiFetch('/api/notifications?per_page=200').catch(() => ({ items: [] })),
            ]);
            setMetrics(dashData.metrics);
            setPending(dashData.pendingItems);
            const unread = (notifRes?.items ?? []).filter((n: any) => !n.read).length;
            setUnreadCount(unread);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (loading) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
                <ActivityIndicator size="large" color={BRAND} />
            </View>
        );
    }

    const totalPending = (pending?.pdfApprovals ?? 0) + (pending?.userRequests ?? 0) + (pending?.schoolRegistrations ?? 0);

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: '#f9fafb' }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={BRAND} />}
            showsVerticalScrollIndicator={false}
        >
            {/* Branded header */}
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
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                            onPress={() => router.push('/(admin)/notifications')}
                            style={{
                                width: 40, height: 40, borderRadius: 20,
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                alignItems: 'center', justifyContent: 'center',
                            }}
                        >
                            <Ionicons name="notifications-outline" size={21} color="white" />
                            {(unreadCount + totalPending) > 0 && (
                                <View style={{
                                    position: 'absolute', top: 4, right: 4,
                                    width: 16, height: 16, borderRadius: 8,
                                    backgroundColor: '#ef4444', borderWidth: 2, borderColor: BRAND,
                                    alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Text style={{ color: 'white', fontSize: 9, fontWeight: '700' }}>
                                        {(unreadCount + totalPending) > 9 ? '9+' : unreadCount + totalPending}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>Administration</Text>
                <Text style={{ color: 'white', fontSize: 20, fontWeight: '700', marginTop: 2 }}>
                    {user?.name ?? 'Admin'}
                </Text>
            </View>

            <View style={{ padding: 16, gap: 16 }}>
                {/* Metric tiles */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    {METRIC_TILES.map(tile => (
                        <View
                            key={tile.key}
                            style={{
                                width: '47%', flexGrow: 1,
                                borderRadius: 16, padding: 16,
                                backgroundColor: tile.bg,
                            }}
                        >
                            <View style={{
                                width: 38, height: 38, borderRadius: 10,
                                backgroundColor: tile.color + '22',
                                alignItems: 'center', justifyContent: 'center', marginBottom: 10,
                            }}>
                                <Ionicons name={tile.icon as any} size={20} color={tile.color} />
                            </View>
                            <Text style={{ fontSize: 26, fontWeight: '700', color: tile.color }}>
                                {metrics?.[tile.key as keyof Metrics] ?? 0}
                            </Text>
                            <Text style={{ fontSize: 12, color: tile.color + 'cc', marginTop: 2 }}>{tile.label}</Text>
                        </View>
                    ))}
                </View>

                {/* Quick actions */}
                <View>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                        Quick Access
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                        {QUICK_ACTIONS.map(action => (
                            <TouchableOpacity
                                key={action.label}
                                onPress={() => router.push(action.route as any)}
                                style={{
                                    width: '22%', flexGrow: 1,
                                    backgroundColor: 'white', borderRadius: 14,
                                    paddingVertical: 14, paddingHorizontal: 8,
                                    alignItems: 'center',
                                    borderWidth: 1, borderColor: '#f3f4f6',
                                    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
                                }}
                                activeOpacity={0.75}
                            >
                                <View style={{
                                    width: 38, height: 38, borderRadius: 10,
                                    backgroundColor: action.bg,
                                    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
                                }}>
                                    <Ionicons name={action.icon as any} size={18} color={action.color} />
                                </View>
                                <Text style={{ fontSize: 11, fontWeight: '600', color: '#374151', textAlign: 'center' }}>
                                    {action.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Pending actions card */}
                {pending && (
                    <View style={{
                        backgroundColor: 'white', borderRadius: 16,
                        borderWidth: 1, borderColor: '#f3f4f6',
                        overflow: 'hidden',
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 }}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>Pending Actions</Text>
                            {totalPending > 0 && (
                                <View style={{ backgroundColor: '#fef2f2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#ef4444' }}>{totalPending}</Text>
                                </View>
                            )}
                        </View>
                        {[
                            { label: 'PDF Approvals', value: pending.pdfApprovals, color: '#d97706', route: '/(admin)/pdfs' },
                            { label: 'User Requests', value: pending.userRequests, color: BRAND, route: '/(admin)/requests' },
                            { label: 'School Registrations', value: pending.schoolRegistrations, color: '#059669', route: '/(admin)/requests' },
                        ].map((item, idx) => (
                            <TouchableOpacity
                                key={item.label}
                                onPress={() => router.push(item.route as any)}
                                style={{
                                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                                    paddingHorizontal: 16, paddingVertical: 12,
                                    borderTopWidth: 1, borderTopColor: '#f9fafb',
                                }}
                            >
                                <Text style={{ fontSize: 13, color: '#374151' }}>{item.label}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, backgroundColor: item.color + '18' }}>
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: item.color }}>{item.value}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={14} color="#9ca3af" />
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>
        </ScrollView>
    );
}
