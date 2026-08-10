import { useEffect, useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    Alert, ActivityIndicator, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { categoriesApi } from '@shared/api/index.js';

/* Design tokens mirrored from apps/web (index.css / tailwind.config.js) */
const BRAND = '#5b5ff1';
const BG = '#fbfcff';
const FG = '#111827';
const MUTED_FG = '#6b7280';
const BORDER = '#e5e7eb';
const CARD_BORDER = '#eef0f3';
const ROSE = '#f43f5e';
const SOFT_SM = {
    shadowColor: '#111a2e', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
};

interface Category { id: string; name: string; }
interface SubCategory { id: string; name: string; categoryId: string; }

const EMPTY_FORM = {
    fileName: '',
    description: '',
    tags: '',
    email: '',
    categoryId: '',
    subCategoryId: '',
};

const inputStyle = {
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: BORDER, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, color: FG, fontSize: 14,
};
const labelStyle = { fontSize: 13, fontWeight: '600' as const, color: FG, marginBottom: 6 };

export default function UploadScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [form, setForm] = useState(EMPTY_FORM);
    const [categories, setCategories] = useState<Category[]>([]);
    const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
    const [filteredSubs, setFilteredSubs] = useState<SubCategory[]>([]);
    const [pickedFile, setPickedFile] = useState<{ name: string; uri: string; mimeType?: string; size?: number } | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showCatPicker, setShowCatPicker] = useState(false);
    const [showSubPicker, setShowSubPicker] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        if (form.categoryId) {
            const subs = subCategories.filter(s => s.categoryId === form.categoryId);
            setFilteredSubs(subs);
            setForm(p => ({ ...p, subCategoryId: '' }));
        } else {
            setFilteredSubs([]);
        }
    }, [form.categoryId, subCategories]);

    const fetchCategories = async () => {
        try {
            const [cats, subs] = await Promise.all([
                categoriesApi.listCategories(),
                categoriesApi.listSubCategories(null),
            ]);
            const catItems = (cats.items ?? cats ?? []).map((c: any) => ({
                id: c.id,
                name: c.categoryName ?? c.name ?? '',
            }));
            const subItems = (subs.items ?? subs ?? []).map((s: any) => ({
                id: s.id,
                name: s.subCategoryName ?? s.name ?? '',
                categoryId: s.categoryId ?? s.category_id ?? '',
            }));
            setCategories(catItems);
            setSubCategories(subItems);
        } catch (e) {
            console.error('Failed to load categories', e);
        }
    };

    const handlePickFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: [
                    'application/pdf',
                    'application/zip', 'application/x-zip-compressed',
                    'application/vnd.rar', 'application/x-rar-compressed', 'application/x-rar',
                    'application/x-7z-compressed'
                ],
                copyToCacheDirectory: true,
            });
            if (result.canceled) return;
            const asset = result.assets?.[0];
            if (!asset) return;
            setPickedFile({
                name: asset.name,
                uri: asset.uri,
                mimeType: asset.mimeType ?? 'application/pdf',
                size: asset.size,
            });
            // Pre-fill the (optional) display name with the file's base name.
            setForm(p => ({ ...p, fileName: asset.name.replace(/\.(pdf|zip|rar|7z)$/i, '') }));
        } catch (err: any) {
            Alert.alert('Error', err.message ?? 'Failed to pick file.');
        }
    };

    const handleUpload = async () => {
        if (!pickedFile) {
            Alert.alert('No File', 'Please select a file first.');
            return;
        }
        if (!form.categoryId) {
            Alert.alert('Validation', 'Please select a category.');
            return;
        }

        // File name is optional — fall back to the picked file's name, preserving
        // its extension so the stored name (and download) keeps .pdf / .zip.
        const custom = form.fileName.trim();
        const dot = pickedFile.name.lastIndexOf('.');
        const ext = dot > 0 ? pickedFile.name.slice(dot) : '';
        const effectiveFileName = !custom
            ? pickedFile.name
            : (ext && !custom.toLowerCase().endsWith(ext.toLowerCase()) ? `${custom}${ext}` : custom);

        setUploading(true);
        setUploadProgress(0);

        try {
            const token = await SecureStore.getItemAsync('auth_token');
            const apiUrl = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:8000';

            const formData = new FormData();
            // All text fields MUST come before the file field so @fastify/multipart
            // can read them before it hits the file boundary in the stream.
            formData.append('fileName', effectiveFileName);
            formData.append('categoryId', form.categoryId);
            if (form.subCategoryId) formData.append('subCategoryId', form.subCategoryId);
            if (form.description.trim()) formData.append('description', form.description.trim());
            if (form.tags.trim()) formData.append('tags', form.tags.trim());
            if (form.email.trim()) formData.append('email', form.email.trim());
            // File field LAST
            formData.append('file', {
                uri: pickedFile.uri,
                name: pickedFile.name,
                type: pickedFile.mimeType ?? 'application/pdf',
            } as any);

            // Simulate progress since fetch doesn't support progress natively
            const progressInterval = setInterval(() => {
                setUploadProgress(p => Math.min(p + 10, 85));
            }, 300);

            const res = await fetch(`${apiUrl}/api/pdfs`, {
                method: 'POST',
                headers: {
                    Authorization: token ? `Bearer ${token}` : '',
                },
                body: formData,
            });

            clearInterval(progressInterval);
            setUploadProgress(100);

            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: res.statusText }));
                throw new Error(err.detail ?? 'Upload failed');
            }

            Alert.alert('Success', 'PDF uploaded successfully!', [
                { text: 'Upload Another', onPress: () => { setPickedFile(null); setForm(EMPTY_FORM); setUploadProgress(0); } },
                { text: 'Go Back', onPress: () => router.back() },
            ]);
        } catch (err: any) {
            Alert.alert('Upload Failed', err.message ?? 'An error occurred during upload.');
        } finally {
            setUploading(false);
        }
    };

    const selectedCatName = categories.find(c => c.id === form.categoryId)?.name ?? 'Select category...';
    const selectedSubName = filteredSubs.find(s => s.id === form.subCategoryId)?.name ?? 'Select sub-category...';

    const card = [{ backgroundColor: 'white', marginBottom: 12, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: CARD_BORDER }, SOFT_SM];

    return (
        <View style={{ flex: 1, backgroundColor: BG }}>
            <View style={{ backgroundColor: 'white', paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: BORDER }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="arrow-back" size={20} color="#374151" />
                    </TouchableOpacity>
                    <View>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: BRAND, textTransform: 'uppercase', letterSpacing: 2 }}>Content Management</Text>
                        <Text style={{ fontSize: 22, fontWeight: '700', color: FG }}>Upload PDF</Text>
                    </View>
                </View>
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>

                    {/* File Picker */}
                    <View style={card}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: FG, marginBottom: 12 }}>PDF File</Text>
                        <TouchableOpacity
                            style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: BRAND + '4d', borderRadius: 12, padding: 24, alignItems: 'center', backgroundColor: BRAND + '0d' }}
                            onPress={handlePickFile}
                        >
                            {pickedFile ? (
                                <>
                                    <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: ROSE + '1a', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                                        <Ionicons name="document-text" size={24} color={ROSE} />
                                    </View>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: FG, textAlign: 'center' }} numberOfLines={2}>{pickedFile.name}</Text>
                                    {pickedFile.size ? (
                                        <Text style={{ fontSize: 12, color: MUTED_FG, marginTop: 4 }}>{(pickedFile.size / 1024).toFixed(1)} KB</Text>
                                    ) : null}
                                    <Text style={{ fontSize: 12, color: BRAND, marginTop: 8, fontWeight: '600' }}>Tap to change file</Text>
                                </>
                            ) : (
                                <>
                                    <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: BRAND + '1a', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                                        <Ionicons name="cloud-upload-outline" size={24} color={BRAND} />
                                    </View>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: FG }}>Tap to select file</Text>
                                    <Text style={{ fontSize: 12, color: MUTED_FG, marginTop: 4 }}>PDF, ZIP, RAR or 7Z files</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Form Fields */}
                    <View style={card}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: FG, marginBottom: 12 }}>File Details</Text>

                        <View style={{ marginBottom: 16 }}>
                            <Text style={labelStyle}>File Name (optional)</Text>
                            <TextInput
                                style={inputStyle}
                                placeholder="Leave blank to keep original name"
                                placeholderTextColor="#9ca3af"
                                value={form.fileName}
                                onChangeText={v => setForm(p => ({ ...p, fileName: v }))}
                            />
                        </View>

                        <View style={{ marginBottom: 16 }}>
                            <Text style={labelStyle}>Category *</Text>
                            <TouchableOpacity
                                style={{ ...inputStyle, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                                onPress={() => setShowCatPicker(true)}
                            >
                                <Text style={{ fontSize: 14, color: form.categoryId ? FG : '#9ca3af' }}>{selectedCatName}</Text>
                                <Ionicons name="chevron-down" size={16} color={MUTED_FG} />
                            </TouchableOpacity>
                        </View>

                        {filteredSubs.length > 0 && (
                            <View style={{ marginBottom: 16 }}>
                                <Text style={labelStyle}>Sub-Category</Text>
                                <TouchableOpacity
                                    style={{ ...inputStyle, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                                    onPress={() => setShowSubPicker(true)}
                                >
                                    <Text style={{ fontSize: 14, color: form.subCategoryId ? FG : '#9ca3af' }}>{selectedSubName}</Text>
                                    <Ionicons name="chevron-down" size={16} color={MUTED_FG} />
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={{ marginBottom: 16 }}>
                            <Text style={labelStyle}>Description</Text>
                            <TextInput
                                style={{ ...inputStyle, textAlignVertical: 'top', minHeight: 80 }}
                                placeholder="Brief description of the PDF..."
                                placeholderTextColor="#9ca3af"
                                value={form.description}
                                onChangeText={v => setForm(p => ({ ...p, description: v }))}
                                multiline
                                numberOfLines={3}
                            />
                        </View>

                        <View style={{ marginBottom: 16 }}>
                            <Text style={labelStyle}>Tags</Text>
                            <TextInput
                                style={inputStyle}
                                placeholder="e.g. math, grade-10, science"
                                placeholderTextColor="#9ca3af"
                                value={form.tags}
                                onChangeText={v => setForm(p => ({ ...p, tags: v }))}
                            />
                            <Text style={{ fontSize: 12, color: MUTED_FG, marginTop: 4 }}>Comma-separated tags</Text>
                        </View>

                        <View>
                            <Text style={labelStyle}>Notification Email</Text>
                            <TextInput
                                style={inputStyle}
                                placeholder="email@example.com"
                                placeholderTextColor="#9ca3af"
                                value={form.email}
                                onChangeText={v => setForm(p => ({ ...p, email: v }))}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    {/* Upload Progress */}
                    {uploading && (
                        <View style={card}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                <ActivityIndicator size="small" color={BRAND} />
                                <Text style={{ fontSize: 14, fontWeight: '600', color: FG }}>Uploading... {uploadProgress}%</Text>
                            </View>
                            <View style={{ height: 8, backgroundColor: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                                <View style={{ height: '100%', backgroundColor: BRAND, borderRadius: 4, width: `${uploadProgress}%` }} />
                            </View>
                        </View>
                    )}

                    {/* Upload Button */}
                    <TouchableOpacity
                        style={{ borderRadius: 12, height: 50, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, backgroundColor: (uploading || !pickedFile) ? BRAND + '80' : BRAND }}
                        onPress={handleUpload}
                        disabled={uploading || !pickedFile}
                    >
                        {uploading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Ionicons name="cloud-upload-outline" size={20} color="white" />
                                <Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>Upload PDF</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Category Picker Modal */}
            <Modal visible={showCatPicker} transparent animationType="fade">
                <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 24 }} activeOpacity={1} onPress={() => setShowCatPicker(false)}>
                    <View style={{ backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', maxHeight: '60%' }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: FG, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: BORDER }}>Select Category</Text>
                        <ScrollView>
                            {categories.map(cat => {
                                const active = form.categoryId === cat.id;
                                return (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={{ paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: CARD_BORDER, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: active ? BRAND + '0d' : 'transparent' }}
                                        onPress={() => { setForm(p => ({ ...p, categoryId: cat.id })); setShowCatPicker(false); }}
                                    >
                                        <Text style={{ fontSize: 14, color: active ? BRAND : FG, fontWeight: active ? '600' : '400' }}>{cat.name}</Text>
                                        {active && <Ionicons name="checkmark" size={18} color={BRAND} />}
                                    </TouchableOpacity>
                                );
                            })}
                            {categories.length === 0 && (
                                <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                                    <Text style={{ color: MUTED_FG, fontSize: 14 }}>No categories found</Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Sub-Category Picker Modal */}
            <Modal visible={showSubPicker} transparent animationType="fade">
                <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 24 }} activeOpacity={1} onPress={() => setShowSubPicker(false)}>
                    <View style={{ backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', maxHeight: '60%' }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: FG, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: BORDER }}>Select Sub-Category</Text>
                        <ScrollView>
                            <TouchableOpacity
                                style={{ paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: CARD_BORDER, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: !form.subCategoryId ? BRAND + '0d' : 'transparent' }}
                                onPress={() => { setForm(p => ({ ...p, subCategoryId: '' })); setShowSubPicker(false); }}
                            >
                                <Text style={{ fontSize: 14, color: !form.subCategoryId ? BRAND : MUTED_FG, fontWeight: !form.subCategoryId ? '600' : '400' }}>None</Text>
                                {!form.subCategoryId && <Ionicons name="checkmark" size={18} color={BRAND} />}
                            </TouchableOpacity>
                            {filteredSubs.map(sub => {
                                const active = form.subCategoryId === sub.id;
                                return (
                                    <TouchableOpacity
                                        key={sub.id}
                                        style={{ paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: CARD_BORDER, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: active ? BRAND + '0d' : 'transparent' }}
                                        onPress={() => { setForm(p => ({ ...p, subCategoryId: sub.id })); setShowSubPicker(false); }}
                                    >
                                        <Text style={{ fontSize: 14, color: active ? BRAND : FG, fontWeight: active ? '600' : '400' }}>{sub.name}</Text>
                                        {active && <Ionicons name="checkmark" size={18} color={BRAND} />}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}
