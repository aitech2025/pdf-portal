import { useEffect, useState } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, TextInput,
    RefreshControl, ActivityIndicator, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { pdfsApi } from '@shared/api/index.js';
import { formatBytes } from '@shared/utils/format.js';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:8000';

interface PDF {
    id: string;
    fileName: string;
    pdfId?: string;
    fileSize?: number;
    currentVersion: number;
}

export default function SchoolPortal() {
    const [pdfs, setPdfs] = useState<PDF[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');

    const fetchPdfs = async () => {
        try {
            const res = await pdfsApi.listPdfs({ per_page: 100, sort: '-created' });
            setPdfs(res.items ?? []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { fetchPdfs(); }, []);

    const handleDownload = (pdf: PDF) => {
        Linking.openURL(`${API_URL}/api/pdfs/${pdf.id}/download`);
    };

    const filtered = pdfs.filter(p =>
        p.fileName?.toLowerCase().includes(search.toLowerCase())
    );

    const renderItem = ({ item }: { item: PDF }) => (
        <View className="bg-white mx-4 mb-3 rounded-2xl p-4 border border-border flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-xl bg-rose-100 items-center justify-center">
                <Ionicons name="document-text" size={20} color="#e11d48" />
            </View>
            <View className="flex-1 min-w-0">
                <Text className="font-semibold text-foreground" numberOfLines={2}>{item.fileName}</Text>
                <Text className="text-xs text-muted mt-0.5">
                    {item.pdfId ?? ''}{item.fileSize ? ` • ${formatBytes(item.fileSize)}` : ''}
                </Text>
            </View>
            <TouchableOpacity
                className="w-9 h-9 rounded-xl bg-primary/10 items-center justify-center"
                onPress={() => handleDownload(item)}
            >
                <Ionicons name="download-outline" size={18} color="#4f46e5" />
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
                        placeholder="Search PDFs..."
                        placeholderTextColor="#9ca3af"
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#4f46e5" />
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPdfs(); }} tintColor="#4f46e5" />}
                    ListEmptyComponent={
                        <View className="items-center justify-center py-20">
                            <Ionicons name="library-outline" size={48} color="#d1d5db" />
                            <Text className="text-muted mt-3">No content available</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}
