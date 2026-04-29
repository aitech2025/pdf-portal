import { useEffect, useState } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, TextInput,
    RefreshControl, ActivityIndicator, Linking, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { pdfsApi } from '@shared/api/index.js';
import { formatBytes } from '@shared/utils/format.js';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:8001';

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
    const s = STATUS_STYLES[status] ?? { bg: '#f3f4f6', text: '#6b7280', icon: 'ellipse-outline' };
    return (
        <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full" style={{ backgroundColor: s.bg }}>
            <Ionicons name={s.icon as any} size={10} color={s.text} />
            <Text className="text-xs font-semibold capitalize" style={{ color: s.text }}>{status}</Text>
        </View>
    );
}

export default function PDFsScreen() {
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
        <View className="bg-white mx-4 mb-3 rounded-2xl p-4 border border-border">
            <View className="flex-row items-start gap-3">
                <View className="w-10 h-10 rounded-xl bg-rose-100 items-center justify-center mt-0.5 shrink-0">
                    <Ionicons name="document-text" size={20} color="#e11d48" />
                </View>
                <View className="flex-1 min-w-0">
                    <Text className="font-semibold text-foreground" numberOfLines={2}>{item.fileName}</Text>
                    <View className="flex-row flex-wrap items-center gap-2 mt-1.5">
                        <StatusBadge status={item.status} />
                        {item.fileSize ? <Text className="text-xs text-muted">{formatBytes(item.fileSize)}</Text> : null}
                        <Text className="text-xs text-muted">v{item.currentVersion ?? 1}</Text>
                    </View>
                </View>
                <View className="flex-row gap-1.5">
                    {item.status === 'pending' && !actionLoading[item.id] && (
                        <>
                            <TouchableOpacity
                                className="w-9 h-9 rounded-xl bg-emerald-100 items-center justify-center"
                                onPress={() => handleApprove(item)}
                            >
                                <Ionicons name="checkmark" size={18} color="#059669" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="w-9 h-9 rounded-xl bg-red-100 items-center justify-center"
                                onPress={() => handleReject(item)}
                            >
                                <Ionicons name="close" size={18} color="#dc2626" />
                            </TouchableOpacity>
                        </>
                    )}
                    {actionLoading[item.id] && (
                        <ActivityIndicator size="small" color="#4f46e5" />
                    )}
                    <TouchableOpacity
                        className="w-9 h-9 rounded-xl bg-primary/10 items-center justify-center"
                        onPress={() => Linking.openURL(`${API_URL}/api/pdfs/${item.id}/download`)}
                    >
                        <Ionicons name="download-outline" size={18} color="#4f46e5" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <View className="flex-1 bg-background">
            <View className="bg-white px-5 pt-14 pb-4 border-b border-border">
                <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-2xl font-bold text-foreground">Content Library</Text>
                    {pendingCount > 0 && (
                        <View className="flex-row items-center gap-1.5 bg-amber-100 px-3 py-1.5 rounded-xl">
                            <View className="w-2 h-2 rounded-full bg-amber-500" />
                            <Text className="text-xs text-amber-700 font-semibold">{pendingCount} pending</Text>
                        </View>
                    )}
                </View>
                <View className="flex-row items-center bg-gray-100 rounded-xl px-3 mb-3">
                    <Ionicons name="search" size={16} color="#9ca3af" />
                    <TextInput
                        className="flex-1 py-2.5 px-2 text-foreground text-sm"
                        placeholder="Search PDFs..."
                        placeholderTextColor="#9ca3af"
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
                {/* Filter tabs */}
                <View className="flex-row bg-gray-100 rounded-xl p-1">
                    {(['all', 'pending', 'approved', 'rejected'] as FilterStatus[]).map(f => (
                        <TouchableOpacity
                            key={f}
                            className={`flex-1 py-1.5 rounded-lg items-center ${filterStatus === f ? 'bg-white shadow-sm' : ''}`}
                            onPress={() => setFilterStatus(f)}
                        >
                            <Text className={`text-xs font-semibold capitalize ${filterStatus === f ? 'text-foreground' : 'text-muted'}`}>{f}</Text>
                        </TouchableOpacity>
                    ))}
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
                            <Ionicons name="document-text-outline" size={48} color="#d1d5db" />
                            <Text className="text-foreground font-medium mt-3">No PDFs found</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}
