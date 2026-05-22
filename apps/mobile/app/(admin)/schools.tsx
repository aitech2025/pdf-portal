import { useEffect, useState } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, TextInput,
    RefreshControl, ActivityIndicator, Alert, Modal,
    KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { schoolsApi } from '@shared/api/index.js';

interface School {
    id: string; schoolName: string; schoolId: string;
    location?: string; email?: string; isActive: boolean;
    phone?: string; address?: string;
}

const EMPTY_FORM = { schoolName: '', schoolId: '', email: '', location: '', phone: '', address: '' };

export default function SchoolsScreen() {
    const [schools, setSchools] = useState<School[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
    const [showForm, setShowForm] = useState(false);
    const [editSchool, setEditSchool] = useState<School | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [submitting, setSubmitting] = useState(false);

    const fetchSchools = async () => {
        try {
            const res = await schoolsApi.listSchools({ per_page: 100, sort: '-created' });
            setSchools(res.items ?? []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { fetchSchools(); }, []);

    const openCreate = () => { setEditSchool(null); setForm(EMPTY_FORM); setShowForm(true); };
    const openEdit = (s: School) => {
        setEditSchool(s);
        setForm({ schoolName: s.schoolName, schoolId: s.schoolId, email: s.email ?? '', location: s.location ?? '', phone: (s as any).phone ?? '', address: (s as any).address ?? '' });
        setShowForm(true);
    };

    const handleSubmit = async () => {
        if (!form.schoolName.trim() || !form.schoolId.trim()) {
            Alert.alert('Error', 'School name and ID are required.'); return;
        }
        setSubmitting(true);
        try {
            if (editSchool) {
                await schoolsApi.updateSchool(editSchool.id, { schoolName: form.schoolName, email: form.email, location: form.location, phone: form.phone, address: form.address });
                Alert.alert('Success', 'School updated.');
            } else {
                await schoolsApi.createSchool({ schoolName: form.schoolName, schoolId: form.schoolId, email: form.email, location: form.location, phone: form.phone, address: form.address, isActive: true });
                Alert.alert('Success', 'School created.');
            }
            setShowForm(false);
            fetchSchools();
        } catch (err: any) { Alert.alert('Error', err.message); }
        finally { setSubmitting(false); }
    };

    const handleDelete = (school: School) => {
        Alert.alert('Delete School', `Delete "${school.schoolName}"? This cannot be undone.`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    setActionLoading(p => ({ ...p, [school.id]: true }));
                    try { await schoolsApi.deleteSchool(school.id); fetchSchools(); }
                    catch (err: any) { Alert.alert('Error', err.message); }
                    finally { setActionLoading(p => ({ ...p, [school.id]: false })); }
                }
            },
        ]);
    };

    const handleToggle = async (school: School) => {
        const newActive = !school.isActive;
        Alert.alert(
            `${newActive ? 'Activate' : 'Deactivate'} School`,
            `Are you sure you want to ${newActive ? 'activate' : 'deactivate'} "${school.schoolName}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: newActive ? 'Activate' : 'Deactivate', style: newActive ? 'default' : 'destructive',
                    onPress: async () => {
                        setActionLoading(p => ({ ...p, [school.id]: true }));
                        try {
                            await schoolsApi.updateSchool(school.id, { isActive: newActive });
                            await schoolsApi.toggleSchoolUsers(school.id, newActive);
                            fetchSchools();
                        } catch (err: any) { Alert.alert('Error', err.message); }
                        finally { setActionLoading(p => ({ ...p, [school.id]: false })); }
                    }
                },
            ]
        );
    };

    const filtered = schools.filter(s =>
        s.schoolName.toLowerCase().includes(search.toLowerCase()) ||
        s.schoolId.toLowerCase().includes(search.toLowerCase())
    );

    const FIELDS = [
        { key: 'schoolName', label: 'School Name *', placeholder: 'e.g. Springfield High', keyboard: 'default' },
        { key: 'schoolId', label: 'School ID *', placeholder: 'e.g. SCH003', keyboard: 'default', disabled: !!editSchool },
        { key: 'email', label: 'Email', placeholder: 'school@example.com', keyboard: 'email-address' },
        { key: 'location', label: 'Location', placeholder: 'City, State', keyboard: 'default' },
        { key: 'phone', label: 'Phone', placeholder: '+91 9876543210', keyboard: 'phone-pad' },
        { key: 'address', label: 'Address', placeholder: 'Full address', keyboard: 'default' },
    ];

    const renderItem = ({ item }: { item: School }) => (
        <View className="bg-white mx-4 mb-3 rounded-2xl p-4 border border-border">
            <View className="flex-row items-start justify-between">
                <View className="flex-1 mr-3">
                    <View className="flex-row items-center gap-2 mb-1">
                        <View className="w-8 h-8 rounded-lg bg-primary/10 items-center justify-center">
                            <Ionicons name="business" size={16} color="#4f46e5" />
                        </View>
                        <Text className="text-base font-semibold text-foreground flex-1" numberOfLines={1}>{item.schoolName}</Text>
                    </View>
                    <Text className="text-xs font-mono text-muted ml-10">{item.schoolId}</Text>
                    {item.location && <Text className="text-xs text-muted ml-10 mt-0.5" numberOfLines={1}>{item.location}</Text>}
                    {item.email && <Text className="text-xs text-muted ml-10" numberOfLines={1}>{item.email}</Text>}
                </View>
                <View className={`px-2 py-0.5 rounded-full ${item.isActive ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                    <Text className={`text-xs font-medium ${item.isActive ? 'text-emerald-700' : 'text-gray-500'}`}>
                        {item.isActive ? 'Active' : 'Inactive'}
                    </Text>
                </View>
            </View>

            <View className="flex-row gap-2 mt-3">
                <TouchableOpacity className="flex-1 py-2 rounded-xl bg-primary/10 items-center" onPress={() => openEdit(item)}>
                    <Text className="text-xs font-semibold text-primary">Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className={`flex-1 py-2 rounded-xl border items-center ${item.isActive ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}
                    onPress={() => handleToggle(item)} disabled={!!actionLoading[item.id]}
                >
                    {actionLoading[item.id]
                        ? <ActivityIndicator size="small" color={item.isActive ? '#ef4444' : '#059669'} />
                        : <Text className={`text-xs font-semibold ${item.isActive ? 'text-red-600' : 'text-emerald-600'}`}>{item.isActive ? 'Deactivate' : 'Activate'}</Text>}
                </TouchableOpacity>
                <TouchableOpacity className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 items-center justify-center" onPress={() => handleDelete(item)}>
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View className="flex-1 bg-background">
            <View className="bg-white px-5 pt-14 pb-4 border-b border-border">
                <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-2xl font-bold text-foreground">Schools</Text>
                    <TouchableOpacity className="w-9 h-9 rounded-xl bg-primary items-center justify-center" onPress={openCreate}>
                        <Ionicons name="add" size={20} color="white" />
                    </TouchableOpacity>
                </View>
                <View className="flex-row items-center bg-gray-100 rounded-xl px-3">
                    <Ionicons name="search" size={16} color="#9ca3af" />
                    <TextInput className="flex-1 py-2.5 px-2 text-foreground text-sm" placeholder="Search by name or ID..." placeholderTextColor="#9ca3af" value={search} onChangeText={setSearch} />
                </View>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color="#4f46e5" /></View>
            ) : (
                <FlatList
                    data={filtered} keyExtractor={item => item.id} renderItem={renderItem}
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

            <Modal visible={showForm} transparent animationType="slide">
                <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View className="flex-1 bg-black/50 justify-end">
                        <View className="bg-white rounded-t-3xl px-6 pt-6 pb-8" style={{ maxHeight: '90%' }}>
                            <View className="flex-row items-center justify-between mb-5">
                                <Text className="text-lg font-bold text-foreground">{editSchool ? 'Edit School' : 'Add School'}</Text>
                                <TouchableOpacity onPress={() => setShowForm(false)}><Ionicons name="close" size={24} color="#6b7280" /></TouchableOpacity>
                            </View>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {FIELDS.map(f => (
                                    <View key={f.key} className="mb-4">
                                        <Text className="text-sm font-medium text-foreground mb-1.5">{f.label}</Text>
                                        <TextInput
                                            className={`border border-border rounded-xl px-4 py-3 text-foreground text-sm ${f.disabled ? 'bg-gray-100' : 'bg-gray-50'}`}
                                            placeholder={f.placeholder} placeholderTextColor="#9ca3af"
                                            value={form[f.key as keyof typeof form]}
                                            onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                                            keyboardType={f.keyboard as any}
                                            autoCapitalize={f.keyboard === 'email-address' ? 'none' : 'words'}
                                            editable={!f.disabled}
                                        />
                                    </View>
                                ))}
                                <TouchableOpacity
                                    className={`mt-2 rounded-xl py-4 items-center ${submitting ? 'bg-primary/60' : 'bg-primary'}`}
                                    onPress={handleSubmit} disabled={submitting}
                                >
                                    {submitting ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">{editSchool ? 'Save Changes' : 'Create School'}</Text>}
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}
