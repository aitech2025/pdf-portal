import { useCallback, useEffect, useState } from 'react';
import {
    View, Text, ScrollView, RefreshControl, ActivityIndicator,
    TouchableOpacity, Alert, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';
import { apiFetch } from '../../src/lib/apiClient';

/* Design tokens mirrored from apps/web (index.css / tailwind.config.js) */
const API_URL = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:8000';
const BRAND = '#5b5ff1';
const BG = '#fbfcff';
const FG = '#111827';
const MUTED_FG = '#6b7280';
const CARD_BORDER = '#eef0f3';

const SOFT_SM = {
    shadowColor: '#111a2e', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
};

const METRIC_TILES = [
    { key: 'totalDownloads', label: 'Total Downloads', icon: 'download', color: BRAND, bg: '#eef2ff' },
    { key: 'totalSchools', label: 'Active Schools', icon: 'business', color: '#2563eb', bg: '#dbeafe' },
    { key: 'totalUsers', label: 'Total Users', icon: 'people', color: '#8b5cf6', bg: '#ede9fe' },
    { key: 'totalPdfs', label: 'Content Library', icon: 'document-text', color: '#059669', bg: '#d1fae5' },
] as const;

const RANGES = [
    { label: '7 Days', value: 7 },
    { label: '30 Days', value: 30 },
    { label: '90 Days', value: 90 },
    { label: '1 Year', value: 365 },
];

const formatDate = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

interface Stats { totalPdfs: number; totalDownloads: number; totalSchools: number; totalUsers: number; }
interface Point { name: string; count: number; }

export default function AnalyticsScreen() {
    const insets = useSafeAreaInsets();
    const [days, setDays] = useState(7);
    const [stats, setStats] = useState<Stats | null>(null);
    const [downloadData, setDownloadData] = useState<Point[]>([]);
    const [categoryData, setCategoryData] = useState<Point[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async (numDays: number) => {
        try {
            const [dashboard, timeseries] = await Promise.all([
                apiFetch('/api/dashboard').catch(() => null),
                apiFetch(`/api/analytics/timeseries?days=${numDays}`).catch(() => null),
            ]);
            setStats({
                totalPdfs: dashboard?.pdf_count ?? 0,
                totalDownloads: dashboard?.total_downloads ?? 0,
                totalSchools: dashboard?.active_school_count ?? dashboard?.school_count ?? 0,
                totalUsers: dashboard?.user_count ?? 0,
            });
            setDownloadData((timeseries?.downloads_per_day ?? []).map((d: any) => ({ name: formatDate(d.date), count: d.count })));
            setCategoryData((timeseries?.top_categories ?? []).map((c: any) => ({ name: c.category_name, count: c.count })));
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { fetchData(days); }, [fetchData, days]);

    const [exporting, setExporting] = useState(false);
    const handleExport = async () => {
        try {
            setExporting(true);
            const token = await SecureStore.getItemAsync('auth_token');
            if (!token) { Alert.alert('Session expired', 'Please login again.'); return; }
            const fileUri = `${FileSystem.documentDirectory}audit-logs-${Date.now()}.csv`;
            const { uri } = await FileSystem.downloadAsync(
                `${API_URL}/api/auditLogs/export`,
                fileUri,
                { headers: { Authorization: `Bearer ${token}` } },
            );
            await Linking.openURL(uri);
        } catch (e: any) {
            Alert.alert('Export failed', e?.message || 'Unable to export audit log.');
        } finally { setExporting(false); }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG }}>
                <ActivityIndicator size="large" color={BRAND} />
            </View>
        );
    }

    const maxDownload = Math.max(1, ...downloadData.map(d => d.count));
    const maxCategory = Math.max(1, ...categoryData.map(d => d.count));

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: BG }}
            contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: insets.bottom + 24, gap: 20 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(days); }} tintColor={BRAND} />}
            showsVerticalScrollIndicator={false}
        >
            {/* Header */}
            <View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: BRAND, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>
                    Insights
                </Text>
                <Text style={{ fontSize: 26, fontWeight: '700', color: FG }}>Advanced Analytics</Text>
                <Text style={{ fontSize: 14, color: MUTED_FG, marginTop: 4, lineHeight: 20 }}>
                    Comprehensive insights into platform usage and engagement.
                </Text>
            </View>

            {/* Range selector */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {RANGES.map(r => {
                    const active = r.value === days;
                    return (
                        <TouchableOpacity
                            key={r.value}
                            onPress={() => setDays(r.value)}
                            activeOpacity={0.8}
                            style={{
                                paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                                backgroundColor: active ? BRAND : 'white',
                                borderWidth: 1, borderColor: active ? BRAND : CARD_BORDER,
                            }}
                        >
                            <Text style={{ fontSize: 13, fontWeight: '600', color: active ? 'white' : MUTED_FG }}>{r.label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Export */}
            <TouchableOpacity
                onPress={handleExport}
                activeOpacity={0.85}
                disabled={exporting}
                style={{
                    backgroundColor: exporting ? BRAND + '99' : BRAND, borderRadius: 12, height: 46,
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
            >
                {exporting ? <ActivityIndicator color="white" /> : (
                    <>
                        <Ionicons name="download-outline" size={18} color="white" />
                        <Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>Export Audit Log</Text>
                    </>
                )}
            </TouchableOpacity>

            {/* Metric tiles */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {METRIC_TILES.map(tile => (
                    <View key={tile.key} style={{ width: '47.5%', flexGrow: 1, backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: CARD_BORDER, padding: 16, ...SOFT_SM }}>
                        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: tile.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                            <Ionicons name={tile.icon as any} size={22} color={tile.color} />
                        </View>
                        <Text style={{ fontSize: 26, fontWeight: '700', color: FG, lineHeight: 30 }}>
                            {(stats?.[tile.key as keyof Stats] ?? 0).toLocaleString()}
                        </Text>
                        <Text style={{ fontSize: 13, fontWeight: '500', color: MUTED_FG, marginTop: 6 }}>{tile.label}</Text>
                    </View>
                ))}
            </View>

            {/* Download Trends */}
            <View style={{ backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: CARD_BORDER, padding: 16, ...SOFT_SM }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <Ionicons name="trending-up-outline" size={18} color={BRAND} />
                    <Text style={{ fontSize: 16, fontWeight: '700', color: FG }}>Download Trends</Text>
                </View>
                {downloadData.length === 0 ? (
                    <Text style={{ fontSize: 13, color: MUTED_FG, textAlign: 'center', paddingVertical: 24 }}>
                        No download data for this period
                    </Text>
                ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 140, gap: 3 }}>
                        {downloadData.slice(-14).map((d, i) => (
                            <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                                <Text style={{ fontSize: 9, color: MUTED_FG }}>{d.count > 0 ? d.count : ''}</Text>
                                <View style={{
                                    width: '70%', height: Math.max(2, (d.count / maxDownload) * 96),
                                    backgroundColor: BRAND, borderRadius: 3,
                                }} />
                                <Text style={{ fontSize: 8, color: MUTED_FG }} numberOfLines={1}>{d.name}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>

            {/* Category Performance */}
            <View style={{ backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: CARD_BORDER, padding: 16, ...SOFT_SM }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <Ionicons name="bar-chart-outline" size={18} color={BRAND} />
                    <Text style={{ fontSize: 16, fontWeight: '700', color: FG }}>Category Performance</Text>
                </View>
                {categoryData.length === 0 ? (
                    <Text style={{ fontSize: 13, color: MUTED_FG, textAlign: 'center', paddingVertical: 24 }}>
                        No download data for this period
                    </Text>
                ) : (
                    <View style={{ gap: 12 }}>
                        {categoryData.map((c, i) => (
                            <View key={i} style={{ gap: 6 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Text style={{ fontSize: 14, fontWeight: '500', color: FG, flex: 1, paddingRight: 8 }} numberOfLines={1}>{c.name}</Text>
                                    <Text style={{ fontSize: 14, color: MUTED_FG }}>{c.count}</Text>
                                </View>
                                <View style={{ height: 8, backgroundColor: '#eef0f3', borderRadius: 4, overflow: 'hidden' }}>
                                    <View style={{ height: '100%', width: `${(c.count / maxCategory) * 100}%`, backgroundColor: BRAND, borderRadius: 4 }} />
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </View>
        </ScrollView>
    );
}
