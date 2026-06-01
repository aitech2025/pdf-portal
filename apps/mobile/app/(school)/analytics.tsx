import { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { schoolsApi } from '@shared/api/index.js';
import { useAuth } from '../../src/context/AuthContext';

interface SchoolStats {
    totalUsers: number; totalDownloads: number; totalPdfs?: number;
    activeUsers?: number; pendingRequests?: number;
    downloadsByMonth?: { month: string; count: number }[];
}

const STAT_TILES = [
    { key: 'totalUsers', label: 'Total Users', icon: 'people', color: '#7c3aed', bg: '#ede9fe' },
    { key: 'activeUsers', label: 'Active Users', icon: 'person-circle', color: '#2563eb', bg: '#dbeafe' },
    { key: 'totalDownloads', label: 'Downloads', icon: 'download', color: '#059669', bg: '#d1fae5' },
    { key: 'pendingRequests', label: 'Pending Requests', icon: 'time', color: '#d97706', bg: '#fef3c7' },
];

export default function SchoolAnalyticsScreen() {
    const { user } = useAuth();
    const [stats, setStats] = useState<SchoolStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStats = async () => {
        if (!user?.schoolId) { setLoading(false); return; }
        try {
            const res = await schoolsApi.getSchoolStats(user.schoolId);
            setStats(res);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { fetchStats(); }, []);

    if (loading) return (
        <View className="flex-1 items-center justify-center bg-background">
            <ActivityIndicator size="large" color="#4f46e5" />
        </View>
    );

    return (
        <ScrollView
            className="flex-1 bg-background"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats(); }} tintColor="#4f46e5" />}
        >
            <View className="bg-white px-5 pt-14 pb-5 border-b border-border">
                <Text className="text-2xl font-bold text-foreground">Analytics</Text>
                <Text className="text-sm text-muted mt-0.5">Your school's activity overview</Text>
            </View>

            <View className="p-4 space-y-4">
                {/* Stat tiles */}
                <View className="flex-row flex-wrap gap-3">
                    {STAT_TILES.map(tile => (
                        <View key={tile.key} className="flex-1 min-w-[44%] rounded-2xl p-4" style={{ backgroundColor: tile.bg }}>
                            <View className="w-10 h-10 rounded-xl items-center justify-center mb-3" style={{ backgroundColor: tile.color + '22' }}>
                                <Ionicons name={tile.icon as any} size={20} color={tile.color} />
                            </View>
                            <Text className="text-3xl font-bold" style={{ color: tile.color }}>
                                {stats?.[tile.key as keyof SchoolStats] ?? 0}
                            </Text>
                            <Text className="text-xs mt-0.5 font-medium" style={{ color: tile.color + 'cc' }}>{tile.label}</Text>
                        </View>
                    ))}
                </View>

                {/* Summary card */}
                <View className="bg-primary rounded-2xl p-5">
                    <View className="flex-row items-center gap-2 mb-4">
                        <Ionicons name="bar-chart" size={20} color="white" />
                        <Text className="text-white font-semibold text-base">School Summary</Text>
                    </View>
                    {[
                        { label: 'Total Users', value: stats?.totalUsers ?? 0 },
                        { label: 'Active Users', value: stats?.activeUsers ?? 0 },
                        { label: 'Total Downloads', value: stats?.totalDownloads ?? 0 },
                        { label: 'Pending Requests', value: stats?.pendingRequests ?? 0 },
                    ].map((item, idx) => (
                        <View key={item.label} className={`flex-row justify-between py-2.5 ${idx < 3 ? 'border-b border-white/20' : ''}`}>
                            <Text className="text-white/80 text-sm">{item.label}</Text>
                            <Text className="text-white font-bold text-sm">{item.value.toLocaleString()}</Text>
                        </View>
                    ))}
                </View>

                {/* Downloads by month if available */}
                {stats?.downloadsByMonth && stats.downloadsByMonth.length > 0 && (
                    <View className="bg-white rounded-2xl border border-border overflow-hidden">
                        <Text className="text-base font-semibold text-foreground px-4 pt-4 pb-2">Downloads by Month</Text>
                        {stats.downloadsByMonth.map((item, idx) => {
                            const max = Math.max(...stats.downloadsByMonth!.map(d => d.count), 1);
                            const pct = (item.count / max) * 100;
                            return (
                                <View key={item.month} className={`px-4 py-3 ${idx < stats.downloadsByMonth!.length - 1 ? 'border-b border-border/50' : ''}`}>
                                    <View className="flex-row items-center justify-between mb-1.5">
                                        <Text className="text-sm text-foreground">{item.month}</Text>
                                        <Text className="text-sm font-bold text-primary">{item.count}</Text>
                                    </View>
                                    <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <View className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}
            </View>
        </ScrollView>
    );
}
