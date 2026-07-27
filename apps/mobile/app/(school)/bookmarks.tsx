import { useEffect, useState, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity,
    RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch } from '../../src/lib/apiClient';

/* Design tokens mirrored from apps/web */
const BRAND = '#5b5ff1';
const BG = '#fbfcff';
const FG = '#111827';
const MUTED_FG = '#6b7280';
const CARD_BORDER = '#eef0f3';
const ROSE = '#f43f5e';
const RADIUS_LG = 16;
const SOFT_SM = {
    shadowColor: '#111a2e', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
};

interface Favorite {
    id: string;
    pdfId?: string;
    pdf_id?: string;
    pdf?: {
        id: string; fileName?: string; file_name?: string;
        pdfId?: string; pdf_id?: string;
        subject?: string; categoryName?: string; category_name?: string;
    };
    created?: string;
}

function getPdfCode(pdf?: Favorite['pdf']) {
    const code = pdf?.pdfId ?? pdf?.pdf_id;
    return code && String(code).trim() ? String(code) : null;
}

export default function BookmarksScreen() {
    const insets = useSafeAreaInsets();
    const [favorites, setFavorites] = useState<Favorite[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchFavorites = useCallback(async () => {
        try {
            const res: any = await apiFetch('/api/favorites');
            setFavorites(res.items ?? res ?? []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { fetchFavorites(); }, [fetchFavorites]);

    const handleRemove = (fav: Favorite) => {
        const pdfId = fav.pdfId ?? fav.pdf_id ?? fav.pdf?.id;
        Alert.alert('Remove Bookmark', 'Remove this PDF from your bookmarks?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove', style: 'destructive', onPress: async () => {
                    try {
                        await apiFetch(`/api/favorites/${pdfId}`, 'DELETE');
                        setFavorites(prev => prev.filter(f => f.id !== fav.id));
                    } catch (err: any) { Alert.alert('Error', err?.message ?? 'Could not remove bookmark'); }
                },
            },
        ]);
    };

    const renderItem = ({ item }: { item: Favorite }) => {
        const title = item.pdf?.fileName ?? item.pdf?.file_name ?? 'PDF';
        const code = getPdfCode(item.pdf);
        const category = item.pdf?.categoryName ?? item.pdf?.category_name;
        return (
            <View style={[{
                backgroundColor: 'white', marginHorizontal: 16, marginBottom: 12,
                borderRadius: RADIUS_LG, borderWidth: 1, borderColor: CARD_BORDER, padding: 16,
            }, SOFT_SM]}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: ROSE + '1a', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="document-text" size={20} color={ROSE} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: FG, lineHeight: 19 }} numberOfLines={2}>
                            {title}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                            {code ? (
                                <View style={{ backgroundColor: '#f3f4f6', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                                    <Text style={{ fontSize: 10, fontWeight: '600', color: '#4b5563', fontFamily: 'monospace' }}>{code}</Text>
                                </View>
                            ) : null}
                            {category ? (
                                <View style={{ backgroundColor: '#eef2ff', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                                    <Text style={{ fontSize: 10, fontWeight: '600', color: BRAND }}>{category}</Text>
                                </View>
                            ) : null}
                            {item.pdf?.subject ? (
                                <Text style={{ fontSize: 12, color: MUTED_FG }}>{item.pdf.subject}</Text>
                            ) : null}
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={() => handleRemove(item)}
                        style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <Ionicons name="bookmark" size={16} color={ROSE} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: BG }}>
            <View style={{ backgroundColor: 'white', paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: CARD_BORDER }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: BRAND, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>
                    School portal
                </Text>
                <Text style={{ fontSize: 24, fontWeight: '700', color: FG }}>Bookmarks</Text>
                <Text style={{ fontSize: 14, color: MUTED_FG, marginTop: 2 }}>Saved PDFs for quick access</Text>
            </View>

            {loading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color={BRAND} />
                </View>
            ) : (
                <FlatList
                    data={favorites}
                    keyExtractor={item => item.id ?? (item.pdfId ?? item.pdf_id ?? '')}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 24 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFavorites(); }} tintColor={BRAND} />
                    }
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 96 }}>
                            <View style={{ width: 64, height: 64, borderRadius: RADIUS_LG, backgroundColor: BRAND + '1a', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                <Ionicons name="bookmark-outline" size={32} color={BRAND} />
                            </View>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: FG }}>No bookmarks yet</Text>
                            <Text style={{ fontSize: 13, color: MUTED_FG, marginTop: 6, textAlign: 'center', paddingHorizontal: 40 }}>
                                Bookmark PDFs while browsing the resource portal to find them here quickly.
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}
