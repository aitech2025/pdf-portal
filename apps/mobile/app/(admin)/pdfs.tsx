import { useEffect, useState } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, TextInput,
    RefreshControl, ActivityIndicator, Linking, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pdfsApi } from '@shared/api/index.js';
import { formatBytes } from '@shared/utils/format.js';
import Constants from 'expo-constants';

/* Design tokens mirrored from apps/web (index.css / tailwind.config.js) */
const API_URL = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:8000';
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

interface PDF {
    id: string;
    fileName: string;
    pdfId?: string;
    fileSize?: number;
    status: string;
    currentVersion: number;
    categoryId?: string;
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: string }> = {
    pending: { bg: '#fef3c7', text: '#d97706', icon: 'time-outline' },
    approved: { bg: '#d1fae5', text: '#059669', icon: 'checkmark-circle-outline' },
    rejected: { bg: '#fee2e2', text: '#dc2626', icon: 'close-circle-outline' },
};

function StatusBadge({ status }: { status: string }) {
    const s = STATUS_STYLES[status] ?? { bg: '#f3f4f6', text: MUTED_FG, icon: 'ellipse-outline' };
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: s.bg }}>
            <Ionicons name={s.icon as any} size={10} color={s.text} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: s.text, textTransform: 'capitalize' }}>{status}</Text>
        </View>
    );
}

export default function PDFsScreen() {
    const insets = useSafeAreaInsets();
    const [pdfs, setPdfs] = useState<PDF[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

    const fetchPdfs = async () => {
        try {
            const res = await pdfsApi.listPdfs({ per_page: 100, sort: '-created' });
            setPdfs(res.items ?? []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { fetchPdfs(); }, []);

    const handleApprove = (pdf: PDF) => {
        Alert.alert('Approve PDF', `Approve "${pdf.fileName}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Approve',
                onPress: async () => {
                    setActionLoading(p => ({ ...p, [pdf.id]: true }));
                    try {
                        await pdfsApi.approvePdf(pdf.id);
                        setPdfs(prev => prev.map(p => p.id === pdf.id ? { ...p, status: 'approved' } : p));
                    } catch (e: any) { Alert.alert('Error', e.message); }
                    finally { setActionLoading(p => ({ ...p, [pdf.id]: false })); }
                },
            },
        ]);
    };

    const handleReject = (pdf: PDF) => {
        Alert.alert('Reject PDF', `Reject "${pdf.fileName}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Reject', style: 'destructive',
                onPress: async () => {
                    setActionLoading(p => ({ ...p, [pdf.id]: true }));
                    try {
                        await pdfsApi.rejectPdf(pdf.id, 'Rejected by admin');
                        setPdfs(prev => prev.map(p => p.id === pdf.id ? { ...p, status: 'rejected' } : p));
                    } catch (e: any) { Alert.alert('Error', e.message); }
                    finally { setActionLoading(p => ({ ...p, [pdf.id]: false })); }
                },
            },
        ]);
    };

    const filtered = pdfs
        .filter(p => filterStatus === 'all' || p.status === filterStatus)
        .filter(p => !search || p.fileName?.toLowerCase().includes(search.toLowerCase()));

    const pendingCount = pdfs.filter(p => p.status === 'pending').length;

    const renderItem = ({ item }: { item: PDF }) => (
        <View style={[{ backgroundColor: 'white', marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: CARD_BORDER }, SOFT_SM]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: ROSE + '1a', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                    <Ionicons name="document-text" size={20} color={ROSE} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: FG }} numberOfLines={2}>{item.fileName}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <StatusBadge status={item.status} />
                        {item.fileSize ? <Text style={{ fontSize: 12, color: MUTED_FG }}>{formatBytes(item.fileSize)}</Text> : null}
                        <Text style={{ fontSize: 12, color: MUTED_FG }}>v{item.currentVersion ?? 1}</Text>
                    </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                    {item.status === 'pending' && !actionLoading[item.id] && (
                        <>
                            <TouchableOpacity
                                style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#d1fae5', alignItems: 'center', justifyContent: 'center' }}
                                onPress={() => handleApprove(item)}
                            >
                                <Ionicons name="checkmark" size={18} color="#059669" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' }}
                                onPress={() => handleReject(item)}
                            >
                                <Ionicons name="close" size={18} color="#dc2626" />
                            </TouchableOpacity>
                        </>
                    )}
                    {actionLoading[item.id] && (
                        <View style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
                            <ActivityIndicator size="small" color={BRAND} />
                        </View>
                    )}
                    <TouchableOpacity
                        style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: BRAND + '1a', alignItems: 'center', justifyContent: 'center' }}
                        onPress={() => Linking.openURL(`${API_URL}/api/pdfs/${item.id}/download`)}
                    >
                        <Ionicons name="download-outline" size={18} color={BRAND} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: BG }}>
            <View style={{ backgroundColor: 'white', paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: BORDER }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <View>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: BRAND, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>Content Management</Text>
                        <Text style={{ fontSize: 24, fontWeight: '700', color: FG }}>Content Library</Text>
                    </View>
                    {pendingCount > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fef3c7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#f59e0b' }} />
                            <Text style={{ fontSize: 12, color: '#b45309', fontWeight: '600' }}>{pendingCount} pending</Text>
                        </View>
                    )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 12, marginBottom: 12 }}>
                    <Ionicons name="search" size={16} color="#9ca3af" />
                    <TextInput
                        style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8, color: FG, fontSize: 14 }}
                        placeholder="Search PDFs..."
                        placeholderTextColor="#9ca3af"
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
                {/* Filter tabs */}
                <View style={{ flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 12, padding: 4 }}>
                    {(['all', 'pending', 'approved', 'rejected'] as FilterStatus[]).map(f => {
                        const active = filterStatus === f;
                        return (
                            <TouchableOpacity
                                key={f}
                                style={[{ flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center' }, active && { backgroundColor: 'white', ...SOFT_SM }]}
                                onPress={() => setFilterStatus(f)}
                            >
                                <Text style={{ fontSize: 12, fontWeight: '600', textTransform: 'capitalize', color: active ? FG : MUTED_FG }}>{f}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {loading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color={BRAND} />
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 24 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPdfs(); }} tintColor={BRAND} />}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
                            <Ionicons name="document-text-outline" size={48} color="#d1d5db" />
                            <Text style={{ color: FG, fontWeight: '600', marginTop: 12 }}>No PDFs found</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}
