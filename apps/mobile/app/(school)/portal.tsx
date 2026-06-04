import { useEffect, useRef, useState } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, TextInput,
    RefreshControl, ActivityIndicator, Linking, ScrollView, Alert,
    Modal, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Pdf from 'react-native-pdf';
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
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const insets = useSafeAreaInsets();

    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [pdfs, setPdfs] = useState<PDF[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedCat, setSelectedCat] = useState<string | null>(null);

    // PDF viewer
    const [viewerPdf, setViewerPdf] = useState<PDF | null>(null);
    const [pdfToken, setPdfToken] = useState<string | null>(null);
    const [pdfPages, setPdfPages] = useState(0);
    const [pdfPage, setPdfPage] = useState(1);
    const [pdfLoading, setPdfLoading] = useState(false);

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

    useEffect(() => { fetchAll(); }, []);

    // Fetch auth token whenever viewer opens
    useEffect(() => {
        if (!viewerPdf) return;
        setPdfPages(0);
        setPdfPage(1);
        setPdfLoading(true);
        SecureStore.getItemAsync('auth_token').then(t => setPdfToken(t));
    }, [viewerPdf?.id]);

    const handleDownload = async (item: PDF) => {
        try {
            setDownloadingId(item.id);
            const token = await SecureStore.getItemAsync('auth_token');
            if (!token) { Alert.alert('Session expired', 'Please login again.'); return; }
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
            <View className="flex-row gap-2">
                {/* View PDF in-app */}
                <TouchableOpacity
                    className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 items-center justify-center"
                    onPress={() => setViewerPdf(item)}
                >
                    <Ionicons name="eye-outline" size={18} color="#2563eb" />
                </TouchableOpacity>
                {/* Download PDF */}
                <TouchableOpacity
                    className="w-9 h-9 rounded-xl bg-primary/10 items-center justify-center"
                    onPress={() => handleDownload(item)}
                    disabled={downloadingId === item.id}
                >
                    {downloadingId === item.id
                        ? <ActivityIndicator size="small" color="#4f46e5" />
                        : <Ionicons name="download-outline" size={18} color="#4f46e5" />}
                </TouchableOpacity>
            </View>
        </View>
    );

    // Header height used to offset PDF area
    const HEADER_H = insets.top + 56;

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

            {/* ── Full-Screen PDF Viewer Modal ── */}
            <Modal
                visible={!!viewerPdf}
                animationType="slide"
                statusBarTranslucent
                onRequestClose={() => setViewerPdf(null)}
            >
                <View style={{ flex: 1, backgroundColor: '#111827' }}>
                    {/* Viewer header */}
                    <View style={{
                        paddingTop: insets.top + 8,
                        paddingBottom: 12,
                        paddingHorizontal: 16,
                        backgroundColor: '#1f2937',
                        flexDirection: 'row',
                        alignItems: 'center',
                    }}>
                        <TouchableOpacity
                            onPress={() => setViewerPdf(null)}
                            style={{ marginRight: 12, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
                        >
                            <Ionicons name="close" size={22} color="white" />
                        </TouchableOpacity>
                        <Text style={{ color: 'white', flex: 1, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
                            {viewerPdf?.fileName}
                        </Text>
                        {pdfPages > 0 && (
                            <Text style={{ color: '#9ca3af', fontSize: 12, marginLeft: 8 }}>
                                {pdfPage} / {pdfPages}
                            </Text>
                        )}
                    </View>

                    {/* PDF rendered to full screen width */}
                    {pdfToken && viewerPdf ? (
                        <Pdf
                            trustAllCerts={false}
                            source={{
                                uri: `${API_URL}/api/pdfs/${viewerPdf.id}/preview`,
                                headers: { Authorization: `Bearer ${pdfToken}` },
                                cache: true,
                            }}
                            // width: full device width so pages scale to fit
                            // flex: 1 fills the remaining height after the header
                            style={{ flex: 1, width: screenWidth, backgroundColor: '#111827' }}
                            fitPolicy={0}      // 0 = fit to width (auto-scale)
                            horizontal={false} // vertical scroll through pages
                            enablePaging={false}
                            onLoadComplete={(pages) => {
                                setPdfPages(pages);
                                setPdfLoading(false);
                            }}
                            onPageChanged={(page) => setPdfPage(page)}
                            onError={() => {
                                setPdfLoading(false);
                                Alert.alert('Error', 'Could not load the PDF. Check your connection.');
                            }}
                        />
                    ) : (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                            <ActivityIndicator size="large" color="#4f46e5" />
                        </View>
                    )}

                    {/* Loading overlay while PDF initialises */}
                    {pdfLoading && (
                        <View style={{
                            position: 'absolute',
                            top: HEADER_H,
                            left: 0, right: 0, bottom: 0,
                            backgroundColor: '#111827',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <ActivityIndicator size="large" color="#4f46e5" />
                            <Text style={{ color: '#9ca3af', marginTop: 12, fontSize: 14 }}>Loading PDF…</Text>
                        </View>
                    )}
                </View>
            </Modal>
        </View>
    );
}
