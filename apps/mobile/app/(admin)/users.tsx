import { useEffect, useState } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, TextInput,
    RefreshControl, ActivityIndicator, Alert, Modal,
    KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usersApi, schoolsApi } from '@shared/api/index.js';
import { ROLE_LABELS } from '@shared/constants/roles.js';

interface User { id: string; name: string; email: string; role: string; isActive: boolean; schoolId?: string; }
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
    const [users, setUsers] = useState<User[]>([]);
    const [schools, setSchools] = useState<School[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
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

    const filtered = users.filter(u =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
    );

    const selectedSchoolName = schools.find(s => s.id === form.schoolId)?.schoolName ?? 'Select school...';

    const renderItem = ({ item }: { item: User }) => {
        const roleStyle = ROLE_COLORS[item.role] ?? { bg: '#f3f4f6', text: '#374151' };
        return (
            <View className="bg-white mx-4 mb-3 rounded-2xl p-4 border border-border">
                <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                        <Text className="text-primary font-bold text-base">{(item.name || item.email || 'U').charAt(0).toUpperCase()}</Text>
                    </View>
                    <View className="flex-1 min-w-0">
                        <Text className="font-semibold text-foreground" numberOfLines={1}>{item.name || 'Unnamed'}</Text>
                        <Text className="text-xs text-muted" numberOfLines={1}>{item.email}</Text>
                    </View>
                    <View className="items-end gap-1.5">
                        <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: roleStyle.bg }}>
                            <Text className="text-xs font-medium" style={{ color: roleStyle.text }}>{ROLE_LABELS[item.role] ?? item.role}</Text>
                        </View>
                        <View className={`px-2 py-0.5 rounded-full ${item.isActive ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                            <Text className={`text-xs ${item.isActive ? 'text-emerald-700' : 'text-gray-500'}`}>{item.isActive ? 'Active' : 'Inactive'}</Text>
                        </View>
                    </View>
                </View>
                <View className="flex-row gap-2 mt-3">
                    <TouchableOpacity className="flex-1 py-2 rounded-xl bg-gray-50 border border-border items-center flex-row justify-center gap-1" onPress={() => handleResetPassword(item)}>
                        <Ionicons name="key-outline" size={13} color="#6b7280" />
                        <Text className="text-xs text-muted font-medium">Reset Pwd</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className={`flex-1 py-2 rounded-xl border items-center ${item.isActive ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}
                        onPress={() => handleToggleActive(item)}
                    >
                        <Text className={`text-xs font-semibold ${item.isActive ? 'text-amber-600' : 'text-emerald-600'}`}>{item.isActive ? 'Deactivate' : 'Activate'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 items-center justify-center" onPress={() => handleDelete(item)}>
                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View className="flex-1 bg-background">
            <View className="bg-white px-5 pt-14 pb-4 border-b border-border">
                <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-2xl font-bold text-foreground">Users</Text>
                    <TouchableOpacity className="w-9 h-9 rounded-xl bg-primary items-center justify-center" onPress={() => { setForm(EMPTY_FORM); setShowForm(true); }}>
                        <Ionicons name="add" size={20} color="white" />
                    </TouchableOpacity>
                </View>
                <View className="flex-row items-center bg-gray-100 rounded-xl px-3">
                    <Ionicons name="search" size={16} color="#9ca3af" />
                    <TextInput className="flex-1 py-2.5 px-2 text-foreground text-sm" placeholder="Search by name or email..." placeholderTextColor="#9ca3af" value={search} onChangeText={setSearch} />
                </View>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color="#4f46e5" /></View>
            ) : (
                <FlatList
                    data={filtered} keyExtractor={item => item.id} renderItem={renderItem}
                    contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor="#4f46e5" />}
                    ListEmptyComponent={
                        <View className="items-center justify-center py-20">
                            <Ionicons name="people-outline" size={48} color="#d1d5db" />
                            <Text className="text-muted mt-3">No users found</Text>
                        </View>
                    }
                />
            )}

            {/* Create User Modal */}
            <Modal visible={showForm} transparent animationType="slide">
                <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View className="flex-1 bg-black/50 justify-end">
                        <View className="bg-white rounded-t-3xl px-6 pt-6 pb-8" style={{ maxHeight: '92%' }}>
                            <View className="flex-row items-center justify-between mb-5">
                                <Text className="text-lg font-bold text-foreground">Create User</Text>
                                <TouchableOpacity onPress={() => setShowForm(false)}><Ionicons name="close" size={24} color="#6b7280" /></TouchableOpacity>
                            </View>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {[
                                    { key: 'name', label: 'Full Name *', placeholder: 'Enter full name', keyboard: 'default' },
                                    { key: 'email', label: 'Email *', placeholder: 'user@example.com', keyboard: 'email-address' },
                                    { key: 'password', label: 'Password *', placeholder: 'Min 8 characters', keyboard: 'default', secure: true },
                                ].map(f => (
                                    <View key={f.key} className="mb-4">
                                        <Text className="text-sm font-medium text-foreground mb-1.5">{f.label}</Text>
                                        <TextInput
                                            className="bg-gray-50 border border-border rounded-xl px-4 py-3 text-foreground text-sm"
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
                                <View className="mb-4">
                                    <Text className="text-sm font-medium text-foreground mb-1.5">Role *</Text>
                                    <TouchableOpacity className="bg-gray-50 border border-border rounded-xl px-4 py-3 flex-row items-center justify-between" onPress={() => setShowRolePicker(true)}>
                                        <Text className="text-foreground text-sm">{ROLE_LABELS[form.role] ?? form.role}</Text>
                                        <Ionicons name="chevron-down" size={16} color="#6b7280" />
                                    </TouchableOpacity>
                                </View>

                                {/* School picker (only for school roles) */}
                                {SCHOOL_ROLES.includes(form.role) && (
                                    <View className="mb-4">
                                        <Text className="text-sm font-medium text-foreground mb-1.5">School *</Text>
                                        <TouchableOpacity className="bg-gray-50 border border-border rounded-xl px-4 py-3 flex-row items-center justify-between" onPress={() => setShowSchoolPicker(true)}>
                                            <Text className={`text-sm ${form.schoolId ? 'text-foreground' : 'text-gray-400'}`}>{selectedSchoolName}</Text>
                                            <Ionicons name="chevron-down" size={16} color="#6b7280" />
                                        </TouchableOpacity>
                                    </View>
                                )}

                                <TouchableOpacity
                                    className={`mt-2 rounded-xl py-4 items-center ${submitting ? 'bg-primary/60' : 'bg-primary'}`}
                                    onPress={handleCreate} disabled={submitting}
                                >
                                    {submitting ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">Create User</Text>}
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Role Picker Modal */}
            <Modal visible={showRolePicker} transparent animationType="fade">
                <TouchableOpacity className="flex-1 bg-black/50 justify-center px-6" activeOpacity={1} onPress={() => setShowRolePicker(false)}>
                    <View className="bg-white rounded-2xl overflow-hidden">
                        <Text className="text-base font-bold text-foreground px-5 py-4 border-b border-border">Select Role</Text>
                        {ALL_ROLES.map(role => (
                            <TouchableOpacity key={role} className={`px-5 py-3.5 border-b border-border/50 flex-row items-center justify-between ${form.role === role ? 'bg-primary/5' : ''}`}
                                onPress={() => { setForm(p => ({ ...p, role, schoolId: '' })); setShowRolePicker(false); }}>
                                <Text className={`text-sm ${form.role === role ? 'text-primary font-semibold' : 'text-foreground'}`}>{ROLE_LABELS[role] ?? role}</Text>
                                {form.role === role && <Ionicons name="checkmark" size={18} color="#4f46e5" />}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* School Picker Modal */}
            <Modal visible={showSchoolPicker} transparent animationType="fade">
                <TouchableOpacity className="flex-1 bg-black/50 justify-center px-6" activeOpacity={1} onPress={() => setShowSchoolPicker(false)}>
                    <View className="bg-white rounded-2xl overflow-hidden" style={{ maxHeight: '60%' }}>
                        <Text className="text-base font-bold text-foreground px-5 py-4 border-b border-border">Select School</Text>
                        <ScrollView>
                            {schools.map(s => (
                                <TouchableOpacity key={s.id} className={`px-5 py-3.5 border-b border-border/50 flex-row items-center justify-between ${form.schoolId === s.id ? 'bg-primary/5' : ''}`}
                                    onPress={() => { setForm(p => ({ ...p, schoolId: s.id })); setShowSchoolPicker(false); }}>
                                    <Text className={`text-sm ${form.schoolId === s.id ? 'text-primary font-semibold' : 'text-foreground'}`}>{s.schoolName}</Text>
                                    {form.schoolId === s.id && <Ionicons name="checkmark" size={18} color="#4f46e5" />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}
