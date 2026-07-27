import { useEffect, useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { schoolsApi, authApi } from '@shared/api/index.js';
import { useAuth } from '../../src/context/AuthContext';

/* Design tokens mirrored from apps/web */
const BRAND = '#5b5ff1';
const BG = '#fbfcff';
const FG = '#111827';
const MUTED_FG = '#6b7280';
const BORDER = '#e8ebf0';
const CARD_BORDER = '#eef0f3';
const RADIUS_LG = 16;
const SOFT_SM = {
    shadowColor: '#111a2e', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
};

interface SchoolForm {
    schoolName: string; email: string; location: string; address: string;
    mobile: string; pointOfContact: string; principalName: string;
}
interface ProfileForm { name: string; mobileNumber: string; }

const inputStyle = {
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: BORDER, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, color: FG, fontSize: 14,
};

const Card = ({ children }: { children: React.ReactNode }) => (
    <View style={[{ backgroundColor: 'white', marginBottom: 14, borderRadius: RADIUS_LG, borderWidth: 1, borderColor: CARD_BORDER, padding: 16 }, SOFT_SM]}>
        {children}
    </View>
);

const SectionHeader = ({ icon, title, bg, color }: { icon: string; title: string; bg: string; color: string }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={icon as any} size={18} color={color} />
        </View>
        <Text style={{ fontSize: 16, fontWeight: '700', color: FG }}>{title}</Text>
    </View>
);

// Module-scoped so identity is stable across renders (inner components would drop TextInput focus each keystroke).
const PrimaryButton = ({ label, onPress, saving, secondary }: { label: string; onPress: () => void; saving: boolean; secondary?: boolean }) => (
    <TouchableOpacity
        onPress={onPress}
        disabled={saving}
        style={{ borderRadius: 12, height: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: saving ? (secondary ? '#9ca3af' : BRAND + '99') : (secondary ? '#374151' : BRAND) }}
    >
        {saving ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>{label}</Text>}
    </TouchableOpacity>
);

const Field = ({ label, value, onChangeText, placeholder, keyboardType, secure, autoCap }: any) => (
    <View style={{ marginBottom: 14 }}>
        <Text style={{ fontSize: 13, fontWeight: '500', color: FG, marginBottom: 6 }}>{label}</Text>
        <TextInput
            style={inputStyle}
            placeholder={placeholder}
            placeholderTextColor="#9ca3af"
            value={value}
            onChangeText={onChangeText}
            keyboardType={keyboardType}
            secureTextEntry={secure}
            autoCapitalize={autoCap}
        />
    </View>
);

export default function SchoolSettingsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();

    const [schoolForm, setSchoolForm] = useState<SchoolForm>({
        schoolName: '', email: '', location: '', address: '',
        mobile: '', pointOfContact: '', principalName: '',
    });
    const [schoolId, setSchoolId] = useState<string | null>(null);
    const [savingSchool, setSavingSchool] = useState(false);

    const [profileForm, setProfileForm] = useState<ProfileForm>({ name: '', mobileNumber: '' });
    const [savingProfile, setSavingProfile] = useState(false);

    const [currentPwd, setCurrentPwd] = useState('');
    const [newPwd, setNewPwd] = useState('');
    const [confirmPwd, setConfirmPwd] = useState('');
    const [savingPwd, setSavingPwd] = useState(false);

    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            setProfileForm({ name: user?.name ?? '', mobileNumber: user?.mobileNumber ?? '' });
            if (user?.schoolId) {
                const school: any = await schoolsApi.getSchool(user.schoolId);
                setSchoolId(school.id);
                setSchoolForm({
                    schoolName: school.schoolName ?? '',
                    email: school.email ?? '',
                    location: school.location ?? '',
                    address: school.address ?? '',
                    mobile: school.mobile ?? school.phone ?? '',
                    pointOfContact: school.pointOfContact ?? school.contactName ?? '',
                    principalName: school.principalName ?? '',
                });
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleSaveSchool = async () => {
        if (!schoolId) { Alert.alert('Error', 'No school associated with your account.'); return; }
        if (!schoolForm.schoolName.trim()) { Alert.alert('Validation', 'School name is required.'); return; }
        setSavingSchool(true);
        try {
            await schoolsApi.updateSchool(schoolId, {
                schoolName: schoolForm.schoolName.trim(),
                email: schoolForm.email.trim() || undefined,
                location: schoolForm.location.trim() || undefined,
                address: schoolForm.address.trim() || undefined,
                mobile: schoolForm.mobile.trim() || undefined,
                pointOfContact: schoolForm.pointOfContact.trim() || undefined,
                principalName: schoolForm.principalName.trim() || undefined,
            });
            Alert.alert('Saved', 'School profile updated successfully.');
        } catch (err: any) {
            Alert.alert('Error', err?.message ?? 'Failed to update school.');
        } finally { setSavingSchool(false); }
    };

    const handleSaveProfile = async () => {
        if (!profileForm.name.trim()) { Alert.alert('Validation', 'Name is required.'); return; }
        setSavingProfile(true);
        try {
            await authApi.updateMe({
                name: profileForm.name.trim(),
                mobileNumber: profileForm.mobileNumber.trim() || undefined,
            });
            Alert.alert('Saved', 'Profile updated successfully.');
        } catch (err: any) {
            Alert.alert('Error', err?.message ?? 'Failed to update profile.');
        } finally { setSavingProfile(false); }
    };

    const handleChangePassword = async () => {
        if (!currentPwd || !newPwd || !confirmPwd) { Alert.alert('Validation', 'Please fill all password fields.'); return; }
        if (newPwd !== confirmPwd) { Alert.alert('Validation', 'New passwords do not match.'); return; }
        if (newPwd.length < 8) { Alert.alert('Validation', 'Password must be at least 8 characters.'); return; }
        setSavingPwd(true);
        try {
            await authApi.changePassword(currentPwd, newPwd);
            Alert.alert('Success', 'Password changed successfully.');
            setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
        } catch (err: any) {
            Alert.alert('Error', err?.message ?? 'Failed to change password.');
        } finally { setSavingPwd(false); }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG }}>
                <ActivityIndicator size="large" color={BRAND} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: BG }}>
            <View style={{ backgroundColor: 'white', paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: CARD_BORDER }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity onPress={() => router.back()} style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="arrow-back" size={20} color="#374151" />
                    </TouchableOpacity>
                    <View>
                        <Text style={{ fontSize: 22, fontWeight: '700', color: FG }}>Settings</Text>
                        <Text style={{ fontSize: 12, color: MUTED_FG }}>School & account settings</Text>
                    </View>
                </View>
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>

                    {/* School Profile */}
                    {user?.schoolId && (
                        <Card>
                            <SectionHeader icon="business-outline" title="School Profile" bg={BRAND + '1a'} color={BRAND} />
                            <Field label="School Name *" value={schoolForm.schoolName} onChangeText={(v: string) => setSchoolForm(p => ({ ...p, schoolName: v }))} placeholder="Springfield High" autoCap="words" />
                            <Field label="School Email" value={schoolForm.email} onChangeText={(v: string) => setSchoolForm(p => ({ ...p, email: v }))} placeholder="school@example.com" keyboardType="email-address" autoCap="none" />
                            <Field label="Location" value={schoolForm.location} onChangeText={(v: string) => setSchoolForm(p => ({ ...p, location: v }))} placeholder="City, State" autoCap="words" />
                            <Field label="Address" value={schoolForm.address} onChangeText={(v: string) => setSchoolForm(p => ({ ...p, address: v }))} placeholder="Full address" autoCap="words" />
                            <Field label="Mobile / Phone" value={schoolForm.mobile} onChangeText={(v: string) => setSchoolForm(p => ({ ...p, mobile: v }))} placeholder="+91 9876543210" keyboardType="phone-pad" />
                            <Field label="Point of Contact Name" value={schoolForm.pointOfContact} onChangeText={(v: string) => setSchoolForm(p => ({ ...p, pointOfContact: v }))} placeholder="Contact person name" autoCap="words" />
                            <Field label="Principal Name" value={schoolForm.principalName} onChangeText={(v: string) => setSchoolForm(p => ({ ...p, principalName: v }))} placeholder="Principal full name" autoCap="words" />
                            <PrimaryButton label="Save School Profile" onPress={handleSaveSchool} saving={savingSchool} />
                        </Card>
                    )}

                    {/* Personal Profile */}
                    <Card>
                        <SectionHeader icon="person-outline" title="Personal Profile" bg="#eef2ff" color={BRAND} />
                        <Field label="Full Name *" value={profileForm.name} onChangeText={(v: string) => setProfileForm(p => ({ ...p, name: v }))} placeholder="Your full name" autoCap="words" />
                        <Field label="Mobile Number" value={profileForm.mobileNumber} onChangeText={(v: string) => setProfileForm(p => ({ ...p, mobileNumber: v }))} placeholder="+91 9876543210" keyboardType="phone-pad" />
                        <View style={{ marginBottom: 14 }}>
                            <Text style={{ fontSize: 13, fontWeight: '500', color: FG, marginBottom: 6 }}>Email</Text>
                            <View style={{ backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
                                <Text style={{ fontSize: 14, color: MUTED_FG }}>{user?.email}</Text>
                            </View>
                        </View>
                        <PrimaryButton label="Save Profile" onPress={handleSaveProfile} saving={savingProfile} />
                    </Card>

                    {/* Change Password */}
                    <Card>
                        <SectionHeader icon="lock-closed-outline" title="Change Password" bg="#f3f4f6" color={MUTED_FG} />
                        <Field label="Current Password" value={currentPwd} onChangeText={setCurrentPwd} placeholder="••••••••" secure />
                        <Field label="New Password" value={newPwd} onChangeText={setNewPwd} placeholder="••••••••" secure />
                        <Field label="Confirm New Password" value={confirmPwd} onChangeText={setConfirmPwd} placeholder="••••••••" secure />
                        <PrimaryButton label="Update Password" onPress={handleChangePassword} saving={savingPwd} secondary />
                    </Card>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}
