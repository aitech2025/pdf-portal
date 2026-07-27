import { useEffect, useState } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, TextInput,
    RefreshControl, ActivityIndicator, Alert, Modal,
    KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usersApi, schoolsApi } from '@shared/api/index.js';
import { ROLE_LABELS } from '@shared/constants/roles.js';

/* Design tokens mirrored from apps/web (index.css / tailwind.config.js) */
const BRAND = '#5b5ff1';
const BG = '#fbfcff';
const FG = '#111827';
const MUTED_FG = '#6b7280';
const BORDER = '#e5e7eb';
const CARD_BORDER = '#eef0f3';

interface User { id: string; name: string; email: string; role: string; isActive: boolean; schoolId?: string; lastLogin?: string; }
interface School { id: string; schoolName: string; }

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
    platform_admin: { bg: '#ede9fe', text: '#7c3aed' },
    admin: { bg: '#ede9fe', text: '#7c3aed' },
    platform_viewer: { bg: '#e0e7ff', text: '#4338ca' },
    moderator: { bg: '#fce7f3', text: '#be185d' },
    school_admin: { bg: '#dbeafe', text: '#1d4ed8' },
    school: { bg: '#dbeafe', text: '#1d4ed8' },
    school_viewer: { bg: '#e0f2fe', text: '#0369a1' },
    teacher: { bg: '#d1fae5', text: '#065f46' },
};

const ALL_ROLES = ['platform_admin', 'admin', 'moderator', 'platform_viewer', 'school_admin', 'school_viewer', 'teacher'];
const SCHOOL_ROLES = ['school_admin', 'school_viewer', 'teacher'];

const EMPTY_FORM = { name: '', email: '', password: '', role: 'school_admin', schoolId: '' };

