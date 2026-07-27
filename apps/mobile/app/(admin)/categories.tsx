import { useEffect, useState, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, TextInput,
    RefreshControl, ActivityIndicator, Alert, Modal,
    KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { categoriesApi } from '@shared/api/index.js';

/* Design tokens mirrored from apps/web (index.css / tailwind.config.js) */
const BRAND = '#5b5ff1';
const BG = '#fbfcff';
const FG = '#111827';
const MUTED_FG = '#6b7280';
const BORDER = '#e5e7eb';
const CARD_BORDER = '#eef0f3';
const SUCCESS = '#22c55e';
const DESTRUCTIVE = '#e11d48';
const SOFT_SM = {
    shadowColor: '#111a2e', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
};

interface Category { id: string; name: string; description?: string; }
interface SubCategory { id: string; name: string; categoryId: string; description?: string; }

export default function CategoriesScreen() {
    const insets = useSafeAreaInsets();
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

    useEffect(() => { fetchAll(); }, [fetchAll]);

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

    const iconBtn = (bg: string) => ({
        width: 32, height: 32, borderRadius: 10, backgroundColor: bg,
        alignItems: 'center' as const, justifyContent: 'center' as const,
    });

    const renderCategory = ({ item }: { item: Category }) => {
        const subs = subCategories.filter(s => s.categoryId === item.id);
        const isExpanded = expanded[item.id];
        return (
            <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
                <View style={[{
                    backgroundColor: 'white', borderRadius: 16, borderWidth: 1,
                    borderColor: CARD_BORDER, overflow: 'hidden',
                }, SOFT_SM]}>
                    <TouchableOpacity
                        activeOpacity={0.7}
                        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}
                        onPress={() => setExpanded(p => ({ ...p, [item.id]: !p[item.id] }))}
                    >
                        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: BRAND + '1a', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                            <Ionicons name="folder" size={18} color={BRAND} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={{ fontSize: 15, fontWeight: '600', color: FG }} numberOfLines={1}>{item.name}</Text>
                            <Text style={{ fontSize: 12, color: MUTED_FG, marginTop: 2 }}>{subs.length} subcategories</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <TouchableOpacity style={iconBtn(BRAND + '1a')} onPress={() => openModal('cat', item)}>
                                <Ionicons name="pencil" size={14} color={BRAND} />
                            </TouchableOpacity>
                            <TouchableOpacity style={iconBtn(DESTRUCTIVE + '14')} onPress={() => handleDeleteCat(item)}>
                                <Ionicons name="trash-outline" size={14} color={DESTRUCTIVE} />
                            </TouchableOpacity>
                            <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#9ca3af" />
                        </View>
                    </TouchableOpacity>

                    {isExpanded && (
                        <View style={{ borderTopWidth: 1, borderTopColor: CARD_BORDER }}>
                            {subs.map(sub => (
                                <View key={sub.id} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: CARD_BORDER }}>
                                    <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                        <Ionicons name="document-text-outline" size={13} color={MUTED_FG} />
                                    </View>
                                    <Text style={{ flex: 1, fontSize: 14, color: FG }} numberOfLines={1}>{sub.name}</Text>
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        <TouchableOpacity style={iconBtn(BRAND + '1a')} onPress={() => openModal('sub', sub, item.id)}>
                                            <Ionicons name="pencil" size={13} color={BRAND} />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={iconBtn(DESTRUCTIVE + '14')} onPress={() => handleDeleteSub(sub)}>
                                            <Ionicons name="trash-outline" size={13} color={DESTRUCTIVE} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                            <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 13 }}
                                onPress={() => openModal('sub', undefined, item.id)}
                            >
                                <Ionicons name="add-circle-outline" size={17} color={BRAND} />
                                <Text style={{ fontSize: 14, color: BRAND, fontWeight: '600' }}>Add Subcategory</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: BG }}>
            <View style={{ backgroundColor: 'white', paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: BORDER }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: BRAND, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>
                    Content
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 24, fontWeight: '700', color: FG }}>Categories</Text>
                    <TouchableOpacity
                        style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center' }}
                        onPress={() => openModal('cat')}
                    >
                        <Ionicons name="add" size={22} color="white" />
                    </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 13, color: MUTED_FG, marginTop: 4 }}>Manage content categories and subcategories</Text>
            </View>

            {loading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color={BRAND} /></View>
            ) : (
                <FlatList
                    data={categories} keyExtractor={item => item.id} renderItem={renderCategory}
                    contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 24 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor={BRAND} />}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
                            <Ionicons name="folder-open-outline" size={48} color="#d1d5db" />
                            <Text style={{ color: FG, fontWeight: '600', marginTop: 12 }}>No categories yet</Text>
                            <Text style={{ color: MUTED_FG, fontSize: 13, marginTop: 4 }}>Tap + to create your first category</Text>
                        </View>
                    }
                />
            )}

            <Modal visible={!!modal} transparent animationType="slide">
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                        <View style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 24, paddingBottom: insets.bottom + 24 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                                <Text style={{ fontSize: 18, fontWeight: '700', color: FG }}>
                                    {modal?.edit ? 'Edit' : 'Add'} {modal?.type === 'cat' ? 'Category' : 'Subcategory'}
                                </Text>
                                <TouchableOpacity onPress={() => setModal(null)}><Ionicons name="close" size={24} color={MUTED_FG} /></TouchableOpacity>
                            </View>
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 13, fontWeight: '600', color: FG, marginBottom: 6 }}>Name *</Text>
                                <TextInput
                                    style={{ backgroundColor: '#f9fafb', borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: FG, fontSize: 14 }}
                                    placeholder="Enter name" placeholderTextColor="#9ca3af"
                                    value={formName} onChangeText={setFormName} autoFocus
                                />
                            </View>
                            <View style={{ marginBottom: 20 }}>
                                <Text style={{ fontSize: 13, fontWeight: '600', color: FG, marginBottom: 6 }}>Description</Text>
                                <TextInput
                                    style={{ backgroundColor: '#f9fafb', borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: FG, fontSize: 14, textAlignVertical: 'top', minHeight: 60 }}
                                    placeholder="Optional description" placeholderTextColor="#9ca3af"
                                    value={formDesc} onChangeText={setFormDesc}
                                    multiline numberOfLines={2}
                                />
                            </View>
                            <TouchableOpacity
                                style={{ borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: submitting ? BRAND + '99' : BRAND }}
                                onPress={handleSubmit} disabled={submitting}
                            >
                                {submitting ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>{modal?.edit ? 'Save Changes' : 'Create'}</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}
