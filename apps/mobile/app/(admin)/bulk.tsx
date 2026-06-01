import { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    Alert, ActivityIndicator, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { apiFetch } from '@shared/api/index.js';
import { ROLE_LABELS } from '@shared/constants/roles.js';

type Tab = 'schools' | 'users';

interface SchoolRow {
    id: string;
    schoolName: string;
    email: string;
    location: string;
    contactName: string;
    phone: string;
}

interface UserRow {
    id: string;
    name: string;
    email: string;
    role: string;
    schoolId: string;
}

interface ResultRow {
    index: number;
    label: string;
    status: 'created' | 'error';
    error?: string;
}

const USER_ROLES = ['school_admin', 'school_viewer', 'teacher'];

const newSchoolRow = (): SchoolRow => ({
    id: Math.random().toString(36).slice(2),
    schoolName: '', email: '', location: '', contactName: '', phone: '',
});

const newUserRow = (): UserRow => ({
    id: Math.random().toString(36).slice(2),
    name: '', email: '', role: 'school_admin', schoolId: '',
});

export default function BulkScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>('schools');

    // Schools tab
    const [schoolRows, setSchoolRows] = useState<SchoolRow[]>([newSchoolRow()]);
    const [submittingSchools, setSubmittingSchools] = useState(false);
    const [schoolResults, setSchoolResults] = useState<ResultRow[] | null>(null);

    // Users tab
    const [userRows, setUserRows] = useState<UserRow[]>([newUserRow()]);
    const [submittingUsers, setSubmittingUsers] = useState(false);
    const [userResults, setUserResults] = useState<ResultRow[] | null>(null);
    const [showRolePicker, setShowRolePicker] = useState<string | null>(null); // row id

    // --- School helpers ---
    const updateSchoolRow = (id: string, field: keyof SchoolRow, value: string) => {
        setSchoolRows(rows => rows.map(r => r.id === id ? { ...r, [field]: value } : r));
    };
    const removeSchoolRow = (id: string) => {
        setSchoolRows(rows => rows.length > 1 ? rows.filter(r => r.id !== id) : rows);
    };

    const handleSubmitSchools = async () => {
        const valid = schoolRows.filter(r => r.schoolName.trim());
        if (valid.length === 0) { Alert.alert('Validation', 'Add at least one school with a name.'); return; }

        setSubmittingSchools(true);
        setSchoolResults(null);
        try {
            const res = await apiFetch('/api/schools/bulk', 'POST', {
                schools: valid.map(r => ({
                    schoolName: r.schoolName.trim(),
                    email: r.email.trim() || undefined,
                    location: r.location.trim() || undefined,
                    contactName: r.contactName.trim() || undefined,
                    phone: r.phone.trim() || undefined,
                    isActive: true,
                })),
            });
            const results: ResultRow[] = (res.results ?? res.schools ?? valid.map((_: any, i: number) => ({ index: i, status: 'created' }))).map((item: any, i: number) => ({
                index: i,
                label: valid[i]?.schoolName ?? `Row ${i + 1}`,
                status: item.error ? 'error' : 'created',
                error: item.error,
            }));
            setSchoolResults(results);
        } catch (err: any) {
            // Fallback: try one-by-one
            const results: ResultRow[] = [];
            for (let i = 0; i < valid.length; i++) {
                const r = valid[i];
                try {
                    await apiFetch('/api/schools', 'POST', {
                        schoolName: r.schoolName.trim(),
                        schoolId: r.schoolName.trim().toLowerCase().replace(/\s+/g, '_').slice(0, 20) + '_' + Date.now(),
                        email: r.email.trim() || undefined,
                        location: r.location.trim() || undefined,
                        isActive: true,
                    });
                    results.push({ index: i, label: r.schoolName, status: 'created' });
                } catch (e: any) {
                    results.push({ index: i, label: r.schoolName, status: 'error', error: e.message });
                }
            }
            setSchoolResults(results);
        } finally {
            setSubmittingSchools(false);
        }
    };

    // --- User helpers ---
    const updateUserRow = (id: string, field: keyof UserRow, value: string) => {
        setUserRows(rows => rows.map(r => r.id === id ? { ...r, [field]: value } : r));
    };
    const removeUserRow = (id: string) => {
        setUserRows(rows => rows.length > 1 ? rows.filter(r => r.id !== id) : rows);
    };

    const handleSubmitUsers = async () => {
        const valid = userRows.filter(r => r.name.trim() && r.email.trim());
        if (valid.length === 0) { Alert.alert('Validation', 'Add at least one user with name and email.'); return; }

        setSubmittingUsers(true);
        setUserResults(null);
        try {
            const res = await apiFetch('/api/bulk/users', 'POST', {
                users: valid.map(r => ({
                    name: r.name.trim(),
                    email: r.email.trim(),
                    role: r.role,
                    schoolId: r.schoolId.trim() || undefined,
                    isActive: true,
                    verified: true,
                })),
            });
            const results: ResultRow[] = (res.results ?? res.users ?? valid.map((_: any, i: number) => ({ index: i, status: 'created' }))).map((item: any, i: number) => ({
                index: i,
                label: valid[i]?.name ?? `Row ${i + 1}`,
                status: item.error ? 'error' : 'created',
                error: item.error,
            }));
            setUserResults(results);
        } catch (err: any) {
            // Fallback: one-by-one
            const results: ResultRow[] = [];
            for (let i = 0; i < valid.length; i++) {
                const r = valid[i];
                try {
                    await apiFetch('/api/users', 'POST', {
                        name: r.name.trim(),
                        email: r.email.trim(),
                        role: r.role,
                        schoolId: r.schoolId.trim() || undefined,
                        password: 'Temp@1234',
                        isActive: true,
                        verified: true,
                    });
                    results.push({ index: i, label: r.name, status: 'created' });
                } catch (e: any) {
                    results.push({ index: i, label: r.name, status: 'error', error: e.message });
                }
            }
            setUserResults(results);
        } finally {
            setSubmittingUsers(false);
        }
    };

    const createdCount = (results: ResultRow[] | null) => results?.filter(r => r.status === 'created').length ?? 0;
    const errorCount = (results: ResultRow[] | null) => results?.filter(r => r.status === 'error').length ?? 0;

    return (
        <View className="flex-1 bg-background">
            <View className="bg-white px-5 pt-14 pb-4 border-b border-border">
                <View className="flex-row items-center gap-3 mb-3">
                    <TouchableOpacity onPress={() => router.back()} className="w-9 h-9 rounded-xl bg-gray-100 items-center justify-center">
                        <Ionicons name="arrow-back" size={20} color="#374151" />
                    </TouchableOpacity>
                    <View>
                        <Text className="text-2xl font-bold text-foreground">Bulk Create</Text>
                        <Text className="text-xs text-muted">Create multiple records at once</Text>
                    </View>
                </View>
                {/* Tabs */}
                <View className="flex-row bg-gray-100 rounded-xl p-1">
                    {(['schools', 'users'] as Tab[]).map(tab => (
                        <TouchableOpacity
                            key={tab}
                            className={`flex-1 py-2 rounded-lg items-center ${activeTab === tab ? 'bg-white shadow-sm' : ''}`}
                            onPress={() => setActiveTab(tab)}
                        >
                            <Text className={`text-sm font-semibold ${activeTab === tab ? 'text-primary' : 'text-muted'}`}>
                                {tab === 'schools' ? 'Schools' : 'Users'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

                    {activeTab === 'schools' ? (
                        <>
                            {/* School Rows */}
                            {schoolRows.map((row, idx) => (
                                <View key={row.id} className="bg-white mb-3 rounded-2xl p-4 border border-border">
                                    <View className="flex-row items-center justify-between mb-3">
                                        <Text className="text-sm font-semibold text-foreground">School #{idx + 1}</Text>
                                        {schoolRows.length > 1 && (
                                            <TouchableOpacity onPress={() => removeSchoolRow(row.id)} className="w-7 h-7 rounded-lg bg-red-50 items-center justify-center">
                                                <Ionicons name="close" size={16} color="#ef4444" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    {[
                                        { field: 'schoolName', label: 'School Name *', placeholder: 'Springfield High', keyboard: 'default' },
                                        { field: 'email', label: 'Email', placeholder: 'school@example.com', keyboard: 'email-address' },
                                        { field: 'location', label: 'Location', placeholder: 'City, State', keyboard: 'default' },
                                        { field: 'contactName', label: 'Contact Name', placeholder: 'John Doe', keyboard: 'default' },
                                        { field: 'phone', label: 'Phone', placeholder: '+91 9876543210', keyboard: 'phone-pad' },
                                    ].map(f => (
                                        <View key={f.field} className="mb-3">
                                            <Text className="text-xs font-medium text-muted mb-1">{f.label}</Text>
                                            <TextInput
                                                className="bg-gray-50 border border-border rounded-xl px-3 py-2.5 text-foreground text-sm"
                                                placeholder={f.placeholder}
                                                placeholderTextColor="#9ca3af"
                                                value={row[f.field as keyof SchoolRow]}
                                                onChangeText={v => updateSchoolRow(row.id, f.field as keyof SchoolRow, v)}
                                                keyboardType={f.keyboard as any}
                                                autoCapitalize={f.keyboard === 'email-address' ? 'none' : 'words'}
                                            />
                                        </View>
                                    ))}
                                </View>
                            ))}

                            {/* Add Row */}
                            <TouchableOpacity
                                className="border-2 border-dashed border-primary/30 rounded-2xl py-4 items-center flex-row justify-center gap-2 mb-3 bg-primary/5"
                                onPress={() => setSchoolRows(r => [...r, newSchoolRow()])}
                            >
                                <Ionicons name="add-circle-outline" size={20} color="#4f46e5" />
                                <Text className="text-sm font-semibold text-primary">Add Another School</Text>
                            </TouchableOpacity>

                            {/* Results */}
                            {schoolResults && (
                                <View className="bg-white mb-3 rounded-2xl p-4 border border-border">
                                    <View className="flex-row items-center gap-3 mb-3">
                                        <View className="flex-1 bg-emerald-50 rounded-xl py-2 items-center border border-emerald-200">
                                            <Text className="text-lg font-bold text-emerald-700">{createdCount(schoolResults)}</Text>
                                            <Text className="text-xs text-emerald-600">Created</Text>
                                        </View>
                                        <View className="flex-1 bg-red-50 rounded-xl py-2 items-center border border-red-200">
                                            <Text className="text-lg font-bold text-red-600">{errorCount(schoolResults)}</Text>
                                            <Text className="text-xs text-red-500">Errors</Text>
                                        </View>
                                    </View>
                                    {schoolResults.map(r => (
                                        <View key={r.index} className={`flex-row items-center gap-2 py-2 border-b border-border/30`}>
                                            <Ionicons
                                                name={r.status === 'created' ? 'checkmark-circle' : 'close-circle'}
                                                size={16}
                                                color={r.status === 'created' ? '#059669' : '#ef4444'}
                                            />
                                            <Text className="text-sm text-foreground flex-1" numberOfLines={1}>{r.label}</Text>
                                            {r.error && <Text className="text-xs text-red-500 flex-1" numberOfLines={1}>{r.error}</Text>}
                                        </View>
                                    ))}
                                </View>
                            )}

                            <TouchableOpacity
                                className={`rounded-2xl py-4 items-center flex-row justify-center gap-2 ${submittingSchools ? 'bg-primary/50' : 'bg-primary'}`}
                                onPress={handleSubmitSchools}
                                disabled={submittingSchools}
                            >
                                {submittingSchools ? (
                                    <><ActivityIndicator color="white" size="small" /><Text className="text-white font-semibold text-base">Creating...</Text></>
                                ) : (
                                    <><Ionicons name="business-outline" size={18} color="white" /><Text className="text-white font-semibold text-base">Create {schoolRows.length} School{schoolRows.length !== 1 ? 's' : ''}</Text></>
                                )}
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            {/* User Rows */}
                            {userRows.map((row, idx) => (
                                <View key={row.id} className="bg-white mb-3 rounded-2xl p-4 border border-border">
                                    <View className="flex-row items-center justify-between mb-3">
                                        <Text className="text-sm font-semibold text-foreground">User #{idx + 1}</Text>
                                        {userRows.length > 1 && (
                                            <TouchableOpacity onPress={() => removeUserRow(row.id)} className="w-7 h-7 rounded-lg bg-red-50 items-center justify-center">
                                                <Ionicons name="close" size={16} color="#ef4444" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    {[
                                        { field: 'name', label: 'Full Name *', placeholder: 'Jane Smith', keyboard: 'default' },
                                        { field: 'email', label: 'Email *', placeholder: 'jane@school.com', keyboard: 'email-address' },
                                        { field: 'schoolId', label: 'School ID', placeholder: 'school_id_here', keyboard: 'default' },
                                    ].map(f => (
                                        <View key={f.field} className="mb-3">
                                            <Text className="text-xs font-medium text-muted mb-1">{f.label}</Text>
                                            <TextInput
                                                className="bg-gray-50 border border-border rounded-xl px-3 py-2.5 text-foreground text-sm"
                                                placeholder={f.placeholder}
                                                placeholderTextColor="#9ca3af"
                                                value={row[f.field as keyof UserRow]}
                                                onChangeText={v => updateUserRow(row.id, f.field as keyof UserRow, v)}
                                                keyboardType={f.keyboard as any}
                                                autoCapitalize={f.keyboard === 'email-address' ? 'none' : 'words'}
                                            />
                                        </View>
                                    ))}
                                    {/* Role picker */}
                                    <View className="mb-1">
                                        <Text className="text-xs font-medium text-muted mb-1">Role</Text>
                                        <TouchableOpacity
                                            className="bg-gray-50 border border-border rounded-xl px-3 py-2.5 flex-row items-center justify-between"
                                            onPress={() => setShowRolePicker(row.id)}
                                        >
                                            <Text className="text-sm text-foreground">{ROLE_LABELS[row.role] ?? row.role}</Text>
                                            <Ionicons name="chevron-down" size={14} color="#6b7280" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}

                            {/* Add Row */}
                            <TouchableOpacity
                                className="border-2 border-dashed border-primary/30 rounded-2xl py-4 items-center flex-row justify-center gap-2 mb-3 bg-primary/5"
                                onPress={() => setUserRows(r => [...r, newUserRow()])}
                            >
                                <Ionicons name="add-circle-outline" size={20} color="#4f46e5" />
                                <Text className="text-sm font-semibold text-primary">Add Another User</Text>
                            </TouchableOpacity>

                            {/* Results */}
                            {userResults && (
                                <View className="bg-white mb-3 rounded-2xl p-4 border border-border">
                                    <View className="flex-row items-center gap-3 mb-3">
                                        <View className="flex-1 bg-emerald-50 rounded-xl py-2 items-center border border-emerald-200">
                                            <Text className="text-lg font-bold text-emerald-700">{createdCount(userResults)}</Text>
                                            <Text className="text-xs text-emerald-600">Created</Text>
                                        </View>
                                        <View className="flex-1 bg-red-50 rounded-xl py-2 items-center border border-red-200">
                                            <Text className="text-lg font-bold text-red-600">{errorCount(userResults)}</Text>
                                            <Text className="text-xs text-red-500">Errors</Text>
                                        </View>
                                    </View>
                                    {userResults.map(r => (
                                        <View key={r.index} className="flex-row items-center gap-2 py-2 border-b border-border/30">
                                            <Ionicons
                                                name={r.status === 'created' ? 'checkmark-circle' : 'close-circle'}
                                                size={16}
                                                color={r.status === 'created' ? '#059669' : '#ef4444'}
                                            />
                                            <Text className="text-sm text-foreground flex-1" numberOfLines={1}>{r.label}</Text>
                                            {r.error && <Text className="text-xs text-red-500 flex-1" numberOfLines={1}>{r.error}</Text>}
                                        </View>
                                    ))}
                                </View>
                            )}

                            <TouchableOpacity
                                className={`rounded-2xl py-4 items-center flex-row justify-center gap-2 ${submittingUsers ? 'bg-primary/50' : 'bg-primary'}`}
                                onPress={handleSubmitUsers}
                                disabled={submittingUsers}
                            >
                                {submittingUsers ? (
                                    <><ActivityIndicator color="white" size="small" /><Text className="text-white font-semibold text-base">Creating...</Text></>
                                ) : (
                                    <><Ionicons name="people-outline" size={18} color="white" /><Text className="text-white font-semibold text-base">Create {userRows.length} User{userRows.length !== 1 ? 's' : ''}</Text></>
                                )}
                            </TouchableOpacity>
                        </>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Role Picker Modal */}
            <Modal visible={!!showRolePicker} transparent animationType="fade">
                <TouchableOpacity className="flex-1 bg-black/50 justify-center px-6" activeOpacity={1} onPress={() => setShowRolePicker(null)}>
                    <View className="bg-white rounded-2xl overflow-hidden">
                        <Text className="text-base font-bold text-foreground px-5 py-4 border-b border-border">Select Role</Text>
                        {USER_ROLES.map(role => {
                            const currentRow = userRows.find(r => r.id === showRolePicker);
                            const isSelected = currentRow?.role === role;
                            return (
                                <TouchableOpacity
                                    key={role}
                                    className={`px-5 py-3.5 border-b border-border/50 flex-row items-center justify-between ${isSelected ? 'bg-primary/5' : ''}`}
                                    onPress={() => {
                                        if (showRolePicker) updateUserRow(showRolePicker, 'role', role);
                                        setShowRolePicker(null);
                                    }}
                                >
                                    <Text className={`text-sm ${isSelected ? 'text-primary font-semibold' : 'text-foreground'}`}>{ROLE_LABELS[role] ?? role}</Text>
                                    {isSelected && <Ionicons name="checkmark" size={18} color="#4f46e5" />}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}
