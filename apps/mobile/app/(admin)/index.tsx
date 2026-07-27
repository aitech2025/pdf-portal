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

/* Design tokens mirrored from apps/web (index.css / tailwind.config.js) */
const BRAND = '#5b5ff1';            // --primary
const BG = '#fbfcff';               // --background
const FG = '#111827';               // --foreground
const MUTED_FG = '#6b7280';         // --muted-foreground
const BORDER = '#e5e7eb';
const CARD_BORDER = '#eef0f3';
const SUCCESS = '#22c55e';

const SOFT_SM = {
    shadowColor: '#111a2e', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
};

interface Dashboard {
    user_count?: number; school_count?: number; active_school_count?: number;
    pdf_count?: number; total_downloads?: number; pending_onboarding?: number;
    active_sessions?: number; storage_bytes?: number;
}
interface AuditLog {
    id: string; action?: string; action_details?: string; actionDetails?: string;
    resource_type?: string; resourceType?: string; created?: string; createdAt?: string; timestamp?: string;
}

const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const METRIC_TILES = [
    { key: 'user_count', label: 'Users', icon: 'people', color: '#7c3aed', bg: '#ede9fe' },
    { key: 'school_count', label: 'Schools', icon: 'business', color: '#2563eb', bg: '#dbeafe' },
    { key: 'pdf_count', label: 'PDFs', icon: 'document-text', color: '#059669', bg: '#d1fae5' },
    { key: 'total_downloads', label: 'Downloads', icon: 'download', color: '#d97706', bg: '#fef3c7' },
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
    const [dash, setDash] = useState<Dashboard | null>(null);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const [dashData, auditRes, notifRes] = await Promise.all([
                apiFetch('/api/dashboard').catch(() => null),
                apiFetch('/api/auditLogs?page=1&per_page=6').catch(() => ({ items: [] })),
                apiFetch('/api/notifications?per_page=200').catch(() => ({ items: [] })),
            ]);
            setDash(dashData);
            setAuditLogs(auditRes?.items ?? []);
            setUnreadCount((notifRes?.items ?? []).filter((n: any) => !n.read).length);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (loading) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG }}>
                <ActivityIndicator size="large" color={BRAND} />
            </View>
        );
    }

    const pendingOnboarding = dash?.pending_onboarding ?? 0;
    const activeSessions = dash?.active_sessions ?? 0;
    const badgeCount = unreadCount + pendingOnboarding;

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: BG }}
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
                    <TouchableOpacity
                        onPress={() => router.push('/(admin)/notifications')}
                        style={{
                            width: 40, height: 40, borderRadius: 20,
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        <Ionicons name="notifications-outline" size={21} color="white" />
                        {badgeCount > 0 && (
                            <View style={{
                                position: 'absolute', top: 4, right: 4,
                                minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 3,
                                backgroundColor: '#ef4444', borderWidth: 2, borderColor: BRAND,
                                alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Text style={{ color: 'white', fontSize: 9, fontWeight: '700' }}>
                                    {badgeCount > 9 ? '9+' : badgeCount}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                    Overview
                </Text>
                <Text style={{ color: 'white', fontSize: 22, fontWeight: '700', marginTop: 4 }}>
                    Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 }}>
                    Operational metrics and recent activity at a glance.
                </Text>
            </View>

            <View style={{ padding: 16, gap: 16 }}>
                {/* Metric tiles */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    {METRIC_TILES.map(tile => (
                        <View
                            key={tile.key}
                            style={{ width: '47%', flexGrow: 1, borderRadius: 16, padding: 16, backgroundColor: tile.bg }}
                        >
                            <View style={{
                                width: 38, height: 38, borderRadius: 10,
                                backgroundColor: tile.color + '22',
                                alignItems: 'center', justifyContent: 'center', marginBottom: 10,
                            }}>
                                <Ionicons name={tile.icon as any} size={20} color={tile.color} />
                            </View>
                            <Text style={{ fontSize: 26, fontWeight: '700', color: tile.color }}>
                                {(dash?.[tile.key as keyof Dashboard] ?? 0).toLocaleString()}
                            </Text>
                            <Text style={{ fontSize: 12, color: tile.color + 'cc', marginTop: 2 }}>{tile.label}</Text>
                        </View>
                    ))}
                </View>

                {/* Quick actions */}
                <View>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED_FG, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
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
                                    paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center',
                                    borderWidth: 1, borderColor: CARD_BORDER,
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

                {/* Storage usage */}
                <View style={{ backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: CARD_BORDER, padding: 16, ...SOFT_SM }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ionicons name="server-outline" size={18} color={BRAND} />
                            <Text style={{ fontSize: 16, fontWeight: '700', color: FG }}>Storage usage</Text>
                        </View>
                        <View style={{ backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#4b5563' }}>{formatBytes(dash?.storage_bytes)}</Text>
                        </View>
                    </View>
                    <Text style={{ fontSize: 13, color: MUTED_FG, marginTop: 6 }}>
                        Aggregated PDF storage across all tenants.
                    </Text>
                    <View style={{ flexDirection: 'row', marginTop: 14, gap: 10 }}>
                        <View style={{ flex: 1, backgroundColor: '#f9fafb', borderRadius: 12, padding: 12 }}>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: FG }}>{activeSessions.toLocaleString()}</Text>
                            <Text style={{ fontSize: 12, color: MUTED_FG, marginTop: 2 }}>Active sessions</Text>
                        </View>
                        <View style={{ flex: 1, backgroundColor: '#f9fafb', borderRadius: 12, padding: 12 }}>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: FG }}>{pendingOnboarding.toLocaleString()}</Text>
                            <Text style={{ fontSize: 12, color: MUTED_FG, marginTop: 2 }}>Pending onboarding</Text>
                        </View>
                    </View>
                </View>

                {/* Recent activity */}
                <View style={{ backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: CARD_BORDER, padding: 16, ...SOFT_SM }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ionicons name="pulse-outline" size={18} color={BRAND} />
                            <Text style={{ fontSize: 16, fontWeight: '700', color: FG }}>Recent activity</Text>
                        </View>
                        <TouchableOpacity onPress={() => router.push('/(admin)/audit')} hitSlop={8}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: MUTED_FG }}>View all</Text>
                        </TouchableOpacity>
                    </View>
                    {auditLogs.length === 0 ? (
                        <Text style={{ fontSize: 13, color: MUTED_FG, textAlign: 'center', paddingVertical: 16 }}>
                            No recent activity recorded.
                        </Text>
                    ) : (
                        <View style={{ gap: 8 }}>
                            {auditLogs.slice(0, 6).map((log) => (
                                <View key={log.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: BORDER }}>
                                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: BRAND + '1a', alignItems: 'center', justifyContent: 'center' }}>
                                        <Ionicons name="pulse-outline" size={16} color={BRAND} />
                                    </View>
                                    <View style={{ flex: 1, minWidth: 0 }}>
                                        <Text style={{ fontSize: 14, fontWeight: '500', color: FG }} numberOfLines={1}>
                                            {log.action_details || log.actionDetails || log.action}
                                        </Text>
                                        <Text style={{ fontSize: 12, color: MUTED_FG, marginTop: 2 }} numberOfLines={1}>
                                            {(log.resource_type || log.resourceType || '')}
                                            {(log.resource_type || log.resourceType) ? ' · ' : ''}
                                            {new Date(log.created || log.createdAt || log.timestamp || Date.now()).toLocaleString()}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* System status */}
                <View style={{ backgroundColor: '#f0fdf4', borderRadius: 16, borderWidth: 1, borderColor: '#dcfce7', padding: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: SUCCESS }} />
                        <Text style={{ fontSize: 15, fontWeight: '700', color: FG }}>System status</Text>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: FG, marginTop: 10 }}>All systems operational</Text>
                    <Text style={{ fontSize: 12, color: MUTED_FG, marginTop: 4, lineHeight: 18 }}>
                        API, database and notification channels are healthy.
                    </Text>
                </View>
            </View>
        </ScrollView>
    );
}
