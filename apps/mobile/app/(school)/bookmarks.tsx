import { useEffect, useState, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity,
    RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../src/lib/apiClient';

interface Favorite {
    id: string;
    pdf_id: string;
    pdf?: {
        id: string; title: string; subject?: string;
        category_name?: string; file_size?: number;
    };
    created?: string;
}

function formatBytes(bytes?: number) {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function BookmarksScreen() {
    const [favorites, setFavorites] = useState<Favorite[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchFavorites = useCallback(async () => {
        try {
            const res = await apiFetch('/api/favorites');
            setFavorites(res.items ?? res ?? []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { fetchFavorites(); }, [fetchFavorites]);

    const handleRemove = (fav: Favorite) => {
        Alert.alert('Remove Bookmark', 'Remove this PDF from your bookmarks?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove', style: 'destructive', onPress: async () => {
                    try {
                        await apiFetch(`/api/favorites/${fav.pdf_id}`, 'DELETE');
                        setFavorites(prev => prev.filter(f => f.pdf_id !== fav.pdf_id));
                    } catch (err: any) { Alert.alert('Error', err.message); }
                }
            },
        ]);
    };

    const renderItem = ({ item }: { item: Favorite }) => (
        <View className="bg-white mx-4 mb-3 rounded-2xl p-4 border border-border">
            <View className="flex-row items-start gap-3">
                <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center flex-shrink-0">
                    <Ionicons name="document-text" size={20} color="#4f46e5" />
                </View>
                <View className="flex-1 min-w-0">
                    <Text className="text-sm font-semibold text-foreground leading-tight" numberOfLines={2}>
                        {item.pdf?.title ?? 'Untitled PDF'}
                    </Text>
                    <View className="flex-row items-center gap-2 mt-1 flex-wrap">
                        {item.pdf?.category_name && (
                            <View className="bg-primary/10 px-2 py-0.5 rounded-full">
                                <Text className="text-xs text-primary font-medium">{item.pdf.category_name}</Text>
                            </View>
                        )}
                        {item.pdf?.subject && (
                            <Text className="text-xs text-muted">{item.pdf.subject}</Text>
                        )}
                        {item.pdf?.file_size && (
                            <Text className="text-xs text-muted">{formatBytes(item.pdf.file_size)}</Text>
                        )}
                    </View>
                </View>
                <TouchableOpacity
                    className="w-8 h-8 rounded-xl bg-red-50 border border-red-200 items-center justify-center"
                    onPress={() => handleRemove(item)}
                >
                    <Ionicons name="bookmark" size={16} color="#ef4444" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View className="flex-1 bg-background">
            <View className="bg-white px-5 pt-14 pb-4 border-b border-border">
                <Text className="text-2xl font-bold text-foreground">Bookmarks</Text>
                <Text className="text-sm text-muted mt-0.5">Your saved PDFs</Text>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#4f46e5" />
                </View>
            ) : (
                <FlatList
                    data={favorites}
                    keyExtractor={item => item.id ?? item.pdf_id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); fetchFavorites(); }}
                            tintColor="#4f46e5"
                        />
                    }
                    ListEmptyComponent={
                        <View className="items-center justify-center py-24">
                            <View className="w-16 h-16 rounded-2xl bg-primary/10 items-center justify-center mb-4">
                                <Ionicons name="bookmark-outline" size={32} color="#4f46e5" />
                            </View>
                            <Text className="text-base font-semibold text-foreground">No bookmarks yet</Text>
                            <Text className="text-sm text-muted mt-1 text-center px-8">
                                Bookmark PDFs from the Library to find them here quickly.
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}
