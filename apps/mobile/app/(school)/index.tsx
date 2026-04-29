import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { apiFetch } from '../../src/lib/apiClient';

export default function SchoolDashboard() {
    const { user } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState({ totalDownloads: 0, totalUsers: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStats = async () => {
        if (!user?.schoolId) { setLoading(false); return; }
        try {
            const res = await apiFetch(`/api/schools/${user.schoolId}/stats`);
            setStats({ totalDownloads: res.totalDownloads ?? 0, totalUsers: res.totalUsers ?? 0 });
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { fetchStats(); }, []);

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
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats(); }} tintColor="#4f46e5" />}
        >
            {/* Header with notification bell */}
            <View className="bg-white px-5 pt-14 pb-5 border-b border-border">
                <View className="flex-row items-center justify-between">
                    <View>
                        <Text className="text-2xl font-bold text-foreground">School Dashboard</Text>
                        <Text className="text-muted text-sm mt-0.5">Welcome, {user?.name}</Text>
                    </View>
                    <TouchableOpacity
                        className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center"
                        onPress={() => router.push('/(school)/notifications')}
                    >
                        <Ionicons name="notifications-outline" size={22} color="#4f46e5" />
                    </TouchableOpacity>
                </View>
            </View>

            <View className="p-4 space-y-3">
                {/* Stats tiles */}
                {[
                    { label: 'Total Downloads', value: stats.totalDownloads, icon: 'download', color: '#d97706', bg: '#fef3c7' },
                    { label: 'School Users', value: stats.totalUsers, icon: 'people', color: '#2563eb', bg: '#dbeafe' },
                ].map(tile => (
                    <View key={tile.label} className="rounded-2xl p-5 flex-row items-center gap-4" style={{ backgroundColor: tile.bg }}>
                        <View className="w-12 h-12 rounded-xl items-center justify-center" style={{ backgroundColor: tile.color + '22' }}>
                            <Ionicons name={tile.icon as any} size={24} color={tile.color} />
                        </View>
                        <View>
                            <Text className="text-3xl font-bold" style={{ color: tile.color }}>{tile.value}</Text>
                            <Text className="text-sm" style={{ color: tile.color + 'cc' }}>{tile.label}</Text>
                        </View>
                    </View>
                ))}

                {/* Quick Actions */}
                <View>
                    <Text className="text-sm font-semibold text-muted mb-2 mt-1 uppercase tracking-wider">Quick Access</Text>
                    <View className="flex-row gap-3">
                        <TouchableOpacity
                            className="flex-1 bg-white rounded-2xl p-4 items-center border border-border"
                            onPress={() => router.push('/(school)/portal')}
                        >
                            <Ionicons name="library-outline" size={22} color="#4f46e5" />
                            <Text className="text-xs font-medium text-foreground mt-1.5">Browse Library</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="flex-1 bg-white rounded-2xl p-4 items-center border border-border"
                            onPress={() => router.push('/(school)/requests')}
                        >
                            <Ionicons name="clipboard-outline" size={22} color="#059669" />
                            <Text className="text-xs font-medium text-foreground mt-1.5">User Requests</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="flex-1 bg-white rounded-2xl p-4 items-center border border-border"
                            onPress={() => router.push('/(school)/notifications')}
                        >
                            <Ionicons name="notifications-outline" size={22} color="#d97706" />
                            <Text className="text-xs font-medium text-foreground mt-1.5">Notifications</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}
