import { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { analyticsApi } from '@shared/api/index.js';

const OVERVIEW_TILES = [
    { key: 'totalUsers', label: 'Total Users', icon: 'people', color: '#7c3aed', bg: '#ede9fe' },
    { key: 'totalSchools', label: 'Total Schools', icon: 'business', color: '#2563eb', bg: '#dbeafe' },
    { key: 'totalPdfs', label: 'Total PDFs', icon: 'document-text', color: '#059669', bg: '#d1fae5' },
    { key: 'totalDownloads', label: 'Downloads', icon: 'download', color: '#d97706', bg: '#fef3c7' },
];

const PENDING_ITEMS = [
    { key: 'pdfApprovals', label: 'PDF Approvals', icon: 'document-attach', color: '#d97706' },
    { key: 'userRequests', label: 'User Requests', icon: 'person-add', color: '#4f46e5' },
    { key: 'schoolRegistrations', label: 'School Registrations', icon: 'school', color: '#059669' },
];

export default function AnalyticsScreen() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            const res = await analyticsApi.getDashboard();
            setData(res);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const onRefresh = () => { setRefreshing(true); fetchData(); };

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator size="large" color="#4f46e5" />
            </View>
        );
    }

    const metrics = data?.metrics ?? {};
    const pending = data?.pendingItems ?? {};

    return (
        <ScrollView
            className="flex-1 bg-background"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />}
        >
            <View className="bg-white px-5 pt-14 pb-5 border-b border-border">
                <Text className="text-2xl font-bold text-foreground">Analytics</Text>
                <Text className="text-muted mt-0.5 text-sm">Platform overview and key metrics</Text>
            </View>

            <View className="p-4 space-y-5">
                {/* Platform Metrics */}
                <View>
                    <Text className="text-base font-semibold text-foreground mb-3">Platform Metrics</Text>
                    <View className="flex-row flex-wrap gap-3">
                        {OVERVIEW_TILES.map(tile => (
                            <View
                                key={tile.key}
                                className="flex-1 min-w-[44%] rounded-2xl p-4"
                                style={{ backgroundColor: tile.bg }}
                            >
                                <View
                                    className="w-10 h-10 rounded-xl items-center justify-center mb-3"
                                    style={{ backgroundColor: tile.color + '22' }}
                                >
                                    <Ionicons name={tile.icon as any} size={20} color={tile.color} />
                                </View>
                                <Text className="text-3xl font-bold" style={{ color: tile.color }}>
                                    {metrics[tile.key] ?? 0}
                                </Text>
                                <Text className="text-xs mt-0.5 font-medium" style={{ color: tile.color + 'cc' }}>
                                    {tile.label}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Pending Actions */}
                <View>
                    <Text className="text-base font-semibold text-foreground mb-3">Pending Actions</Text>
                    <View className="bg-white rounded-2xl border border-border overflow-hidden">
                        {PENDING_ITEMS.map((item, idx) => (
                            <View
                                key={item.key}
                                className={`flex-row items-center justify-between px-4 py-4 ${idx < PENDING_ITEMS.length - 1 ? 'border-b border-border/50' : ''}`}
                            >
                                <View className="flex-row items-center gap-3">
                                    <View
                                        className="w-9 h-9 rounded-xl items-center justify-center"
                                        style={{ backgroundColor: item.color + '18' }}
                                    >
                                        <Ionicons name={item.icon as any} size={18} color={item.color} />
                                    </View>
                                    <Text className="text-sm font-medium text-foreground">{item.label}</Text>
                                </View>
                                <View
                                    className="px-3 py-1 rounded-full"
                                    style={{ backgroundColor: item.color + '18' }}
                                >
                                    <Text className="text-sm font-bold" style={{ color: item.color }}>
                                        {pending[item.key] ?? 0}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Summary Card */}
                <View className="bg-primary rounded-2xl p-5">
                    <View className="flex-row items-center gap-2 mb-4">
                        <Ionicons name="bar-chart" size={20} color="white" />
                        <Text className="text-white font-semibold text-base">Platform Summary</Text>
                    </View>
                    {[
                        { label: 'Active Schools', value: metrics.totalSchools ?? 0 },
                        { label: 'Registered Users', value: metrics.totalUsers ?? 0 },
                        { label: 'Content Files', value: metrics.totalPdfs ?? 0 },
                        { label: 'Total Downloads', value: metrics.totalDownloads ?? 0 },
                    ].map((stat, idx) => (
                        <View
                            key={stat.label}
                            className={`flex-row justify-between py-2.5 ${idx < 3 ? 'border-b border-white/20' : ''}`}
                        >
                            <Text className="text-white/80 text-sm">{stat.label}</Text>
                            <Text className="text-white font-bold text-sm">{stat.value.toLocaleString()}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </ScrollView>
    );
}
