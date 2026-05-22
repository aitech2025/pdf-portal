import { useEffect, useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { schoolsApi, authApi } from '@shared/api/index.js';
import { useAuth } from '../../src/context/AuthContext';

interface SchoolForm {
    schoolName: string;
    email: string;
    location: string;
    address: string;
    mobile: string;
    pointOfContact: string;
    principalName: string;
}

interface ProfileForm {
    name: string;
    mobileNumber: string;
}

export default function SchoolSettingsScreen() {
    const router = useRouter();
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

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Load profile
            setProfileForm({
                name: user?.name ?? '',
                mobileNumber: user?.mobileNumber ?? '',
            });

            // Load school
            if (user?.schoolId) {
                const school = await schoolsApi.getSchool(user.schoolId);
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
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
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
            Alert.alert('Error', err.message ?? 'Failed to update school.');
        } finally {
            setSavingSchool(false);
        }
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
            Alert.alert('Error', err.message ?? 'Failed to update profile.');
        } finally {
            setSavingProfile(false);
        }
    };

    const handleChangePassword = async () => {
        if (!currentPwd || !newPwd || !confirmPwd) {
            Alert.alert('Validation', 'Please fill all password fields.'); return;
        }
        if (newPwd !== confirmPwd) {
            Alert.alert('Validation', 'New passwords do not match.'); return;
        }
        if (newPwd.length < 8) {
            Alert.alert('Validation', 'Password must be at least 8 characters.'); return;
        }
        setSavingPwd(true);
        try {
            await authApi.changePassword(currentPwd, newPwd);
            Alert.alert('Success', 'Password changed successfully.');
            setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
        } catch (err: any) {
            Alert.alert('Error', err.message ?? 'Failed to change password.');
        } finally {
            setSavingPwd(false);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator size="large" color="#4f46e5" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-background">
            <View className="bg-white px-5 pt-14 pb-4 border-b border-border">
                <View className="flex-row items-center gap-3">
                    <TouchableOpacity onPress={() => router.back()} className="w-9 h-9 rounded-xl bg-gray-100 items-center justify-center">
                        <Ionicons name="arrow-back" size={20} color="#374151" />
                    </TouchableOpacity>
                    <View>
                        <Text className="text-2xl font-bold text-foreground">Settings</Text>
                        <Text className="text-xs text-muted">School & account settings</Text>
                    </View>
                </View>
            </View>

            <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

                    {/* School Profile */}
                    {user?.schoolId && (
                        <View className="bg-white mb-3 rounded-2xl p-4 border border-border">
                            <View className="flex-row items-center gap-2 mb-4">
                                <View className="w-8 h-8 rounded-lg bg-primary/10 items-center justify-center">
                                    <Ionicons name="business-outline" size={18} color="#4f46e5" />
                                </View>
                                <Text className="text-base font-semibold text-foreground">School Profile</Text>
                            </View>

                            {[
                                { key: 'schoolName', label: 'School Name *', placeholder: 'Springfield High', keyboard: 'default' },
                                { key: 'email', label: 'School Email', placeholder: 'school@example.com', keyboard: 'email-address' },
                                { key: 'location', label: 'Location', placeholder: 'City, State', keyboard: 'default' },
                                { key: 'address', label: 'Address', placeholder: 'Full address', keyboard: 'default' },
                                { key: 'mobile', label: 'Mobile / Phone', placeholder: '+91 9876543210', keyboard: 'phone-pad' },
                                { key: 'pointOfContact', label: 'Point of Contact Name', placeholder: 'Contact person name', keyboard: 'default' },
                                { key: 'principalName', label: 'Principal Name', placeholder: 'Principal full name', keyboard: 'default' },
                            ].map(f => (
                                <View key={f.key} className="mb-4">
                                    <Text className="text-sm font-medium text-foreground mb-1.5">{f.label}</Text>
                                    <TextInput
                                        className="bg-gray-50 border border-border rounded-xl px-4 py-3 text-foreground text-sm"
                                        placeholder={f.placeholder}
                                        placeholderTextColor="#9ca3af"
                                        value={schoolForm[f.key as keyof SchoolForm]}
                                        onChangeText={v => setSchoolForm(p => ({ ...p, [f.key]: v }))}
                                        keyboardType={f.keyboard as any}
                                        autoCapitalize={f.keyboard === 'email-address' ? 'none' : 'words'}
                                    />
                                </View>
                            ))}

                            <TouchableOpacity
                                className={`rounded-xl py-3.5 items-center ${savingSchool ? 'bg-primary/60' : 'bg-primary'}`}
                                onPress={handleSaveSchool}
                                disabled={savingSchool}
                            >
                                {savingSchool ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold">Save School Profile</Text>}
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Personal Profile */}
                    <View className="bg-white mb-3 rounded-2xl p-4 border border-border">
                        <View className="flex-row items-center gap-2 mb-4">
                            <View className="w-8 h-8 rounded-lg bg-indigo-100 items-center justify-center">
                                <Ionicons name="person-outline" size={18} color="#4f46e5" />
                            </View>
                            <Text className="text-base font-semibold text-foreground">Personal Profile</Text>
                        </View>

                        <View className="mb-4">
                            <Text className="text-sm font-medium text-foreground mb-1.5">Full Name *</Text>
                            <TextInput
                                className="bg-gray-50 border border-border rounded-xl px-4 py-3 text-foreground text-sm"
                                placeholder="Your full name"
                                placeholderTextColor="#9ca3af"
                                value={profileForm.name}
                                onChangeText={v => setProfileForm(p => ({ ...p, name: v }))}
                                autoCapitalize="words"
                            />
                        </View>

                        <View className="mb-4">
                            <Text className="text-sm font-medium text-foreground mb-1.5">Mobile Number</Text>
                            <TextInput
                                className="bg-gray-50 border border-border rounded-xl px-4 py-3 text-foreground text-sm"
                                placeholder="+91 9876543210"
                                placeholderTextColor="#9ca3af"
                                value={profileForm.mobileNumber}
                                onChangeText={v => setProfileForm(p => ({ ...p, mobileNumber: v }))}
                                keyboardType="phone-pad"
                            />
                        </View>

                        {/* Read-only email */}
                        <View className="mb-4">
                            <Text className="text-sm font-medium text-foreground mb-1.5">Email</Text>
                            <View className="bg-gray-100 border border-border rounded-xl px-4 py-3">
                                <Text className="text-sm text-muted">{user?.email}</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            className={`rounded-xl py-3.5 items-center ${savingProfile ? 'bg-primary/60' : 'bg-primary'}`}
                            onPress={handleSaveProfile}
                            disabled={savingProfile}
                        >
                            {savingProfile ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold">Save Profile</Text>}
                        </TouchableOpacity>
                    </View>

                    {/* Change Password */}
                    <View className="bg-white mb-3 rounded-2xl p-4 border border-border">
                        <View className="flex-row items-center gap-2 mb-4">
                            <View className="w-8 h-8 rounded-lg bg-gray-100 items-center justify-center">
                                <Ionicons name="lock-closed-outline" size={18} color="#6b7280" />
                            </View>
                            <Text className="text-base font-semibold text-foreground">Change Password</Text>
                        </View>

                        {[
                            { label: 'Current Password', value: currentPwd, setter: setCurrentPwd },
                            { label: 'New Password', value: newPwd, setter: setNewPwd },
                            { label: 'Confirm New Password', value: confirmPwd, setter: setConfirmPwd },
                        ].map(field => (
                            <View key={field.label} className="mb-3">
                                <Text className="text-sm font-medium text-foreground mb-1.5">{field.label}</Text>
                                <TextInput
                                    className="bg-gray-50 border border-border rounded-xl px-4 py-3 text-foreground text-sm"
                                    secureTextEntry
                                    value={field.value}
                                    onChangeText={field.setter}
                                    placeholder="••••••••"
                                    placeholderTextColor="#9ca3af"
                                />
                            </View>
                        ))}

                        <TouchableOpacity
                            className={`rounded-xl py-3.5 items-center mt-1 ${savingPwd ? 'bg-gray-400' : 'bg-gray-700'}`}
                            onPress={handleChangePassword}
                            disabled={savingPwd}
                        >
                            {savingPwd ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold">Update Password</Text>}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}
