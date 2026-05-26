import { useEffect, useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    Alert, ActivityIndicator, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { categoriesApi } from '@shared/api/index.js';

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

export default function UploadScreen() {
    const router = useRouter();
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
            // Backend returns categoryName / subCategoryName (camelCase via serializeDoc)
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
                type: 'application/pdf',
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
            setForm(p => ({ ...p, fileName: asset.name.replace(/\.pdf$/i, '') }));
        } catch (err: any) {
            Alert.alert('Error', err.message ?? 'Failed to pick file.');
        }
    };

    const handleUpload = async () => {
        if (!pickedFile) {
            Alert.alert('No File', 'Please select a PDF file first.');
            return;
        }
        if (!form.fileName.trim()) {
            Alert.alert('Validation', 'File name is required.');
            return;
        }
        if (!form.categoryId) {
            Alert.alert('Validation', 'Please select a category.');
            return;
        }

        setUploading(true);
        setUploadProgress(0);

        try {
            const token = await SecureStore.getItemAsync('auth_token');
            const apiUrl = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:8000';

            const formData = new FormData();
            // All text fields MUST come before the file field so @fastify/multipart
            // can read them before it hits the file boundary in the stream.
            formData.append('fileName', form.fileName.trim());
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

    return (
        <View className="flex-1 bg-background">
            <View className="bg-white px-5 pt-14 pb-4 border-b border-border">
                <View className="flex-row items-center gap-3">
                    <TouchableOpacity onPress={() => router.back()} className="w-9 h-9 rounded-xl bg-gray-100 items-center justify-center">
                        <Ionicons name="arrow-back" size={20} color="#374151" />
                    </TouchableOpacity>
                    <Text className="text-2xl font-bold text-foreground">Upload PDF</Text>
                </View>
            </View>

            <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

                    {/* File Picker */}
                    <View className="bg-white mx-0 mb-3 rounded-2xl p-4 border border-border">
                        <Text className="text-sm font-semibold text-foreground mb-3">PDF File</Text>
                        <TouchableOpacity
                            className="border-2 border-dashed border-primary/30 rounded-xl p-6 items-center bg-primary/5"
                            onPress={handlePickFile}
                        >
                            {pickedFile ? (
                                <>
                                    <View className="w-12 h-12 rounded-xl bg-red-100 items-center justify-center mb-2">
                                        <Ionicons name="document-text" size={24} color="#ef4444" />
                                    </View>
                                    <Text className="text-sm font-semibold text-foreground text-center" numberOfLines={2}>{pickedFile.name}</Text>
                                    {pickedFile.size && (
                                        <Text className="text-xs text-muted mt-1">{(pickedFile.size / 1024).toFixed(1)} KB</Text>
                                    )}
                                    <Text className="text-xs text-primary mt-2 font-medium">Tap to change file</Text>
                                </>
                            ) : (
                                <>
                                    <View className="w-12 h-12 rounded-xl bg-primary/10 items-center justify-center mb-2">
                                        <Ionicons name="cloud-upload-outline" size={24} color="#4f46e5" />
                                    </View>
                                    <Text className="text-sm font-semibold text-foreground">Tap to select PDF</Text>
                                    <Text className="text-xs text-muted mt-1">PDF files only</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Form Fields */}
                    <View className="bg-white mb-3 rounded-2xl p-4 border border-border">
                        <Text className="text-sm font-semibold text-foreground mb-3">File Details</Text>

                        {/* File Name */}
                        <View className="mb-4">
                            <Text className="text-sm font-medium text-foreground mb-1.5">File Name *</Text>
                            <TextInput
                                className="bg-gray-50 border border-border rounded-xl px-4 py-3 text-foreground text-sm"
                                placeholder="Enter file name"
                                placeholderTextColor="#9ca3af"
                                value={form.fileName}
                                onChangeText={v => setForm(p => ({ ...p, fileName: v }))}
                            />
                        </View>

                        {/* Category */}
                        <View className="mb-4">
                            <Text className="text-sm font-medium text-foreground mb-1.5">Category *</Text>
                            <TouchableOpacity
                                className="bg-gray-50 border border-border rounded-xl px-4 py-3 flex-row items-center justify-between"
                                onPress={() => setShowCatPicker(true)}
                            >
                                <Text className={`text-sm ${form.categoryId ? 'text-foreground' : 'text-gray-400'}`}>{selectedCatName}</Text>
                                <Ionicons name="chevron-down" size={16} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        {/* Sub-Category */}
                        {filteredSubs.length > 0 && (
                            <View className="mb-4">
                                <Text className="text-sm font-medium text-foreground mb-1.5">Sub-Category</Text>
                                <TouchableOpacity
                                    className="bg-gray-50 border border-border rounded-xl px-4 py-3 flex-row items-center justify-between"
                                    onPress={() => setShowSubPicker(true)}
                                >
                                    <Text className={`text-sm ${form.subCategoryId ? 'text-foreground' : 'text-gray-400'}`}>{selectedSubName}</Text>
                                    <Ionicons name="chevron-down" size={16} color="#6b7280" />
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Description */}
                        <View className="mb-4">
                            <Text className="text-sm font-medium text-foreground mb-1.5">Description</Text>
                            <TextInput
                                className="bg-gray-50 border border-border rounded-xl px-4 py-3 text-foreground text-sm"
                                placeholder="Brief description of the PDF..."
                                placeholderTextColor="#9ca3af"
                                value={form.description}
                                onChangeText={v => setForm(p => ({ ...p, description: v }))}
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                                style={{ minHeight: 80 }}
                            />
                        </View>

                        {/* Tags */}
                        <View className="mb-4">
                            <Text className="text-sm font-medium text-foreground mb-1.5">Tags</Text>
                            <TextInput
                                className="bg-gray-50 border border-border rounded-xl px-4 py-3 text-foreground text-sm"
                                placeholder="e.g. math, grade-10, science"
                                placeholderTextColor="#9ca3af"
                                value={form.tags}
                                onChangeText={v => setForm(p => ({ ...p, tags: v }))}
                            />
                            <Text className="text-xs text-muted mt-1">Comma-separated tags</Text>
                        </View>

                        {/* Email */}
                        <View className="mb-2">
                            <Text className="text-sm font-medium text-foreground mb-1.5">Notification Email</Text>
                            <TextInput
                                className="bg-gray-50 border border-border rounded-xl px-4 py-3 text-foreground text-sm"
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
                        <View className="bg-white mb-3 rounded-2xl p-4 border border-border">
                            <View className="flex-row items-center gap-3 mb-3">
                                <ActivityIndicator size="small" color="#4f46e5" />
                                <Text className="text-sm font-medium text-foreground">Uploading... {uploadProgress}%</Text>
                            </View>
                            <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <View
                                    className="h-full bg-primary rounded-full"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </View>
                        </View>
                    )}

                    {/* Upload Button */}
                    <TouchableOpacity
                        className={`rounded-2xl py-4 items-center flex-row justify-center gap-2 ${uploading || !pickedFile ? 'bg-primary/50' : 'bg-primary'}`}
                        onPress={handleUpload}
                        disabled={uploading || !pickedFile}
                    >
                        {uploading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Ionicons name="cloud-upload-outline" size={20} color="white" />
                                <Text className="text-white font-semibold text-base">Upload PDF</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Category Picker Modal */}
            <Modal visible={showCatPicker} transparent animationType="fade">
                <TouchableOpacity className="flex-1 bg-black/50 justify-center px-6" activeOpacity={1} onPress={() => setShowCatPicker(false)}>
                    <View className="bg-white rounded-2xl overflow-hidden" style={{ maxHeight: '60%' }}>
                        <Text className="text-base font-bold text-foreground px-5 py-4 border-b border-border">Select Category</Text>
                        <ScrollView>
                            {categories.map(cat => (
                                <TouchableOpacity
                                    key={cat.id}
                                    className={`px-5 py-3.5 border-b border-border/50 flex-row items-center justify-between ${form.categoryId === cat.id ? 'bg-primary/5' : ''}`}
                                    onPress={() => { setForm(p => ({ ...p, categoryId: cat.id })); setShowCatPicker(false); }}
                                >
                                    <Text className={`text-sm ${form.categoryId === cat.id ? 'text-primary font-semibold' : 'text-foreground'}`}>{cat.name}</Text>
                                    {form.categoryId === cat.id && <Ionicons name="checkmark" size={18} color="#4f46e5" />}
                                </TouchableOpacity>
                            ))}
                            {categories.length === 0 && (
                                <View className="py-8 items-center">
                                    <Text className="text-muted text-sm">No categories found</Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Sub-Category Picker Modal */}
            <Modal visible={showSubPicker} transparent animationType="fade">
                <TouchableOpacity className="flex-1 bg-black/50 justify-center px-6" activeOpacity={1} onPress={() => setShowSubPicker(false)}>
                    <View className="bg-white rounded-2xl overflow-hidden" style={{ maxHeight: '60%' }}>
                        <Text className="text-base font-bold text-foreground px-5 py-4 border-b border-border">Select Sub-Category</Text>
                        <ScrollView>
                            <TouchableOpacity
                                className={`px-5 py-3.5 border-b border-border/50 flex-row items-center justify-between ${!form.subCategoryId ? 'bg-primary/5' : ''}`}
                                onPress={() => { setForm(p => ({ ...p, subCategoryId: '' })); setShowSubPicker(false); }}
                            >
                                <Text className={`text-sm ${!form.subCategoryId ? 'text-primary font-semibold' : 'text-muted'}`}>None</Text>
                                {!form.subCategoryId && <Ionicons name="checkmark" size={18} color="#4f46e5" />}
                            </TouchableOpacity>
                            {filteredSubs.map(sub => (
                                <TouchableOpacity
                                    key={sub.id}
                                    className={`px-5 py-3.5 border-b border-border/50 flex-row items-center justify-between ${form.subCategoryId === sub.id ? 'bg-primary/5' : ''}`}
                                    onPress={() => { setForm(p => ({ ...p, subCategoryId: sub.id })); setShowSubPicker(false); }}
                                >
                                    <Text className={`text-sm ${form.subCategoryId === sub.id ? 'text-primary font-semibold' : 'text-foreground'}`}>{sub.name}</Text>
                                    {form.subCategoryId === sub.id && <Ionicons name="checkmark" size={18} color="#4f46e5" />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}
