import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { analyticsApi } from '@shared/api/index.js';
import { useAuth } from '../../src/context/AuthContext';

interface Metrics {
    totalUsers: number;
    totalSchools: number;
    totalPdfs: number;
    totalDownloads: number;
}

interface PendingItems {
    pdfApprovals: number;
    userRequests: number;
    schoolRegistrations: number;
}

const TILES = [
    { key: 'totalUsers', label: 'Total Users', icon: 'people', color: '#7c3aed', bg: '#ede9fe' },
    { key: 'totalSchools', label: 'Total Schools', icon: 'business', color: '#2563eb', bg: '#dbeafe' },
    { key: 'totalPdfs', label: 'Total PDFs', icon: 'document-text', color: '#059669', bg: '#d1fae5' },
    { key: 'totalDownloads', label: 'Downloads', icon: 'download', color: '#d97706', bg: '#fef3c7' },
];

export default function AdminDashboard() {
    const { user, logout } = useAuth();
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [pending, setPending] = useState<PendingItems | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            const data = await analyticsApi.getDashboard();
            setMetrics(data.metrics);
            setPending(data.pendingItems);
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

    return (
        <ScrollView
            className="flex-1 bg-background"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />}
        >
            {/* Header */}
            <View className="bg-white px-5 pt-14 pb-5 border-b border-border">
                <Text className="text-2xl font-bold text-foreground">Dashboard</Text>
                <Text className="text-muted mt-0.5">Welcome back, {user?.name}</Text>
            </View>

            <View className="p-4 space-y-4">
                {/* Metric tiles */}
                <View className="flex-row flex-wrap gap-3">
                    {TILES.map(tile => (
                        <View
                            key={tile.key}
                            className="flex-1 min-w-[44%] rounded-2xl p-4"
                            style={{ backgroundColor: tile.bg }}
                        >
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

                {/* Pending actions */}
                {pending && (
                    <View className="bg-white rounded-2xl p-4 border border-border">
                        <Text className="text-base font-semibold text-foreground mb-3">Pending Actions</Text>
                        {[
                            { label: 'PDF Approvals', value: pending.pdfApprovals, color: '#d97706' },
                            { label: 'User Requests', value: pending.userRequests, color: '#4f46e5' },
                            { label: 'School Registrations', value: pending.schoolRegistrations, color: '#059669' },
                        ].map(item => (
                            <View key={item.label} className="flex-row items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                                <Text className="text-sm text-foreground">{item.label}</Text>
                                <View className="px-2.5 py-0.5 rounded-full" style={{ backgroundColor: item.color + '22' }}>
                                    <Text className="text-sm font-bold" style={{ color: item.color }}>{item.value}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Logout */}
                <TouchableOpacity
                    className="bg-red-50 border border-red-200 rounded-2xl p-4 flex-row items-center justify-center gap-2"
                    onPress={logout}
                >
                    <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                    <Text className="text-red-500 font-semibold">Sign Out</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}
