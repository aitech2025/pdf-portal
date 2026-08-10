import { useCallback, useEffect, useState } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, TextInput,
    RefreshControl, ActivityIndicator, Linking, ScrollView,
    Alert, Modal, useWindowDimensions, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Pdf from 'react-native-pdf';
import { pdfsApi, categoriesApi } from '@shared/api/index.js';
import { formatBytes } from '@shared/utils/format.js';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:8000';
const BRAND = '#5b5ff1';

interface PDF {
    id: string; fileName: string; pdfId?: string; fileType?: string;
    fileSize?: number; currentVersion: number;
    categoryId?: string; classId?: string; subjectId?: string;
}

const ARCHIVE_TYPES = ['zip', 'rar', '7z'];
const isZipItem = (p: PDF) =>
    (!!p.fileType && ARCHIVE_TYPES.includes(p.fileType)) || /\.(zip|rar|7z)$/i.test(p.fileName || '');
const archiveExt = (p: PDF): string =>
    (p.fileType && ARCHIVE_TYPES.includes(p.fileType)) ? p.fileType : ((p.fileName || '').toLowerCase().match(/\.(zip|rar|7z)$/)?.[1] ?? 'zip');
interface Program { id: string; name: string; }
interface ClassItem { classId: string; className: string; subjects: SubjectItem[]; }
interface SubjectItem { subjectId: string; subjectName: string; }

const FilterChip = ({
    label, active, color = BRAND, onPress,
}: { label: string; active: boolean; color?: string; onPress: () => void }) => (
    <TouchableOpacity
        onPress={onPress}
        style={{
            marginHorizontal: 3, paddingHorizontal: 12, paddingVertical: 6,
            borderRadius: 20, borderWidth: 1,
            backgroundColor: active ? color : 'white',
            borderColor: active ? color : '#e5e7eb',
        }}
    >
        <Text style={{ fontSize: 12, fontWeight: '600', color: active ? 'white' : '#374151' }}>{label}</Text>
    </TouchableOpacity>
);

