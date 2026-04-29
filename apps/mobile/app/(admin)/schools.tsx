import { useEffect, useState } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, TextInput,
    RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { schoolsApi } from '@shared/api/index.js';

interface School {
    id: string;
    schoolName: string;
    schoolId: string;
    location?: string;
    email?: string;
    isActive: boolean;
}

export default function SchoolsScreen() {
    const [schools, setSchools] = useState<School[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

    const fetchSchools = async () => {
        try {
            const res = await schoolsApi.listSchools({ per_page: 100, sort: '-created' });
            setSchools(res.items ?? []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchSchools(); }, []);

    const handleToggle = async (school: School) => {
        const newActive = !school.isActive;
        const action = newActive ? 'activate' : 'deactivate';
        Alert.alert(
            `${newActive ? 'Activate' : 'Deactivate'} School`,
            `Are you sure you want to ${action} "${school.schoolName}"?${!newActive ? ' All school users will be disabled.' : ''}`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: newActive ? 'Activate' : 'Deactivate',
                    style: newActive ? 'default' : 'destructive',
                    onPress: async () => {
                        setActionLoading(p => ({ ...p, [school.id]: true }));
                        try {
                            await schoolsApi.updateSchool(school.id, {
                                isActive: newActive,
                                deactivationMessage: newActive ? '' : 'Deactivated by platform admin.',
                            });
                            await schoolsApi.toggleSchoolUsers(school.id, newActive);
                            fetchSchools();
                        } catch (err: any) {
                            Alert.alert('Error', err.message);
                        } finally {
                            setActionLoading(p => ({ ...p, [school.id]: false }));
                        }
                    },
                },
            ]
        );
    };

    const filtered = schools.filter(s =>
        s.schoolName.toLowerCase().includes(search.toLowerCase()) ||
        s.schoolId.toLowerCase().includes(search.toLowerCase())
    );

    const renderItem = ({ item }: { item: School }) => (
        <View className="bg-white mx-4 mb-3 rounded-2xl p-4 border border-border">
            <View className="flex-row items-start justify-between">
                <View className="flex-1 mr-3">
                    <View className="flex-row items-center gap-2 mb-1">
                        <View className="w-8 h-8 rounded-lg bg-primary/10 items-center justify-center">
                            <Ionicons name="business" size={16} color="#4f46e5" />
                        </View>
                        <Text className="text-base font-semibold text-foreground flex-1" numberOfLines={1}>
                            {item.schoolName}
                        </Text>
                    </View>
                    <Text className="text-xs font-mono text-muted ml-10">{item.schoolId}</Text>
                    {item.location && (
                        <Text className="text-xs text-muted ml-10 mt-0.5" numberOfLines={1}>{item.location}</Text>
                    )}
                </View>

                <View className="items-end gap-2">
                    <View className={`px-2 py-0.5 rounded-full ${item.isActive ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                        <Text className={`text-xs font-medium ${item.isActive ? 'text-emerald-700' : 'text-gray-500'}`}>
                            {item.isActive ? 'Active' : 'Inactive'}
                        </Text>
                    </View>

                    <TouchableOpacity
                        className={`px-3 py-1.5 rounded-lg border ${item.isActive
                                ? 'border-red-200 bg-red-50'
                                : 'border-emerald-200 bg-emerald-50'
                            }`}
                        onPress={() => handleToggle(item)}
                        disabled={!!actionLoading[item.id]}
                    >
                        {actionLoading[item.id] ? (
                            <ActivityIndicator size="small" color={item.isActive ? '#ef4444' : '#059669'} />
                        ) : (
                            <Text className={`text-xs font-semibold ${item.isActive ? 'text-red-600' : 'text-emerald-600'}`}>
                                {item.isActive ? 'Deactivate' : 'Activate'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <View className="flex-1 bg-background">
            {/* Header */}
            <View className="bg-white px-5 pt-14 pb-4 border-b border-border">
                <Text className="text-2xl font-bold text-foreground">Schools</Text>
                <View className="flex-row items-center bg-gray-100 rounded-xl px-3 mt-3">
                    <Ionicons name="search" size={16} color="#9ca3af" />
                    <TextInput
                        className="flex-1 py-2.5 px-2 text-foreground text-sm"
                        placeholder="Search by name or ID..."
                        placeholderTextColor="#9ca3af"
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#4f46e5" />
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSchools(); }} tintColor="#4f46e5" />}
                    ListEmptyComponent={
                        <View className="items-center justify-center py-20">
                            <Ionicons name="business-outline" size={48} color="#d1d5db" />
                            <Text className="text-muted mt-3">No schools found</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}
