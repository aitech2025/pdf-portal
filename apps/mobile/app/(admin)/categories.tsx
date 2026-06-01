import { useEffect, useState, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, TextInput,
    RefreshControl, ActivityIndicator, Alert, Modal,
    KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { categoriesApi } from '@shared/api/index.js';

interface Category { id: string; name: string; description?: string; }
interface SubCategory { id: string; name: string; categoryId: string; description?: string; }

export default function CategoriesScreen() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    // Modal state
    const [modal, setModal] = useState<{ type: 'cat' | 'sub'; edit?: Category | SubCategory; parentId?: string } | null>(null);
    const [formName, setFormName] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchAll = useCallback(async () => {
        try {
            const [cats, subs] = await Promise.all([
                categoriesApi.listCategories(),
                categoriesApi.listSubCategories(null as any),
            ]);
            // Backend returns categoryName / subCategoryName (camelCase via serializeDoc)
            const catItems = (cats.items ?? cats ?? []).map((c: any) => ({
                id: c.id,
                name: c.categoryName ?? c.name ?? '',
                description: c.description ?? '',
            }));
            const subItems = (subs.items ?? subs ?? []).map((s: any) => ({
                id: s.id,
                name: s.subCategoryName ?? s.name ?? '',
                categoryId: s.categoryId ?? s.category_id ?? '',
                description: s.description ?? '',
            }));
            setCategories(catItems);
            setSubCategories(subItems);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { fetchAll(); }, []);

    const openModal = (type: 'cat' | 'sub', edit?: Category | SubCategory, parentId?: string) => {
        setFormName(edit?.name ?? '');
        setFormDesc(edit?.description ?? '');
        setModal({ type, edit, parentId });
    };

    const handleSubmit = async () => {
        if (!formName.trim()) { Alert.alert('Error', 'Name is required.'); return; }
        setSubmitting(true);
        try {
            if (modal?.type === 'cat') {
                if (modal.edit) await categoriesApi.updateCategory(modal.edit.id, { name: formName, description: formDesc });
                else await categoriesApi.createCategory({ name: formName, description: formDesc });
            } else {
                if (modal?.edit) await categoriesApi.updateSubCategory(modal.edit.id, { name: formName, description: formDesc });
                else await categoriesApi.createSubCategory({ name: formName, description: formDesc, categoryId: modal?.parentId });
            }
            setModal(null); fetchAll();
        } catch (err: any) { Alert.alert('Error', err.message); }
        finally { setSubmitting(false); }
    };

    const handleDeleteCat = (cat: Category) => {
        Alert.alert('Delete Category', `Delete "${cat.name}"? All subcategories will also be removed.`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try { await categoriesApi.deleteCategory(cat.id); fetchAll(); }
                    catch (err: any) { Alert.alert('Error', err.message); }
                }
            },
        ]);
    };

    const handleDeleteSub = (sub: SubCategory) => {
        Alert.alert('Delete Subcategory', `Delete "${sub.name}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try { await categoriesApi.deleteSubCategory(sub.id); fetchAll(); }
                    catch (err: any) { Alert.alert('Error', err.message); }
                }
            },
        ]);
    };

    const renderCategory = ({ item }: { item: Category }) => {
        const subs = subCategories.filter(s => s.categoryId === item.id);
        const isExpanded = expanded[item.id];
        return (
            <View className="mx-4 mb-3">
                <View className="bg-white rounded-2xl border border-border overflow-hidden">
                    <TouchableOpacity
                        className="flex-row items-center px-4 py-3.5"
                        onPress={() => setExpanded(p => ({ ...p, [item.id]: !p[item.id] }))}
                    >
                        <View className="w-8 h-8 rounded-lg bg-primary/10 items-center justify-center mr-3">
                            <Ionicons name="folder" size={16} color="#4f46e5" />
                        </View>
                        <View className="flex-1">
                            <Text className="font-semibold text-foreground">{item.name}</Text>
                            <Text className="text-xs text-muted">{subs.length} subcategories</Text>
                        </View>
                        <View className="flex-row items-center gap-2">
                            <TouchableOpacity className="w-8 h-8 rounded-lg bg-primary/10 items-center justify-center" onPress={() => openModal('cat', item)}>
                                <Ionicons name="pencil" size={14} color="#4f46e5" />
                            </TouchableOpacity>
                            <TouchableOpacity className="w-8 h-8 rounded-lg bg-red-50 items-center justify-center" onPress={() => handleDeleteCat(item)}>
                                <Ionicons name="trash-outline" size={14} color="#ef4444" />
                            </TouchableOpacity>
                            <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#9ca3af" />
                        </View>
                    </TouchableOpacity>

                    {isExpanded && (
                        <View className="border-t border-border/50">
                            {subs.map(sub => (
                                <View key={sub.id} className="flex-row items-center px-4 py-3 border-b border-border/30">
                                    <View className="w-6 h-6 rounded-md bg-gray-100 items-center justify-center mr-3">
                                        <Ionicons name="document-text-outline" size={12} color="#6b7280" />
                                    </View>
                                    <Text className="flex-1 text-sm text-foreground">{sub.name}</Text>
                                    <View className="flex-row gap-2">
                                        <TouchableOpacity className="w-7 h-7 rounded-lg bg-primary/10 items-center justify-center" onPress={() => openModal('sub', sub, item.id)}>
                                            <Ionicons name="pencil" size={12} color="#4f46e5" />
                                        </TouchableOpacity>
                                        <TouchableOpacity className="w-7 h-7 rounded-lg bg-red-50 items-center justify-center" onPress={() => handleDeleteSub(sub)}>
                                            <Ionicons name="trash-outline" size={12} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                            <TouchableOpacity
                                className="flex-row items-center gap-2 px-4 py-3"
                                onPress={() => openModal('sub', undefined, item.id)}
                            >
                                <Ionicons name="add-circle-outline" size={16} color="#4f46e5" />
                                <Text className="text-sm text-primary font-medium">Add Subcategory</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View className="flex-1 bg-background">
            <View className="bg-white px-5 pt-14 pb-4 border-b border-border">
                <View className="flex-row items-center justify-between">
                    <Text className="text-2xl font-bold text-foreground">Categories</Text>
                    <TouchableOpacity className="w-9 h-9 rounded-xl bg-primary items-center justify-center" onPress={() => openModal('cat')}>
                        <Ionicons name="add" size={20} color="white" />
                    </TouchableOpacity>
                </View>
                <Text className="text-sm text-muted mt-0.5">Manage content categories and subcategories</Text>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color="#4f46e5" /></View>
            ) : (
                <FlatList
                    data={categories} keyExtractor={item => item.id} renderItem={renderCategory}
                    contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor="#4f46e5" />}
                    ListEmptyComponent={
                        <View className="items-center justify-center py-20">
                            <Ionicons name="folder-open-outline" size={48} color="#d1d5db" />
                            <Text className="text-foreground font-medium mt-3">No categories yet</Text>
                            <Text className="text-muted text-sm mt-1">Tap + to create your first category</Text>
                        </View>
                    }
                />
            )}

            <Modal visible={!!modal} transparent animationType="slide">
                <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View className="flex-1 bg-black/50 justify-end">
                        <View className="bg-white rounded-t-3xl px-6 pt-6 pb-8">
                            <View className="flex-row items-center justify-between mb-5">
                                <Text className="text-lg font-bold text-foreground">
                                    {modal?.edit ? 'Edit' : 'Add'} {modal?.type === 'cat' ? 'Category' : 'Subcategory'}
                                </Text>
                                <TouchableOpacity onPress={() => setModal(null)}><Ionicons name="close" size={24} color="#6b7280" /></TouchableOpacity>
                            </View>
                            <View className="mb-4">
                                <Text className="text-sm font-medium text-foreground mb-1.5">Name *</Text>
                                <TextInput
                                    className="bg-gray-50 border border-border rounded-xl px-4 py-3 text-foreground text-sm"
                                    placeholder="Enter name" placeholderTextColor="#9ca3af"
                                    value={formName} onChangeText={setFormName} autoFocus
                                />
                            </View>
                            <View className="mb-5">
                                <Text className="text-sm font-medium text-foreground mb-1.5">Description</Text>
                                <TextInput
                                    className="bg-gray-50 border border-border rounded-xl px-4 py-3 text-foreground text-sm"
                                    placeholder="Optional description" placeholderTextColor="#9ca3af"
                                    value={formDesc} onChangeText={setFormDesc}
                                    multiline numberOfLines={2} style={{ textAlignVertical: 'top', minHeight: 60 }}
                                />
                            </View>
                            <TouchableOpacity
                                className={`rounded-xl py-4 items-center ${submitting ? 'bg-primary/60' : 'bg-primary'}`}
                                onPress={handleSubmit} disabled={submitting}
                            >
                                {submitting ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">{modal?.edit ? 'Save Changes' : 'Create'}</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}
