import { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    Alert, ActivityIndicator, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch } from '@shared/api/index.js';
import { ROLE_LABELS } from '@shared/constants/roles.js';

/* Design tokens mirrored from apps/web (index.css / tailwind.config.js) */
const BRAND = '#5b5ff1';
const BG = '#fbfcff';
const FG = '#111827';
const MUTED_FG = '#6b7280';
const BORDER = '#e5e7eb';
const CARD_BORDER = '#eef0f3';
const DESTRUCTIVE = '#e11d48';
const SOFT_SM = {
    shadowColor: '#111a2e', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
};

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

const inputStyle = {
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: BORDER, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, color: FG, fontSize: 14,
};

export default function BulkScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
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

    const card = [{ backgroundColor: 'white', marginBottom: 12, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: CARD_BORDER }, SOFT_SM];

    const renderResults = (results: ResultRow[]) => (
        <View style={card}>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                <View style={{ flex: 1, backgroundColor: '#ecfdf5', borderRadius: 12, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#a7f3d0' }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#047857' }}>{createdCount(results)}</Text>
                    <Text style={{ fontSize: 12, color: '#059669' }}>Created</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#fef2f2', borderRadius: 12, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#fecaca' }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#dc2626' }}>{errorCount(results)}</Text>
                    <Text style={{ fontSize: 12, color: '#ef4444' }}>Errors</Text>
                </View>
            </View>
            {results.map(r => (
                <View key={r.index} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: CARD_BORDER }}>
                    <Ionicons
                        name={r.status === 'created' ? 'checkmark-circle' : 'close-circle'}
                        size={16}
                        color={r.status === 'created' ? '#059669' : '#ef4444'}
                    />
                    <Text style={{ fontSize: 14, color: FG, flex: 1 }} numberOfLines={1}>{r.label}</Text>
                    {r.error ? <Text style={{ fontSize: 12, color: '#ef4444', flex: 1 }} numberOfLines={1}>{r.error}</Text> : null}
                </View>
            ))}
        </View>
    );

    const primaryBtn = (disabled: boolean) => ({
        borderRadius: 12, height: 50, alignItems: 'center' as const, justifyContent: 'center' as const,
        flexDirection: 'row' as const, gap: 8, backgroundColor: disabled ? BRAND + '80' : BRAND,
    });

    const addRowBtn = {
        borderWidth: 2, borderStyle: 'dashed' as const, borderColor: BRAND + '4d', borderRadius: 16,
        paddingVertical: 16, alignItems: 'center' as const, flexDirection: 'row' as const,
        justifyContent: 'center' as const, gap: 8, marginBottom: 12, backgroundColor: BRAND + '0d',
    };

    return (
        <View style={{ flex: 1, backgroundColor: BG }}>
            <View style={{ backgroundColor: 'white', paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: BORDER }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="arrow-back" size={20} color="#374151" />
                    </TouchableOpacity>
                    <View>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: BRAND, textTransform: 'uppercase', letterSpacing: 2 }}>Admin</Text>
                        <Text style={{ fontSize: 22, fontWeight: '700', color: FG }}>Bulk Create</Text>
                    </View>
                </View>
                {/* Tabs */}
                <View style={{ flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 12, padding: 4 }}>
                    {(['schools', 'users'] as Tab[]).map(tab => {
                        const active = activeTab === tab;
                        return (
                            <TouchableOpacity
                                key={tab}
                                style={[{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' }, active && { backgroundColor: 'white', ...SOFT_SM }]}
                                onPress={() => setActiveTab(tab)}
                            >
                                <Text style={{ fontSize: 14, fontWeight: '600', color: active ? BRAND : MUTED_FG }}>
                                    {tab === 'schools' ? 'Schools' : 'Users'}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>

                    {activeTab === 'schools' ? (
                        <>
                            {schoolRows.map((row, idx) => (
                                <View key={row.id} style={card}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                        <Text style={{ fontSize: 14, fontWeight: '700', color: FG }}>School #{idx + 1}</Text>
                                        {schoolRows.length > 1 && (
                                            <TouchableOpacity onPress={() => removeSchoolRow(row.id)} style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: DESTRUCTIVE + '14', alignItems: 'center', justifyContent: 'center' }}>
                                                <Ionicons name="close" size={16} color={DESTRUCTIVE} />
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
                                        <View key={f.field} style={{ marginBottom: 12 }}>
                                            <Text style={{ fontSize: 12, fontWeight: '500', color: MUTED_FG, marginBottom: 4 }}>{f.label}</Text>
                                            <TextInput
                                                style={inputStyle}
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

                            <TouchableOpacity style={addRowBtn} onPress={() => setSchoolRows(r => [...r, newSchoolRow()])}>
                                <Ionicons name="add-circle-outline" size={20} color={BRAND} />
                                <Text style={{ fontSize: 14, fontWeight: '600', color: BRAND }}>Add Another School</Text>
                            </TouchableOpacity>

                            {schoolResults && renderResults(schoolResults)}

                            <TouchableOpacity style={primaryBtn(submittingSchools)} onPress={handleSubmitSchools} disabled={submittingSchools}>
                                {submittingSchools ? (
                                    <><ActivityIndicator color="white" size="small" /><Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>Creating...</Text></>
                                ) : (
                                    <><Ionicons name="business-outline" size={18} color="white" /><Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>Create {schoolRows.length} School{schoolRows.length !== 1 ? 's' : ''}</Text></>
                                )}
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            {userRows.map((row, idx) => (
                                <View key={row.id} style={card}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                        <Text style={{ fontSize: 14, fontWeight: '700', color: FG }}>User #{idx + 1}</Text>
                                        {userRows.length > 1 && (
                                            <TouchableOpacity onPress={() => removeUserRow(row.id)} style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: DESTRUCTIVE + '14', alignItems: 'center', justifyContent: 'center' }}>
                                                <Ionicons name="close" size={16} color={DESTRUCTIVE} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    {[
                                        { field: 'name', label: 'Full Name *', placeholder: 'Jane Smith', keyboard: 'default' },
                                        { field: 'email', label: 'Email *', placeholder: 'jane@school.com', keyboard: 'email-address' },
                                        { field: 'schoolId', label: 'School ID', placeholder: 'school_id_here', keyboard: 'default' },
                                    ].map(f => (
                                        <View key={f.field} style={{ marginBottom: 12 }}>
                                            <Text style={{ fontSize: 12, fontWeight: '500', color: MUTED_FG, marginBottom: 4 }}>{f.label}</Text>
                                            <TextInput
                                                style={inputStyle}
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
                                    <View>
                                        <Text style={{ fontSize: 12, fontWeight: '500', color: MUTED_FG, marginBottom: 4 }}>Role</Text>
                                        <TouchableOpacity
                                            style={{ ...inputStyle, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                                            onPress={() => setShowRolePicker(row.id)}
                                        >
                                            <Text style={{ fontSize: 14, color: FG }}>{ROLE_LABELS[row.role] ?? row.role}</Text>
                                            <Ionicons name="chevron-down" size={14} color={MUTED_FG} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}

                            <TouchableOpacity style={addRowBtn} onPress={() => setUserRows(r => [...r, newUserRow()])}>
                                <Ionicons name="add-circle-outline" size={20} color={BRAND} />
                                <Text style={{ fontSize: 14, fontWeight: '600', color: BRAND }}>Add Another User</Text>
                            </TouchableOpacity>

                            {userResults && renderResults(userResults)}

                            <TouchableOpacity style={primaryBtn(submittingUsers)} onPress={handleSubmitUsers} disabled={submittingUsers}>
                                {submittingUsers ? (
                                    <><ActivityIndicator color="white" size="small" /><Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>Creating...</Text></>
                                ) : (
                                    <><Ionicons name="people-outline" size={18} color="white" /><Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>Create {userRows.length} User{userRows.length !== 1 ? 's' : ''}</Text></>
                                )}
                            </TouchableOpacity>
                        </>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Role Picker Modal */}
            <Modal visible={!!showRolePicker} transparent animationType="fade">
                <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 24 }} activeOpacity={1} onPress={() => setShowRolePicker(null)}>
                    <View style={{ backgroundColor: 'white', borderRadius: 16, overflow: 'hidden' }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: FG, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: BORDER }}>Select Role</Text>
                        {USER_ROLES.map(role => {
                            const currentRow = userRows.find(r => r.id === showRolePicker);
                            const isSelected = currentRow?.role === role;
                            return (
                                <TouchableOpacity
                                    key={role}
                                    style={{ paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: CARD_BORDER, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: isSelected ? BRAND + '0d' : 'transparent' }}
                                    onPress={() => {
                                        if (showRolePicker) updateUserRow(showRolePicker, 'role', role);
                                        setShowRolePicker(null);
                                    }}
                                >
                                    <Text style={{ fontSize: 14, color: isSelected ? BRAND : FG, fontWeight: isSelected ? '600' : '400' }}>{ROLE_LABELS[role] ?? role}</Text>
                                    {isSelected && <Ionicons name="checkmark" size={18} color={BRAND} />}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}
