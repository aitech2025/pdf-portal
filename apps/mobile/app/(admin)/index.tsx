import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { analyticsApi } from '@shared/api/index.js';
import { useAuth } from '../../src/context/AuthContext';

interface Metrics { totalUsers: number; totalSchools: number; totalPdfs: number; totalDownloads: number; }
interface PendingItems { pdfApprovals: number; userRequests: number; schoolRegistrations: number; }

const TILES = [
    { key: 'totalUsers', label: 'Total Users', icon: 'people', color: '#7c3aed', bg: '#ede9fe' },
    { key: 'totalSchools', label: 'Total Schools', icon: 'business', color: '#2563eb', bg: '#dbeafe' },
    { key: 'totalPdfs', label: 'Total PDFs', icon: 'document-text', color: '#059669', bg: '#d1fae5' },
    { key: 'totalDownloads', label: 'Downloads', icon: 'download', color: '#d97706', bg: '#fef3c7' },
];

const QUICK_ACTIONS = [
    { label: 'Analytics', icon: 'bar-chart', color: '#7c3aed', route: '/(admin)/analytics' },
    { label: 'Requests', icon: 'clipboard', color: '#2563eb', route: '/(admin)/requests' },
    { label: 'Notifications', icon: 'notifications', color: '#d97706', route: '/(admin)/notifications' },
];

export default function AdminDashboard() {
    const { user } = useAuth();
    const router = useRouter();
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [pending, setPending] = useState<PendingItems | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            const data = await analyticsApi.getDashboard();
            setMetrics(data.metrics);
            setPending(data.pendingItems);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { fetchData(); }, []);

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator size="large" color="#4f46e5" />
            </View>
        );
    }

    const totalPending = (pending?.pdfApprovals ?? 0) + (pending?.userRequests ?? 0) + (pending?.schoolRegistrations ?? 0);

    return (
        <ScrollView
            className="flex-1 bg-background"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#4f46e5" />}
        >
            {/* Header */}
            <View className="bg-white px-5 pt-14 pb-5 border-b border-border">
                <View className="flex-row items-center justify-between">
                    <View>
                        <Text className="text-2xl font-bold text-foreground">Dashboard</Text>
                        <Text className="text-muted text-sm mt-0.5">Welcome back, {user?.name}</Text>
                    </View>
                    <TouchableOpacity
                        className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center relative"
                        onPress={() => router.push('/(admin)/notifications')}
                    >
                        <Ionicons name="notifications-outline" size={22} color="#4f46e5" />
                        {totalPending > 0 && (
                            <View className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full items-center justify-center">
                                <Text className="text-white text-[9px] font-bold">{totalPending > 9 ? '9+' : totalPending}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            <View className="p-4 space-y-4">
                {/* Metric tiles */}
                <View className="flex-row flex-wrap gap-3">
                    {TILES.map(tile => (
                        <View key={tile.key} className="flex-1 min-w-[44%] rounded-2xl p-4" style={{ backgroundColor: tile.bg }}>
                            <View className="w-10 h-10 rounded-xl items-center justify-center mb-3" style={{ backgroundColor: tile.color + '22' }}>
                                <Ionicons name={tile.icon as any} size={22} color={tile.color} />
                            </View>
                            <Text className="text-2xl font-bold" style={{ color: tile.color }}>
                                {metrics?.[tile.key as keyof Metrics] ?? 0}
                            </Text>
                            <Text className="text-sm mt-0.5" style={{ color: tile.color + 'cc' }}>{tile.label}</Text>
                        </View>
                    ))}
                </View>

                {/* Quick Actions */}
                <View>
                    <Text className="text-sm font-semibold text-muted mb-2 uppercase tracking-wider">Quick Access</Text>
                    <View className="flex-row gap-3">
                        {QUICK_ACTIONS.map(action => (
                            <TouchableOpacity
                                key={action.label}
                                className="flex-1 bg-white rounded-2xl p-4 items-center border border-border"
                                onPress={() => router.push(action.route as any)}
                            >
                                <View className="w-10 h-10 rounded-xl items-center justify-center mb-2" style={{ backgroundColor: action.color + '18' }}>
                                    <Ionicons name={action.icon as any} size={20} color={action.color} />
                                </View>
                                <Text className="text-xs font-medium text-foreground">{action.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Pending actions */}
                {pending && (
                    <View className="bg-white rounded-2xl border border-border overflow-hidden">
                        <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
                            <Text className="text-base font-semibold text-foreground">Pending Actions</Text>
                            <TouchableOpacity onPress={() => router.push('/(admin)/requests')}>
                                <Text className="text-xs font-semibold text-primary">View All</Text>
                            </TouchableOpacity>
                        </View>
                        {[
                            { label: 'PDF Approvals', value: pending.pdfApprovals, color: '#d97706', route: '/(admin)/pdfs' },
                            { label: 'User Requests', value: pending.userRequests, color: '#4f46e5', route: '/(admin)/requests' },
                            { label: 'School Registrations', value: pending.schoolRegistrations, color: '#059669', route: '/(admin)/requests' },
                        ].map((item, idx) => (
                            <TouchableOpacity
                                key={item.label}
                                className={`flex-row items-center justify-between px-4 py-3 ${idx < 2 ? 'border-b border-border/50' : ''}`}
                                onPress={() => router.push(item.route as any)}
                            >
                                <Text className="text-sm text-foreground">{item.label}</Text>
                                <View className="flex-row items-center gap-2">
                                    <View className="px-2.5 py-0.5 rounded-full" style={{ backgroundColor: item.color + '22' }}>
                                        <Text className="text-sm font-bold" style={{ color: item.color }}>{item.value}</Text>
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
