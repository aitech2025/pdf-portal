import { useEffect, useState } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, TextInput,
    RefreshControl, ActivityIndicator, Linking, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { pdfsApi, categoriesApi } from '@shared/api/index.js';
import { formatBytes } from '@shared/utils/format.js';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:8000';

interface PDF {
    id: string; fileName: string; pdfId?: string;
    fileSize?: number; currentVersion: number;
    categoryId?: string; subCategoryId?: string;
}
interface Category { id: string; name: string; }

export default function SchoolPortal() {
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    const [pdfs, setPdfs] = useState<PDF[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedCat, setSelectedCat] = useState<string | null>(null);

    const fetchAll = async () => {
        try {
            const [pdfRes, catRes] = await Promise.all([
                pdfsApi.listPdfs({ per_page: 200, sort: '-created', status: 'approved' }),
                categoriesApi.listCategories(),
            ]);
            setPdfs(pdfRes.items ?? []);
            setCategories((catRes.items ?? []).map((cat: any) => ({
                id: cat.id,
                name: cat.categoryName ?? cat.name ?? 'Category',
            })));
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    };

    const handleDownload = async (item: PDF) => {
        try {
            setDownloadingId(item.id);
            const token = await SecureStore.getItemAsync('auth_token');
            if (!token) {
                Alert.alert('Session expired', 'Please login again.');
                return;
            }
            const fileUri = `${FileSystem.documentDirectory}${item.fileName || item.id}.pdf`;
            const response = await FileSystem.downloadAsync(
                `${API_URL}/api/pdfs/${item.id}/download`,
                fileUri,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            await Linking.openURL(response.uri);
        } catch (e: any) {
            Alert.alert('Download failed', e?.message || 'Unable to download this PDF.');
        } finally {
            setDownloadingId(null);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const filtered = pdfs
        .filter(p => !selectedCat || p.categoryId === selectedCat)
        .filter(p => !search || p.fileName?.toLowerCase().includes(search.toLowerCase()));

    const renderItem = ({ item }: { item: PDF }) => (
        <View className="bg-white mx-4 mb-3 rounded-2xl p-4 border border-border flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-xl bg-rose-100 items-center justify-center shrink-0">
                <Ionicons name="document-text" size={20} color="#e11d48" />
            </View>
            <View className="flex-1 min-w-0">
                <Text className="font-semibold text-foreground" numberOfLines={2}>{item.fileName}</Text>
                <Text className="text-xs text-muted mt-0.5">
                    {item.pdfId ?? ''}{item.fileSize ? ` • ${formatBytes(item.fileSize)}` : ''}{` • v${item.currentVersion ?? 1}`}
                </Text>
            </View>
            <TouchableOpacity
                className="w-9 h-9 rounded-xl bg-primary/10 items-center justify-center"
                onPress={() => handleDownload(item)}
                disabled={downloadingId === item.id}
            >
                {downloadingId === item.id ? (
                    <ActivityIndicator size="small" color="#4f46e5" />
                ) : (
                    <Ionicons name="download-outline" size={18} color="#4f46e5" />
                )}
            </TouchableOpacity>
        </View>
    );

    return (
        <View className="flex-1 bg-background">
            <View className="bg-white px-5 pt-14 pb-4 border-b border-border">
                <Text className="text-2xl font-bold text-foreground">Content Library</Text>
                <View className="flex-row items-center bg-gray-100 rounded-xl px-3 mt-3">
                    <Ionicons name="search" size={16} color="#9ca3af" />
                    <TextInput
                        className="flex-1 py-2.5 px-2 text-foreground text-sm"
                        placeholder="Search PDFs..." placeholderTextColor="#9ca3af"
                        value={search} onChangeText={setSearch}
                    />
                    {search ? (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Ionicons name="close-circle" size={16} color="#9ca3af" />
                        </TouchableOpacity>
                    ) : null}
                </View>
                {/* Category filter */}
                {categories.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3 -mx-1">
                        <TouchableOpacity
                            className={`mx-1 px-3 py-1.5 rounded-full border ${!selectedCat ? 'bg-primary border-primary' : 'bg-white border-border'}`}
                            onPress={() => setSelectedCat(null)}
                        >
                            <Text className={`text-xs font-semibold ${!selectedCat ? 'text-white' : 'text-foreground'}`}>All</Text>
                        </TouchableOpacity>
                        {categories.map(cat => (
                            <TouchableOpacity
                                key={cat.id}
                                className={`mx-1 px-3 py-1.5 rounded-full border ${selectedCat === cat.id ? 'bg-primary border-primary' : 'bg-white border-border'}`}
                                onPress={() => setSelectedCat(selectedCat === cat.id ? null : cat.id)}
                            >
                                <Text className={`text-xs font-semibold ${selectedCat === cat.id ? 'text-white' : 'text-foreground'}`}>{cat.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}
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
                            <Ionicons name="library-outline" size={48} color="#d1d5db" />
                            <Text className="text-muted mt-3">{search || selectedCat ? 'No matching content' : 'No content available'}</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}