export default function SchoolPortal() {
    const { width: screenWidth } = useWindowDimensions();
    const insets = useSafeAreaInsets();

    const [pdfs, setPdfs] = useState<PDF[]>([]);
    const [programs, setPrograms] = useState<Program[]>([]);
    const [structure, setStructure] = useState<{ classes: ClassItem[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [structureLoading, setStructureLoading] = useState(false);
    const [search, setSearch] = useState('');

    const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
    const [selectedClass, setSelectedClass] = useState<string | null>(null);
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

    // Bulk selection (mirrors web "Download ZIP")
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [downloadingZip, setDownloadingZip] = useState(false);

    // PDF viewer
    const [viewerPdf, setViewerPdf] = useState<PDF | null>(null);
    const [pdfToken, setPdfToken] = useState<string | null>(null);
    const [pdfPages, setPdfPages] = useState(0);
    const [pdfPage, setPdfPage] = useState(1);
    const [pdfLoading, setPdfLoading] = useState(false);

    const fetchAll = useCallback(async () => {
        try {
            const token = await SecureStore.getItemAsync('auth_token');
            const [pdfRes, catRes, favRes] = await Promise.all([
                pdfsApi.listPdfs({ per_page: 300, sort: '-created', status: 'approved' }),
                categoriesApi.listCategories(),
                token
                    ? fetch(`${API_URL}/api/favorites`, { headers: { Authorization: `Bearer ${token}` } })
                        .then(r => r.ok ? r.json() : { items: [] }).catch(() => ({ items: [] }))
                    : Promise.resolve({ items: [] }),
            ]);
            setPdfs(pdfRes.items ?? []);
            setPrograms((catRes.items ?? []).map((c: any) => ({
                id: c.id,
                name: c.categoryName ?? c.name ?? 'Program',
            })));
            const ids = new Set<string>((favRes.items ?? []).map((b: any) => b.pdfId ?? b.pdf_id));
            setBookmarkedIds(ids);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const loadStructure = async (programId: string) => {
        setStructureLoading(true);
        setStructure(null);
        try {
            const token = await SecureStore.getItemAsync('auth_token');
            const res = await fetch(`${API_URL}/api/programs/${programId}/structure`, {
                headers: { Authorization: `Bearer ${token ?? ''}` },
            });
            if (res.ok) setStructure(await res.json());
        } catch (e) { console.error(e); }
        finally { setStructureLoading(false); }
    };

    const selectProgram = (id: string | null) => {
        setSelectedProgram(id);
        setSelectedClass(null);
        setSelectedSubject(null);
        if (id) loadStructure(id);
        else setStructure(null);
    };

    const selectClass = (id: string | null) => {
        setSelectedClass(id);
        setSelectedSubject(null);
    };

    // Load token when viewer opens
    useEffect(() => {
        if (!viewerPdf) return;
        setPdfPages(0); setPdfPage(1); setPdfLoading(true);
        SecureStore.getItemAsync('auth_token').then(t => setPdfToken(t));
    }, [viewerPdf?.id]);

    const handleDownload = async (item: PDF) => {
        try {
            setDownloadingId(item.id);
            const token = await SecureStore.getItemAsync('auth_token');
            if (!token) { Alert.alert('Session expired', 'Please login again.'); return; }
            // Preserve the real extension: archives download as .zip/.rar/.7z, everything else .pdf.
            const baseName = item.fileName || item.id;
            const hasExt = /\.(pdf|zip|rar|7z)$/i.test(baseName);
            const fileUri = `${FileSystem.documentDirectory}${hasExt ? baseName : `${baseName}.${isZipItem(item) ? archiveExt(item) : 'pdf'}`}`;
            const { uri } = await FileSystem.downloadAsync(
                `${API_URL}/api/pdfs/${item.id}/download`,
                fileUri,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            await Linking.openURL(uri);
        } catch (e: any) {
            Alert.alert('Download failed', e?.message || 'Unable to download this PDF.');
        } finally { setDownloadingId(null); }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const exitSelectMode = () => { setSelectMode(false); setSelectedIds(new Set()); };

    const handleBulkDownload = async () => {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;
        try {
            setDownloadingZip(true);
            const token = await SecureStore.getItemAsync('auth_token');
            if (!token) { Alert.alert('Session expired', 'Please login again.'); return; }
            const archiveName = 'content-bundle.zip';
            const fileUri = `${FileSystem.documentDirectory}${archiveName}`;
            // Endpoint is POST with a JSON body, so stream the blob to a file manually.
            const res = await fetch(`${API_URL}/api/pdfs/bulk-download`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids, archiveName }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || 'Bulk download failed');
            }
            const blob = await res.blob();
            const base64: string = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(String(reader.result).split(',')[1] ?? '');
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
            await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
            await Linking.openURL(fileUri);
            Alert.alert('Download ready', `Bundled ${ids.length} file${ids.length !== 1 ? 's' : ''}.`);
            exitSelectMode();
        } catch (e: any) {
            Alert.alert('Download failed', e?.message || 'Could not create the archive.');
        } finally { setDownloadingZip(false); }
    };

    const toggleBookmark = async (item: PDF) => {
        const token = await SecureStore.getItemAsync('auth_token');
        if (!token) return;
        const isBookmarked = bookmarkedIds.has(item.id);
        const next = new Set(bookmarkedIds);
        if (isBookmarked) {
            next.delete(item.id);
            setBookmarkedIds(next);
            fetch(`${API_URL}/api/favorites/${item.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
        } else {
            next.add(item.id);
            setBookmarkedIds(next);
            fetch(`${API_URL}/api/favorites`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ pdf_id: item.id }),
            }).catch(() => {});
        }
    };

    const classes = structure?.classes ?? [];
    const subjects = selectedClass ? (classes.find(c => c.classId === selectedClass)?.subjects ?? []) : [];

    const filtered = pdfs
        .filter(p => !selectedProgram || p.categoryId === selectedProgram)
        .filter(p => !selectedClass || p.classId === selectedClass)
        .filter(p => !selectedSubject || p.subjectId === selectedSubject)
        .filter(p => !search || p.fileName?.toLowerCase().includes(search.toLowerCase()));

    const VIEWER_HEADER_H = insets.top + 64;

    const renderItem = ({ item }: { item: PDF }) => {
        const isSelected = selectedIds.has(item.id);
        return (
        <TouchableOpacity
            activeOpacity={selectMode ? 0.7 : 1}
            onPress={() => { if (selectMode) toggleSelect(item.id); }}
            style={{
                backgroundColor: isSelected ? '#eef2ff' : 'white', marginHorizontal: 16, marginBottom: 10,
                borderRadius: 16, padding: 14,
                borderWidth: isSelected ? 1.5 : 1, borderColor: isSelected ? BRAND : '#e5e7eb',
                flexDirection: 'row', alignItems: 'flex-start', gap: 12,
            }}
        >
            {selectMode && (
                <View style={{
                    width: 22, height: 22, borderRadius: 6, marginTop: 10,
                    borderWidth: 1.5, borderColor: isSelected ? BRAND : '#9ca3af',
                    backgroundColor: isSelected ? BRAND : 'transparent',
                    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                    {isSelected && <Ionicons name="checkmark" size={15} color="white" />}
                </View>
            )}
            <View style={{
                width: 40, height: 40, borderRadius: 12,
                backgroundColor: '#fff1f2', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: 2,
            }}>
                <Ionicons name={isZipItem(item) ? 'archive' : 'document-text'} size={20} color="#e11d48" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontWeight: '600', color: '#111827', lineHeight: 20 }} numberOfLines={2}>
                    {item.fileName}
                </Text>
                <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 3 }}>
                    {item.pdfId ?? ''}
                    {item.fileSize ? ` · ${formatBytes(item.fileSize)}` : ''}
                    {` · v${item.currentVersion ?? 1}`}
                </Text>
            </View>
            {!selectMode && (
            <View style={{ flexDirection: 'row', gap: 7, alignItems: 'center', flexShrink: 0 }}>
                <TouchableOpacity
                    onPress={() => toggleBookmark(item)}
                    style={{
                        width: 34, height: 34, borderRadius: 10,
                        backgroundColor: bookmarkedIds.has(item.id) ? '#fef3c7' : '#fafafa',
                        borderWidth: 1, borderColor: bookmarkedIds.has(item.id) ? '#fcd34d' : '#e5e7eb',
                        alignItems: 'center', justifyContent: 'center',
                    }}
                >
                    <Ionicons
                        name={bookmarkedIds.has(item.id) ? 'bookmark' : 'bookmark-outline'}
                        size={16}
                        color="#d97706"
                    />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => isZipItem(item) ? handleDownload(item) : setViewerPdf(item)}
                    style={{
                        width: 34, height: 34, borderRadius: 10,
                        backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe',
                        alignItems: 'center', justifyContent: 'center',
                    }}
                >
                    <Ionicons name={isZipItem(item) ? 'archive-outline' : 'eye-outline'} size={16} color="#2563eb" />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => handleDownload(item)}
                    disabled={downloadingId === item.id}
                    style={{
                        width: 34, height: 34, borderRadius: 10,
                        backgroundColor: '#eef2ff', borderWidth: 1, borderColor: '#c7d2fe',
                        alignItems: 'center', justifyContent: 'center',
                    }}
                >
                    {downloadingId === item.id
                        ? <ActivityIndicator size="small" color={BRAND} />
                        : <Ionicons name="download-outline" size={16} color={BRAND} />}
                </TouchableOpacity>
            </View>
            )}
        </TouchableOpacity>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
            {/* Sticky header */}
            <View style={{
                backgroundColor: 'white',
                paddingTop: insets.top + 12,
                paddingBottom: 12,
                paddingHorizontal: 16,
                borderBottomWidth: 1,
                borderBottomColor: '#e5e7eb',
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={{ fontSize: 22, fontWeight: '700', color: '#111827' }}>
                            Content Library
                        </Text>
                        <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2, lineHeight: 18 }}>
                            Browse, preview and download materials from your assigned programs.
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
                        style={{
                            flexDirection: 'row', alignItems: 'center', gap: 5,
                            paddingHorizontal: 12, height: 36, borderRadius: 10,
                            backgroundColor: selectMode ? BRAND : 'white',
                            borderWidth: 1, borderColor: selectMode ? BRAND : '#e5e7eb',
                        }}
                    >
                        <Ionicons
                            name={selectMode ? 'close' : 'checkbox-outline'}
                            size={15}
                            color={selectMode ? 'white' : '#374151'}
                        />
                        <Text style={{ fontSize: 12, fontWeight: '600', color: selectMode ? 'white' : '#374151' }}>
                            {selectMode ? 'Cancel' : 'Select'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Search */}
                <View style={{
                    flexDirection: 'row', alignItems: 'center',
                    backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 12, marginBottom: 10,
                }}>
                    <Ionicons name="search" size={15} color="#9ca3af" />
                    <TextInput
                        style={{ flex: 1, paddingVertical: 9, paddingHorizontal: 8, fontSize: 14, color: '#111827' }}
                        placeholder="Search PDFs..." placeholderTextColor="#9ca3af"
                        value={search} onChangeText={setSearch}
                    />
                    {search ? (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Ionicons name="close-circle" size={16} color="#9ca3af" />
                        </TouchableOpacity>
                    ) : null}
                </View>

                {/* Program filter */}
                {programs.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
                        <FilterChip label="All" active={!selectedProgram} onPress={() => selectProgram(null)} />
                        {programs.map(p => (
                            <FilterChip
                                key={p.id} label={p.name}
                                active={selectedProgram === p.id}
                                onPress={() => selectProgram(selectedProgram === p.id ? null : p.id)}
                            />
                        ))}
                    </ScrollView>
                )}

                {/* Class filter */}
                {selectedProgram && (
                    structureLoading ? (
                        <View style={{ paddingVertical: 6 }}>
                            <ActivityIndicator size="small" color={BRAND} />
                        </View>
                    ) : classes.length > 0 ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
                            {classes.map(cls => (
                                <FilterChip
                                    key={cls.classId} label={cls.className}
                                    active={selectedClass === cls.classId}
                                    color="#2563eb"
                                    onPress={() => selectClass(selectedClass === cls.classId ? null : cls.classId)}
                                />
                            ))}
                        </ScrollView>
                    ) : null
                )}

                {/* Subject filter */}
                {selectedClass && subjects.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {subjects.map(subj => (
                            <FilterChip
                                key={subj.subjectId} label={subj.subjectName}
                                active={selectedSubject === subj.subjectId}
                                color="#059669"
                                onPress={() => setSelectedSubject(selectedSubject === subj.subjectId ? null : subj.subjectId)}
                            />
                        ))}
                    </ScrollView>
                )}
            </View>

            {/* Results count / selection toolbar */}
            {!loading && (
                selectMode ? (
                    <View style={{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        marginHorizontal: 16, marginVertical: 8, padding: 10,
                        backgroundColor: '#eef2ff', borderRadius: 12, borderWidth: 1, borderColor: '#c7d2fe',
                    }}>
                        <Text style={{ fontSize: 13, color: '#374151', fontWeight: '500' }}>
                            {selectedIds.size} selected
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <TouchableOpacity
                                onPress={() => {
                                    const allSelected = filtered.length > 0 && filtered.every(p => selectedIds.has(p.id));
                                    setSelectedIds(allSelected ? new Set() : new Set(filtered.map(p => p.id)));
                                }}
                                style={{ paddingHorizontal: 12, height: 34, borderRadius: 9, backgroundColor: 'white', borderWidth: 1, borderColor: '#c7d2fe', justifyContent: 'center' }}
                            >
                                <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151' }}>
                                    {filtered.length > 0 && filtered.every(p => selectedIds.has(p.id)) ? 'Deselect all' : 'Select all'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleBulkDownload}
                                disabled={selectedIds.size === 0 || downloadingZip}
                                style={{
                                    flexDirection: 'row', alignItems: 'center', gap: 6,
                                    paddingHorizontal: 12, height: 34, borderRadius: 9,
                                    backgroundColor: (selectedIds.size === 0 || downloadingZip) ? '#a5b4fc' : BRAND,
                                    justifyContent: 'center',
                                }}
                            >
                                {downloadingZip
                                    ? <ActivityIndicator size="small" color="white" />
                                    : <Ionicons name="download-outline" size={15} color="white" />}
                                <Text style={{ fontSize: 12, fontWeight: '600', color: 'white' }}>ZIP</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
                        <Text style={{ fontSize: 12, color: '#6b7280' }}>
                            {filtered.length} {filtered.length === 1 ? 'document' : 'documents'}
                            {(selectedProgram || selectedClass || selectedSubject || search) ? ' (filtered)' : ''}
                        </Text>
                    </View>
                )
            )}

            {loading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color={BRAND} />
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingTop: 4, paddingBottom: 32 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); fetchAll(); }}
                            tintColor={BRAND}
                        />
                    }
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
                            <Ionicons name="library-outline" size={48} color="#d1d5db" />
                            <Text style={{ color: '#6b7280', marginTop: 12, fontSize: 14 }}>
                                {search || selectedProgram ? 'No matching content' : 'No content available'}
                            </Text>
                        </View>
                    }
                />
            )}

            {/* ── Full-screen PDF viewer modal ── */}
            <Modal
                visible={!!viewerPdf}
                animationType="slide"
                statusBarTranslucent
                onRequestClose={() => setViewerPdf(null)}
            >
                <View style={{ flex: 1, backgroundColor: '#111827' }}>
                    {/* Viewer header */}
                    <View style={{
                        paddingTop: insets.top + 10,
                        paddingBottom: 10,
                        paddingHorizontal: 12,
                        backgroundColor: '#1f2937',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                    }}>
                        <TouchableOpacity
                            onPress={() => setViewerPdf(null)}
                            style={{
                                width: 36, height: 36, borderRadius: 10,
                                backgroundColor: '#374151',
                                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}
                        >
                            <Ionicons name="close" size={20} color="white" />
                        </TouchableOpacity>

                        <Text style={{ color: 'white', flex: 1, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                            {viewerPdf?.fileName}
                        </Text>

                        {pdfPages > 0 && (
                            <View style={{
                                backgroundColor: '#374151', paddingHorizontal: 10, paddingVertical: 4,
                                borderRadius: 20, flexShrink: 0,
                            }}>
                                <Text style={{ color: '#d1d5db', fontSize: 11, fontWeight: '600' }}>
                                    {pdfPage} / {pdfPages}
                                </Text>
                            </View>
                        )}

                        <TouchableOpacity
                            onPress={() => viewerPdf && handleDownload(viewerPdf)}
                            style={{
                                width: 36, height: 36, borderRadius: 10,
                                backgroundColor: '#374151',
                                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}
                        >
                            <Ionicons name="download-outline" size={18} color="#93c5fd" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => viewerPdf && toggleBookmark(viewerPdf)}
                            style={{
                                width: 36, height: 36, borderRadius: 10,
                                backgroundColor: '#374151',
                                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}
                        >
                            <Ionicons
                                name={viewerPdf && bookmarkedIds.has(viewerPdf.id) ? 'bookmark' : 'bookmark-outline'}
                                size={18}
                                color="#fcd34d"
                            />
                        </TouchableOpacity>
                    </View>

                    {/* PDF + watermark */}
                    {pdfToken && viewerPdf ? (
                        <View style={{ flex: 1 }}>
                            <Pdf
                                trustAllCerts={false}
                                source={{
                                    uri: `${API_URL}/api/pdfs/${viewerPdf.id}/preview`,
                                    headers: { Authorization: `Bearer ${pdfToken}` },
                                    cache: true,
                                }}
                                style={{ flex: 1, width: screenWidth, backgroundColor: '#111827' }}
                                fitPolicy={0}
                                horizontal={false}
                                enablePaging={false}
                                onLoadComplete={(pages) => { setPdfPages(pages); setPdfLoading(false); }}
                                onPageChanged={(page) => setPdfPage(page)}
                                onError={() => {
                                    setPdfLoading(false);
                                    Alert.alert(
                                        'Preview unavailable',
                                        'This PDF could not be shown in the in-app viewer. Open it externally instead?',
                                        [
                                            { text: 'Cancel', style: 'cancel' },
                                            {
                                                text: 'Open externally',
                                                onPress: () => { const v = viewerPdf; setViewerPdf(null); if (v) handleDownload(v); },
                                            },
                                        ],
                                    );
                                }}
                            />
                            {/* Watermark overlay — no pointer events so scroll still works */}
                            <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
                                {[15, 32, 49, 66, 83].map((pct, i) => (
                                    <View
                                        key={i}
                                        style={{
                                            position: 'absolute',
                                            top: `${pct}%` as any,
                                            left: 0, right: 0,
                                            alignItems: 'center',
                                        }}
                                    >
                                        <Text style={{
                                            color: 'rgba(255,255,255,0.055)',
                                            fontSize: 20,
                                            fontWeight: '800',
                                            letterSpacing: 5,
                                            textTransform: 'uppercase',
                                            transform: [{ rotate: '-28deg' }],
                                        }}>
                                            iicon academy
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    ) : (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                            <ActivityIndicator size="large" color={BRAND} />
                            <Text style={{ color: '#9ca3af', marginTop: 12, fontSize: 14 }}>Preparing PDF…</Text>
                        </View>
                    )}

                    {/* Loading overlay while PDF initialises */}
                    {pdfLoading && (
                        <View style={{
                            ...StyleSheet.absoluteFillObject,
                            top: VIEWER_HEADER_H,
                            backgroundColor: '#111827',
                            alignItems: 'center', justifyContent: 'center',
                        }}>
                            <ActivityIndicator size="large" color={BRAND} />
                            <Text style={{ color: '#9ca3af', marginTop: 12, fontSize: 14 }}>Loading PDF…</Text>
                        </View>
                    )}
                </View>
            </Modal>
        </View>
    );
}
