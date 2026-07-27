import { useEffect, useState, useCallback } from 'react';
import {
    View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity,
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
const BORDER = '#e8ebf0';
const SUCCESS = '#22c55e';
const ACCENT = '#8b5cf6';
const ROSE = '#f43f5e';
const RADIUS_LG = 16;
const SOFT_SM = {
    shadowColor: '#111a2e', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
};
const CHART_COLORS = [BRAND, ACCENT, SUCCESS, '#f59e0b', ROSE, '#0ea5e9'];

interface PdfRow {
    id?: string; fileName?: string; file_name?: string;
    className?: string; class_name?: string;
    subjectName?: string; subject_name?: string;
    fileSize?: number; file_size?: number;
    lastViewed?: string; last_viewed?: string;
}
interface SchoolAnalytics {
    available_pdfs?: number; new_pdfs_last_7d?: number;
    downloads_last_30d?: number; my_downloads?: number;
    recent_uploads?: PdfRow[]; recently_viewed?: PdfRow[];
    downloads_by_category?: { category_name?: string; count: number }[];
}

function formatBytes(bytes?: number) {
    if (!bytes) return '—';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const Card = ({ children, style }: { children: React.ReactNode; style?: any }) => (
    <View style={[{
        backgroundColor: 'white', borderRadius: RADIUS_LG,
        borderWidth: 1, borderColor: CARD_BORDER, padding: 16,
    }, SOFT_SM, style]}>
        {children}
    </View>
);

export default function SchoolAnalyticsScreen() {
    const insets = useSafeAreaInsets();
    const [data, setData] = useState<SchoolAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStats = useCallback(async () => {
        try {
            const res: any = await apiFetch('/api/analytics/school');
            setData(res);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    if (loading) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG }}>
                <ActivityIndicator size="large" color={BRAND} />
            </View>
        );
    }

    const recentUploads = data?.recent_uploads ?? [];
    const recentlyViewed = data?.recently_viewed ?? [];
    const categoryData = (data?.downloads_by_category ?? []).filter(d => d.count > 0);
    const maxDl = Math.max(...categoryData.map(d => d.count), 1);

    const metrics = [
        { title: 'PDFs Available', value: data?.available_pdfs ?? 0, sub: data?.new_pdfs_last_7d ? `+${data.new_pdfs_last_7d} this week` : null, icon: 'document-text-outline', color: BRAND },
        { title: 'Downloads (30 days)', value: data?.downloads_last_30d ?? 0, sub: null, icon: 'download-outline', color: SUCCESS },
        { title: 'My Downloads', value: data?.my_downloads ?? 0, sub: null, icon: 'people-outline', color: ACCENT },
    ] as const;

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: BG }}
            contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: insets.bottom + 24, gap: 20 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats(); }} tintColor={BRAND} />}
            showsVerticalScrollIndicator={false}
        >
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: BRAND, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>
                        School portal
                    </Text>
                    <Text style={{ fontSize: 26, fontWeight: '700', color: FG }}>Analytics</Text>
                    <Text style={{ fontSize: 14, color: MUTED_FG, marginTop: 4, lineHeight: 20 }}>
                        Resource utilization and engagement insights for your institution.
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={() => { setRefreshing(true); fetchStats(); }}
                    style={{ width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: BORDER, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' }}
                >
                    <Ionicons name="refresh" size={18} color={FG} />
                </TouchableOpacity>
            </View>

            {/* Metric cards */}
            <View style={{ gap: 12 }}>
                {metrics.map(m => (
                    <Card key={m.title}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: m.color + '1a', alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name={m.icon as any} size={24} color={m.color} />
                            </View>
                            {m.sub ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: SUCCESS + '1a', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 }}>
                                    <Ionicons name="arrow-up-outline" size={12} color={SUCCESS} style={{ transform: [{ rotate: '45deg' }] }} />
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: SUCCESS }}>{m.sub}</Text>
                                </View>
                            ) : null}
                        </View>
                        <Text style={{ fontSize: 30, fontWeight: '700', color: FG, marginTop: 12 }}>{m.value}</Text>
                        <Text style={{ fontSize: 13, fontWeight: '500', color: MUTED_FG, marginTop: 2 }}>{m.title}</Text>
                    </Card>
                ))}
            </View>

            {/* Recently Added Content */}
            <Card>
                <Text style={{ fontSize: 16, fontWeight: '700', color: FG }}>Recently Added Content</Text>
                <Text style={{ fontSize: 13, color: MUTED_FG, marginTop: 2, marginBottom: 14 }}>Latest PDFs available to your institution</Text>
                {recentUploads.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 28 }}>
                        <Ionicons name="document-text-outline" size={40} color="#d1d5db" style={{ marginBottom: 8 }} />
                        <Text style={{ fontSize: 13, fontWeight: '600', color: MUTED_FG }}>No content available yet.</Text>
                    </View>
                ) : (
                    <View style={{ gap: 8 }}>
                        {recentUploads.map((pdf, idx) => (
                            <View key={pdf.id ?? idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
                                <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: ROSE + '1a', alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons name="document-text" size={15} color={ROSE} />
                                </View>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '500', color: FG }} numberOfLines={1}>
                                        {pdf.fileName ?? pdf.file_name ?? '—'}
                                    </Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                                        {(pdf.className ?? pdf.class_name) ? (
                                            <Text style={{ fontSize: 12, color: MUTED_FG }}>{pdf.className ?? pdf.class_name}</Text>
                                        ) : null}
                                        {(pdf.subjectName ?? pdf.subject_name) ? (
                                            <Text style={{ fontSize: 12, color: BRAND }}>{pdf.subjectName ?? pdf.subject_name}</Text>
                                        ) : null}
                                    </View>
                                </View>
                                <Text style={{ fontSize: 12, color: MUTED_FG }}>{formatBytes(pdf.fileSize ?? pdf.file_size)}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </Card>

            {/* Downloads by Program */}
            <Card>
                <Text style={{ fontSize: 16, fontWeight: '700', color: FG }}>Downloads by Program</Text>
                <Text style={{ fontSize: 13, color: MUTED_FG, marginTop: 2, marginBottom: 14 }}>Distribution of your school's downloads</Text>
                {categoryData.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 28 }}>
                        <Ionicons name="alert-circle-outline" size={40} color="#d1d5db" style={{ marginBottom: 8 }} />
                        <Text style={{ fontSize: 13, fontWeight: '600', color: MUTED_FG }}>No download activity yet.</Text>
                        <Text style={{ fontSize: 12, color: MUTED_FG, marginTop: 2, textAlign: 'center' }}>
                            Downloads will appear here once your users access content.
                        </Text>
                    </View>
                ) : (
                    <View style={{ gap: 12 }}>
                        {categoryData.map((d, idx) => (
                            <View key={(d.category_name ?? '') + idx} style={{ gap: 6 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Text style={{ fontSize: 14, fontWeight: '500', color: FG, flex: 1, paddingRight: 8 }} numberOfLines={1}>
                                        {d.category_name || 'Unknown'}
                                    </Text>
                                    <Text style={{ fontSize: 14, color: MUTED_FG }}>{d.count}</Text>
                                </View>
                                <View style={{ height: 8, backgroundColor: '#eef0f3', borderRadius: 4, overflow: 'hidden' }}>
                                    <View style={{ height: '100%', width: `${(d.count / maxDl) * 100}%`, backgroundColor: CHART_COLORS[idx % CHART_COLORS.length], borderRadius: 4 }} />
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </Card>

            {/* Recently Viewed */}
            {recentlyViewed.length > 0 && (
                <Card>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: FG }}>Recently Viewed</Text>
                    <Text style={{ fontSize: 13, color: MUTED_FG, marginTop: 2, marginBottom: 14 }}>PDFs you've opened recently</Text>
                    <View style={{ gap: 8 }}>
                        {recentlyViewed.map((pdf, idx) => (
                            <View key={pdf.id ?? idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
                                <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: BRAND + '1a', alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons name="eye-outline" size={15} color={BRAND} />
                                </View>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '500', color: FG }} numberOfLines={1}>
                                        {pdf.fileName ?? pdf.file_name ?? '—'}
                                    </Text>
                                    {(pdf.lastViewed ?? pdf.last_viewed) ? (
                                        <Text style={{ fontSize: 12, color: MUTED_FG, marginTop: 2 }}>
                                            {new Date(pdf.lastViewed ?? pdf.last_viewed ?? '').toLocaleDateString()}
                                        </Text>
                                    ) : null}
                                </View>
                                {(pdf.className ?? pdf.class_name) ? (
                                    <Text style={{ fontSize: 12, color: MUTED_FG }}>{pdf.className ?? pdf.class_name}</Text>
                                ) : null}
                            </View>
                        ))}
                    </View>
                </Card>
            )}
        </ScrollView>
    );
}
