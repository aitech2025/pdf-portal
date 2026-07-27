import { useEffect, useState } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, TextInput,
    RefreshControl, ActivityIndicator, Alert, Modal,
    KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { schoolsApi } from '@shared/api/index.js';

/* Design tokens mirrored from apps/web (index.css / tailwind.config.js) */
const BRAND = '#5b5ff1';
const BG = '#fbfcff';
const FG = '#111827';
const MUTED_FG = '#6b7280';
const BORDER = '#e5e7eb';
const CARD_BORDER = '#eef0f3';

interface School {
    id: string; schoolName: string; schoolId: string;
    location?: string; email?: string; isActive: boolean;
    phone?: string; address?: string; pointOfContactName?: string;
}

const EMPTY_FORM = { schoolName: '', schoolId: '', email: '', location: '', phone: '', address: '' };

export default function SchoolsScreen() {
    const insets = useSafeAreaInsets();
    const [schools, setSchools] = useState<School[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
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
        setForm({ schoolName: s.schoolName, schoolId: s.schoolId, email: s.email ?? '', location: s.location ?? '', phone: s.phone ?? '', address: s.address ?? '' });
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

    const filtered = schools.filter(s => {
        const matchesSearch =
            s.schoolName.toLowerCase().includes(search.toLowerCase()) ||
            s.schoolId.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? s.isActive : !s.isActive);
        return matchesSearch && matchesStatus;
    });

    const FIELDS = [
        { key: 'schoolName', label: 'School Name *', placeholder: 'e.g. Springfield High', keyboard: 'default' },
        { key: 'schoolId', label: 'School ID *', placeholder: 'e.g. SCH003', keyboard: 'default', disabled: !!editSchool },
        { key: 'email', label: 'Email', placeholder: 'school@example.com', keyboard: 'email-address' },
        { key: 'location', label: 'Location', placeholder: 'City, State', keyboard: 'default' },
        { key: 'phone', label: 'Phone', placeholder: '+91 9876543210', keyboard: 'phone-pad' },
        { key: 'address', label: 'Address', placeholder: 'Full address', keyboard: 'default' },
    ];

    const STATUS_TABS: { label: string; value: 'all' | 'active' | 'inactive' }[] = [
        { label: 'All', value: 'all' },
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
    ];

    const renderItem = ({ item }: { item: School }) => (
        <View style={{ backgroundColor: 'white', marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: CARD_BORDER }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, marginRight: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: BRAND + '1a', alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="business" size={16} color={BRAND} />
                        </View>
                        <Text style={{ fontSize: 15, fontWeight: '600', color: FG, flex: 1 }} numberOfLines={1}>{item.schoolName}</Text>
                    </View>
                    <Text style={{ fontSize: 12, fontFamily: 'monospace', color: MUTED_FG, marginLeft: 40 }}>{item.schoolId}</Text>
                    {item.location ? <Text style={{ fontSize: 12, color: MUTED_FG, marginLeft: 40, marginTop: 2 }} numberOfLines={1}>{item.location}</Text> : null}
                    {item.email ? <Text style={{ fontSize: 12, color: MUTED_FG, marginLeft: 40 }} numberOfLines={1}>{item.email}</Text> : null}
                </View>
                <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: item.isActive ? '#d1fae5' : '#f3f4f6' }}>
                    <Text style={{ fontSize: 11, fontWeight: '500', color: item.isActive ? '#047857' : '#6b7280' }}>
                        {item.isActive ? 'Active' : 'Inactive'}
                    </Text>
                </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <TouchableOpacity style={{ flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: BRAND + '14', alignItems: 'center' }} onPress={() => openEdit(item)}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: BRAND }}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={{
                        flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignItems: 'center',
                        borderColor: item.isActive ? '#fecaca' : '#a7f3d0', backgroundColor: item.isActive ? '#fef2f2' : '#ecfdf5',
                    }}
                    onPress={() => handleToggle(item)} disabled={!!actionLoading[item.id]}
                >
                    {actionLoading[item.id]
                        ? <ActivityIndicator size="small" color={item.isActive ? '#ef4444' : '#059669'} />
                        : <Text style={{ fontSize: 12, fontWeight: '600', color: item.isActive ? '#dc2626' : '#059669' }}>{item.isActive ? 'Deactivate' : 'Activate'}</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', alignItems: 'center', justifyContent: 'center' }} onPress={() => handleDelete(item)}>
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: BG }}>
            <View style={{ backgroundColor: 'white', paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: CARD_BORDER }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 24, fontWeight: '700', color: FG }}>School Network</Text>
                    <TouchableOpacity style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center' }} onPress={openCreate}>
                        <Ionicons name="add" size={20} color="white" />
                    </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 13, color: MUTED_FG, marginBottom: 12 }}>Manage participating institutions and their access.</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 12 }}>
                    <Ionicons name="search" size={16} color="#9ca3af" />
                    <TextInput style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8, color: FG, fontSize: 14 }} placeholder="Search by name or ID..." placeholderTextColor="#9ca3af" value={search} onChangeText={setSearch} />
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                    {STATUS_TABS.map(tab => {
                        const active = statusFilter === tab.value;
                        return (
                            <TouchableOpacity key={tab.value} onPress={() => setStatusFilter(tab.value)}
                                style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, backgroundColor: active ? BRAND : '#f3f4f6' }}>
                                <Text style={{ fontSize: 12, fontWeight: '600', color: active ? 'white' : MUTED_FG }}>{tab.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {loading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color={BRAND} /></View>
            ) : (
                <FlatList
                    data={filtered} keyExtractor={item => item.id} renderItem={renderItem}
                    contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 24 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSchools(); }} tintColor={BRAND} />}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
                            <Ionicons name="business-outline" size={48} color="#d1d5db" />
                            <Text style={{ color: MUTED_FG, marginTop: 12 }}>No schools found</Text>
                        </View>
                    }
                />
            )}

            <Modal visible={showForm} transparent animationType="slide">
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                        <View style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 24, paddingBottom: insets.bottom + 24, maxHeight: '90%' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                                <Text style={{ fontSize: 18, fontWeight: '700', color: FG }}>{editSchool ? 'Edit School' : 'Register School'}</Text>
                                <TouchableOpacity onPress={() => setShowForm(false)}><Ionicons name="close" size={24} color={MUTED_FG} /></TouchableOpacity>
                            </View>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {FIELDS.map(f => (
                                    <View key={f.key} style={{ marginBottom: 16 }}>
                                        <Text style={{ fontSize: 13, fontWeight: '500', color: FG, marginBottom: 6 }}>{f.label}</Text>
                                        <TextInput
                                            style={{ borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: FG, fontSize: 14, backgroundColor: f.disabled ? '#f3f4f6' : '#f9fafb' }}
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
                                    style={{ marginTop: 8, borderRadius: 12, paddingVertical: 15, alignItems: 'center', backgroundColor: submitting ? BRAND + '99' : BRAND }}
                                    onPress={handleSubmit} disabled={submitting}
                                >
                                    {submitting ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>{editSchool ? 'Save Changes' : 'Create School'}</Text>}
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}
