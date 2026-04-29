import { useEffect, useState } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, TextInput,
    RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usersApi } from '@shared/api/index.js';
import { ROLE_LABELS } from '@shared/constants/roles.js';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    schoolId?: string;
}

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
    platform_admin: { bg: '#ede9fe', text: '#7c3aed' },
    admin: { bg: '#ede9fe', text: '#7c3aed' },
    platform_viewer: { bg: '#e0e7ff', text: '#4338ca' },
    school_admin: { bg: '#dbeafe', text: '#1d4ed8' },
    school: { bg: '#dbeafe', text: '#1d4ed8' },
    school_viewer: { bg: '#e0f2fe', text: '#0369a1' },
    teacher: { bg: '#d1fae5', text: '#065f46' },
};

export default function UsersScreen() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');

    const fetchUsers = async () => {
        try {
            const res = await usersApi.listUsers({ per_page: 100, sort: '-created' });
            setUsers(res.items ?? []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleResetPassword = (user: User) => {
        Alert.alert(
            'Reset Password',
            `Reset password for ${user.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset & Show',
                    onPress: async () => {
                        try {
                            const res = await usersApi.resetUserPassword(user.id, 'manual');
                            Alert.alert('Password Reset', `New password:\n\n${res.generatedPassword}\n\nShare this securely.`);
                        } catch (err: any) {
                            Alert.alert('Error', err.message);
                        }
                    },
                },
            ]
        );
    };

    const filtered = users.filter(u =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
    );

    const renderItem = ({ item }: { item: User }) => {
        const roleStyle = ROLE_COLORS[item.role] ?? { bg: '#f3f4f6', text: '#374151' };
        return (
            <View className="bg-white mx-4 mb-3 rounded-2xl p-4 border border-border">
                <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                        <Text className="text-primary font-bold text-base">
                            {(item.name || item.email || 'U').charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <View className="flex-1 min-w-0">
                        <Text className="font-semibold text-foreground" numberOfLines={1}>{item.name || 'Unnamed'}</Text>
                        <Text className="text-xs text-muted" numberOfLines={1}>{item.email}</Text>
                    </View>
                    <View className="items-end gap-1.5">
                        <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: roleStyle.bg }}>
                            <Text className="text-xs font-medium" style={{ color: roleStyle.text }}>
                                {ROLE_LABELS[item.role] ?? item.role}
                            </Text>
                        </View>
                        <View className={`px-2 py-0.5 rounded-full ${item.isActive ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                            <Text className={`text-xs ${item.isActive ? 'text-emerald-700' : 'text-gray-500'}`}>
                                {item.isActive ? 'Active' : 'Inactive'}
                            </Text>
                        </View>
                    </View>
                </View>

                <TouchableOpacity
                    className="mt-3 flex-row items-center justify-center gap-1.5 py-2 rounded-lg bg-gray-50 border border-border"
                    onPress={() => handleResetPassword(item)}
                >
                    <Ionicons name="key-outline" size={14} color="#6b7280" />
                    <Text className="text-xs text-muted font-medium">Reset Password</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View className="flex-1 bg-background">
            <View className="bg-white px-5 pt-14 pb-4 border-b border-border">
                <Text className="text-2xl font-bold text-foreground">Users</Text>
                <View className="flex-row items-center bg-gray-100 rounded-xl px-3 mt-3">
                    <Ionicons name="search" size={16} color="#9ca3af" />
                    <TextInput
                        className="flex-1 py-2.5 px-2 text-foreground text-sm"
                        placeholder="Search by name or email..."
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
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchUsers(); }} tintColor="#4f46e5" />}
                    ListEmptyComponent={
                        <View className="items-center justify-center py-20">
                            <Ionicons name="people-outline" size={48} color="#d1d5db" />
                            <Text className="text-muted mt-3">No users found</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}