export default function UsersScreen() {
    const insets = useSafeAreaInsets();
    const [users, setUsers] = useState<User[]>([]);
    const [schools, setSchools] = useState<School[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<'all' | 'platform' | 'school'>('all');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [showRolePicker, setShowRolePicker] = useState(false);
    const [showSchoolPicker, setShowSchoolPicker] = useState(false);

    const fetchAll = async () => {
        try {
            const [ur, sr] = await Promise.all([
                usersApi.listUsers({ per_page: 100, sort: '-created' }),
                schoolsApi.listSchools({ per_page: 100 }),
            ]);
            setUsers(ur.items ?? []);
            setSchools(sr.items ?? []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { fetchAll(); }, []);

    const handleCreate = async () => {
        if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
            Alert.alert('Error', 'Name, email and password are required.'); return;
        }
        if (SCHOOL_ROLES.includes(form.role) && !form.schoolId) {
            Alert.alert('Error', 'Please select a school for this role.'); return;
        }
        setSubmitting(true);
        try {
            await usersApi.createUser({
                name: form.name.trim(), email: form.email.trim(),
                password: form.password, role: form.role,
                schoolId: SCHOOL_ROLES.includes(form.role) ? form.schoolId : undefined,
                isActive: true, verified: true,
            });
            Alert.alert('Success', 'User created successfully.');
            setShowForm(false); setForm(EMPTY_FORM); fetchAll();
        } catch (err: any) { Alert.alert('Error', err.message); }
        finally { setSubmitting(false); }
    };

    const handleToggleActive = (user: User) => {
        Alert.alert(
            user.isActive ? 'Deactivate User' : 'Activate User',
            `${user.isActive ? 'Deactivate' : 'Activate'} "${user.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: user.isActive ? 'Deactivate' : 'Activate', style: user.isActive ? 'destructive' : 'default',
                    onPress: async () => {
                        try { await usersApi.updateUser(user.id, { isActive: !user.isActive }); fetchAll(); }
                        catch (err: any) { Alert.alert('Error', err.message); }
                    }
                },
            ]
        );
    };

    const handleDelete = (user: User) => {
        Alert.alert('Delete User', `Delete "${user.name}"? This cannot be undone.`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try { await usersApi.deleteUser(user.id); fetchAll(); }
                    catch (err: any) { Alert.alert('Error', err.message); }
                }
            },
        ]);
    };

    const handleResetPassword = (user: User) => {
        Alert.alert('Reset Password', `Reset password for ${user.name}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Reset', onPress: async () => {
                    try {
                        const res = await usersApi.resetUserPassword(user.id, 'manual');
                        Alert.alert('Password Reset', `New password:\n\n${res.generatedPassword}\n\nShare this securely.`);
                    } catch (err: any) { Alert.alert('Error', err.message); }
                }
            },
        ]);
    };

    const filtered = users.filter(u => {
        const matchesSearch =
            u.name?.toLowerCase().includes(search.toLowerCase()) ||
            u.email?.toLowerCase().includes(search.toLowerCase());
        const isSchoolRole = SCHOOL_ROLES.includes(u.role) || u.role === 'school';
        const matchesRole =
            roleFilter === 'all' || (roleFilter === 'school' ? isSchoolRole : !isSchoolRole);
        return matchesSearch && matchesRole;
    });

    const selectedSchoolName = schools.find(s => s.id === form.schoolId)?.schoolName ?? 'Select school...';

    const ROLE_TABS: { label: string; value: 'all' | 'platform' | 'school' }[] = [
        { label: 'All', value: 'all' },
        { label: 'Platform', value: 'platform' },
        { label: 'School', value: 'school' },
    ];

    const renderItem = ({ item }: { item: User }) => {
        const roleStyle = ROLE_COLORS[item.role] ?? { bg: '#f3f4f6', text: '#374151' };
        return (
            <View style={{ backgroundColor: 'white', marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: CARD_BORDER }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: BRAND + '1a', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: BRAND, fontWeight: '700', fontSize: 16 }}>{(item.name || item.email || 'U').charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontWeight: '600', color: FG, fontSize: 14 }} numberOfLines={1}>{item.name || 'Unnamed'}</Text>
                        <Text style={{ fontSize: 12, color: MUTED_FG }} numberOfLines={1}>{item.email}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                        <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: roleStyle.bg }}>
                            <Text style={{ fontSize: 11, fontWeight: '500', color: roleStyle.text }}>{ROLE_LABELS[item.role] ?? item.role}</Text>
                        </View>
                        <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: item.isActive ? '#d1fae5' : '#f3f4f6' }}>
                            <Text style={{ fontSize: 11, color: item.isActive ? '#047857' : '#6b7280' }}>{item.isActive ? 'Active' : 'Inactive'}</Text>
                        </View>
                    </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                    <TouchableOpacity style={{ flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: BORDER, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 }} onPress={() => handleResetPassword(item)}>
                        <Ionicons name="key-outline" size={13} color={MUTED_FG} />
                        <Text style={{ fontSize: 12, color: MUTED_FG, fontWeight: '500' }}>Reset Pwd</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{
                            flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignItems: 'center',
                            borderColor: item.isActive ? '#fde68a' : '#a7f3d0', backgroundColor: item.isActive ? '#fffbeb' : '#ecfdf5',
                        }}
                        onPress={() => handleToggleActive(item)}
                    >
                        <Text style={{ fontSize: 12, fontWeight: '600', color: item.isActive ? '#d97706' : '#059669' }}>{item.isActive ? 'Deactivate' : 'Activate'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', alignItems: 'center', justifyContent: 'center' }} onPress={() => handleDelete(item)}>
                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: BG }}>
            <View style={{ backgroundColor: 'white', paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: CARD_BORDER }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 24, fontWeight: '700', color: FG }}>User Management</Text>
                    <TouchableOpacity style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center' }} onPress={() => { setForm(EMPTY_FORM); setShowForm(true); }}>
                        <Ionicons name="add" size={20} color="white" />
                    </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 13, color: MUTED_FG, marginBottom: 12 }}>Manage platform users, roles, and access permissions.</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 12 }}>
                    <Ionicons name="search" size={16} color="#9ca3af" />
                    <TextInput style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8, color: FG, fontSize: 14 }} placeholder="Search by name or email..." placeholderTextColor="#9ca3af" value={search} onChangeText={setSearch} />
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                    {ROLE_TABS.map(tab => {
                        const active = roleFilter === tab.value;
                        return (
                            <TouchableOpacity key={tab.value} onPress={() => setRoleFilter(tab.value)}
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
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor={BRAND} />}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
                            <Ionicons name="people-outline" size={48} color="#d1d5db" />
                            <Text style={{ color: MUTED_FG, marginTop: 12 }}>No users found</Text>
                        </View>
                    }
                />
            )}

            {/* Create User Modal */}
            <Modal visible={showForm} transparent animationType="slide">
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                        <View style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 24, paddingBottom: insets.bottom + 24, maxHeight: '92%' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                                <Text style={{ fontSize: 18, fontWeight: '700', color: FG }}>Add User</Text>
                                <TouchableOpacity onPress={() => setShowForm(false)}><Ionicons name="close" size={24} color={MUTED_FG} /></TouchableOpacity>
                            </View>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {[
                                    { key: 'name', label: 'Full Name *', placeholder: 'Enter full name', keyboard: 'default' },
                                    { key: 'email', label: 'Email *', placeholder: 'user@example.com', keyboard: 'email-address' },
                                    { key: 'password', label: 'Password *', placeholder: 'Min 8 characters', keyboard: 'default', secure: true },
                                ].map(f => (
                                    <View key={f.key} style={{ marginBottom: 16 }}>
                                        <Text style={{ fontSize: 13, fontWeight: '500', color: FG, marginBottom: 6 }}>{f.label}</Text>
                                        <TextInput
                                            style={{ backgroundColor: '#f9fafb', borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: FG, fontSize: 14 }}
                                            placeholder={f.placeholder} placeholderTextColor="#9ca3af"
                                            value={form[f.key as keyof typeof form]}
                                            onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                                            keyboardType={f.keyboard as any}
                                            autoCapitalize={f.keyboard === 'email-address' ? 'none' : 'words'}
                                            secureTextEntry={!!f.secure}
                                        />
                                    </View>
                                ))}

                                {/* Role picker */}
                                <View style={{ marginBottom: 16 }}>
                                    <Text style={{ fontSize: 13, fontWeight: '500', color: FG, marginBottom: 6 }}>Role *</Text>
                                    <TouchableOpacity style={{ backgroundColor: '#f9fafb', borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }} onPress={() => setShowRolePicker(true)}>
                                        <Text style={{ color: FG, fontSize: 14 }}>{ROLE_LABELS[form.role] ?? form.role}</Text>
                                        <Ionicons name="chevron-down" size={16} color={MUTED_FG} />
                                    </TouchableOpacity>
                                </View>

                                {/* School picker (only for school roles) */}
                                {SCHOOL_ROLES.includes(form.role) && (
                                    <View style={{ marginBottom: 16 }}>
                                        <Text style={{ fontSize: 13, fontWeight: '500', color: FG, marginBottom: 6 }}>School *</Text>
                                        <TouchableOpacity style={{ backgroundColor: '#f9fafb', borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }} onPress={() => setShowSchoolPicker(true)}>
                                            <Text style={{ fontSize: 14, color: form.schoolId ? FG : '#9ca3af' }}>{selectedSchoolName}</Text>
                                            <Ionicons name="chevron-down" size={16} color={MUTED_FG} />
                                        </TouchableOpacity>
                                    </View>
                                )}

                                <TouchableOpacity
                                    style={{ marginTop: 8, borderRadius: 12, paddingVertical: 15, alignItems: 'center', backgroundColor: submitting ? BRAND + '99' : BRAND }}
                                    onPress={handleCreate} disabled={submitting}
                                >
                                    {submitting ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>Create User</Text>}
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Role Picker Modal */}
            <Modal visible={showRolePicker} transparent animationType="fade">
                <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 24 }} activeOpacity={1} onPress={() => setShowRolePicker(false)}>
                    <View style={{ backgroundColor: 'white', borderRadius: 16, overflow: 'hidden' }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: FG, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: BORDER }}>Select Role</Text>
                        {ALL_ROLES.map(role => (
                            <TouchableOpacity key={role} style={{ paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: CARD_BORDER, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: form.role === role ? BRAND + '0d' : 'white' }}
                                onPress={() => { setForm(p => ({ ...p, role, schoolId: '' })); setShowRolePicker(false); }}>
                                <Text style={{ fontSize: 14, color: form.role === role ? BRAND : FG, fontWeight: form.role === role ? '600' : '400' }}>{ROLE_LABELS[role] ?? role}</Text>
                                {form.role === role && <Ionicons name="checkmark" size={18} color={BRAND} />}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* School Picker Modal */}
            <Modal visible={showSchoolPicker} transparent animationType="fade">
                <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 24 }} activeOpacity={1} onPress={() => setShowSchoolPicker(false)}>
                    <View style={{ backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', maxHeight: '60%' }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: FG, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: BORDER }}>Select School</Text>
                        <ScrollView>
                            {schools.map(s => (
                                <TouchableOpacity key={s.id} style={{ paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: CARD_BORDER, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: form.schoolId === s.id ? BRAND + '0d' : 'white' }}
                                    onPress={() => { setForm(p => ({ ...p, schoolId: s.id })); setShowSchoolPicker(false); }}>
                                    <Text style={{ fontSize: 14, color: form.schoolId === s.id ? BRAND : FG, fontWeight: form.schoolId === s.id ? '600' : '400' }}>{s.schoolName}</Text>
                                    {form.schoolId === s.id && <Ionicons name="checkmark" size={18} color={BRAND} />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}
