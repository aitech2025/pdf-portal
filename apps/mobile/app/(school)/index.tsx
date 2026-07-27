import { useCallback, useEffect, useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, RefreshControl,
    ActivityIndicator, Linking, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuth } from '../../src/context/AuthContext';
import { apiFetch } from '../../src/lib/apiClient';
import { PressableScale, FadeInUp, Skeleton, SkeletonCard } from '../../src/components/motion';

/* Design tokens mirrored from apps/web (index.css / tailwind.config.js) */
const API_URL = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:8000';
const BRAND = '#5b5ff1';            // --primary
const BG = '#fbfcff';               // --background
const FG = '#111827';               // --foreground
const MUTED_FG = '#6b7280';         // --muted-foreground
const BORDER = '#e8ebf0';           // border/60
const CARD_BORDER = '#eef0f3';
const SUCCESS = '#22c55e';          // --success
const WARNING = '#f59e0b';          // --warning
const ACCENT = '#8b5cf6';           // --accent
const ROSE = '#f43f5e';
const RADIUS_LG = 16;

const SOFT_SM = {
    shadowColor: '#111a2e', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
};

interface Pdf {
    id: string; fileName?: string; fileSize?: number; created?: string;
    categoryName?: string; subCategoryName?: string; pdfId?: string; pdf_id?: string;
}
interface CategoryItem {
    id?: string; categoryId?: string; categoryName?: string; categoryType?: string;
}
interface Notif { id: string; read?: boolean; subject?: string; title?: string; message?: string; }
interface SchoolStats {
    assigned_categories?: number; available_pdfs?: number; my_downloads?: number;
    new_pdfs_last_7d?: number; recent_uploads?: Pdf[];
    downloads_by_category?: { category_id?: string; categoryId?: string; category_name?: string; categoryName?: string; count: number }[];
}

const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const getPdfCode = (pdf: Pdf) => {
    const code = pdf.pdfId ?? pdf.pdf_id ?? null;
    return code && String(code).trim() ? String(code) : 'PDF';
};

/* ---- small building blocks ---- */

const Card = ({ children, style }: { children: React.ReactNode; style?: any }) => (
    <View style={[{
        backgroundColor: 'white', borderRadius: RADIUS_LG,
        borderWidth: 1, borderColor: CARD_BORDER, padding: 16,
    }, SOFT_SM, style]}>
        {children}
    </View>
);

const Badge = ({ label, bg, fg, mono }: { label: string; bg: string; fg: string; mono?: boolean }) => (
    <View style={{ backgroundColor: bg, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
        <Text style={{ fontSize: 10, fontWeight: '600', color: fg, fontFamily: mono ? 'monospace' : undefined }}>
            {label}
        </Text>
    </View>
);

export default function SchoolDashboard() {
    const { user } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [stats, setStats] = useState<SchoolStats | null>(null);
    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [notifications, setNotifications] = useState<Notif[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    const schoolId = user?.schoolId;

    const fetchData = useCallback(async () => {
        try {
            const [analytics, catsRes, notifRes] = await Promise.all([
                apiFetch('/api/analytics/school').catch(() => null),
                schoolId
                    ? apiFetch(`/api/schools/${schoolId}/categories`).catch(() => ({ items: [] }))
                    : Promise.resolve({ items: [] }),
                apiFetch('/api/notifications?per_page=5&sort=-created').catch(() => ({ items: [] })),
            ]);
            setStats(analytics);
            setCategories(catsRes?.items ?? []);
            setNotifications(notifRes?.items ?? []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    }, [schoolId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleDownload = async (pdf: Pdf) => {
        try {
            setDownloadingId(pdf.id);
            const token = await SecureStore.getItemAsync('auth_token');
            if (!token) { Alert.alert('Session expired', 'Please login again.'); return; }
            const fileUri = `${FileSystem.documentDirectory}${pdf.fileName || pdf.id}.pdf`;
            const { uri } = await FileSystem.downloadAsync(
                `${API_URL}/api/pdfs/${pdf.id}/download`,
                fileUri,
                { headers: { Authorization: `Bearer ${token}` } },
            );
            await Linking.openURL(uri);
        } catch (e: any) {
            Alert.alert('Download failed', e?.message || 'Unable to download this PDF.');
        } finally { setDownloadingId(null); }
    };

    const recentUploads = stats?.recent_uploads ?? [];
    const downloadsByCategory = stats?.downloads_by_category ?? [];
    const unreadCount = notifications.filter((n) => !n.read).length;
    const firstName = user?.name ? user.name.split(' ')[0] : '';

    const kpis = [
        { title: 'Assigned categories', value: stats?.assigned_categories ?? categories.length, icon: 'git-network-outline', color: BRAND },
        { title: 'Available PDFs', value: stats?.available_pdfs ?? 0, icon: 'document-text-outline', color: SUCCESS },
        { title: 'My downloads', value: stats?.my_downloads ?? 0, icon: 'download-outline', color: WARNING },
        { title: 'New this week', value: stats?.new_pdfs_last_7d ?? 0, icon: 'sparkles-outline', color: ACCENT },
    ] as const;

    if (loading) {
        return (
            <ScrollView
                style={{ flex: 1, backgroundColor: BG }}
                contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 24, gap: 20 }}
                showsVerticalScrollIndicator={false}
            >
                <View style={{ gap: 10 }}>
                    <Skeleton width={110} height={12} />
                    <Skeleton width={'70%'} height={26} />
                    <Skeleton width={'90%'} height={14} />
                    <Skeleton width={'100%'} height={46} radius={12} />
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                    {[0, 1, 2, 3].map((i) => (
                        <View key={i} style={{ width: '47.5%', flexGrow: 1 }}><SkeletonCard lines={2} /></View>
                    ))}
                </View>
                <SkeletonCard lines={4} />
                <SkeletonCard lines={3} />
            </ScrollView>
        );
    }

    const maxDl = Math.max(...downloadsByCategory.map((d) => d.count), 1);

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: BG }}
            contentContainerStyle={{
                paddingTop: insets.top + 16, paddingHorizontal: 16,
                paddingBottom: insets.bottom + 24, gap: 24,
            }}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={BRAND} />
            }
            showsVerticalScrollIndicator={false}
        >
            {/* Welcome section */}
            <View style={{ gap: 12 }}>
                <View>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: BRAND, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>
                        School portal
                    </Text>
                    <Text style={{ fontSize: 26, fontWeight: '700', color: FG }}>
                        Welcome back{firstName ? `, ${firstName}` : ''}
                    </Text>
                    <Text style={{ fontSize: 14, color: MUTED_FG, marginTop: 4, lineHeight: 20 }}>
                        Your library access is curated by your platform administrator.
                    </Text>
                </View>
                <PressableScale
                    onPress={() => router.push('/(school)/portal')}
                    style={{
                        backgroundColor: BRAND, borderRadius: 12, height: 46,
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                        shadowColor: BRAND, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
                    }}
                >
                    <Ionicons name="book-outline" size={18} color="white" />
                    <Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>Open Content Library</Text>
                </PressableScale>
            </View>

            {/* KPI grid (2 columns) */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {kpis.map((k, idx) => (
                    <FadeInUp key={k.title} delay={idx * 70} style={{ width: '47.5%', flexGrow: 1 }}>
                        <Card>
                            <View style={{
                                width: 44, height: 44, borderRadius: 14,
                                backgroundColor: k.color + '1a',
                                alignItems: 'center', justifyContent: 'center', marginBottom: 14,
                            }}>
                                <Ionicons name={k.icon as any} size={22} color={k.color} />
                            </View>
                            <Text style={{ fontSize: 28, fontWeight: '700', color: FG, lineHeight: 30 }}>{k.value}</Text>
                            <Text style={{ fontSize: 13, fontWeight: '500', color: MUTED_FG, marginTop: 6 }}>{k.title}</Text>
                        </Card>
                    </FadeInUp>
                ))}
            </View>

            {/* Recent additions */}
            <Card>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ionicons name="sparkles-outline" size={18} color={BRAND} />
                            <Text style={{ fontSize: 16, fontWeight: '700', color: FG }}>Recent additions</Text>
                        </View>
                        <Text style={{ fontSize: 13, color: MUTED_FG, marginTop: 4 }}>
                            Latest PDFs across your assigned categories.
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => router.push('/(school)/portal')} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: MUTED_FG }}>Browse all</Text>
                        <Ionicons name="arrow-up-outline" size={12} color={MUTED_FG} style={{ transform: [{ rotate: '45deg' }] }} />
                    </TouchableOpacity>
                </View>

                {recentUploads.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 36 }}>
                        <Ionicons name="document-text-outline" size={44} color="#d1d5db" style={{ marginBottom: 10 }} />
                        <Text style={{ color: MUTED_FG, fontWeight: '600' }}>No new content yet.</Text>
                        <Text style={{ color: MUTED_FG, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                            Newly approved PDFs in your categories will appear here.
                        </Text>
                    </View>
                ) : (
                    <View style={{ gap: 8 }}>
                        {recentUploads.map((pdf) => (
                            <TouchableOpacity
                                key={pdf.id}
                                activeOpacity={0.7}
                                onPress={() => handleDownload(pdf)}
                                style={{
                                    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
                                    padding: 12, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
                                }}
                            >
                                <View style={{
                                    width: 40, height: 40, borderRadius: 10,
                                    backgroundColor: ROSE + '1a', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Ionicons name="document-text" size={20} color={ROSE} />
                                </View>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                                        <Badge label={getPdfCode(pdf)} bg="#f3f4f6" fg="#4b5563" mono />
                                        {pdf.categoryName ? <Badge label={pdf.categoryName} bg="#eef2ff" fg={BRAND} /> : null}
                                    </View>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: FG }} numberOfLines={1}>
                                        {pdf.fileName}
                                    </Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                            <Ionicons name="calendar-outline" size={12} color={MUTED_FG} />
                                            <Text style={{ fontSize: 12, color: MUTED_FG }}>{formatDate(pdf.created)}</Text>
                                        </View>
                                        <Text style={{ fontSize: 12, color: MUTED_FG, fontWeight: '500' }}>{formatBytes(pdf.fileSize)}</Text>
                                    </View>
                                </View>
                                <View style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                                    {downloadingId === pdf.id
                                        ? <ActivityIndicator size="small" color={BRAND} />
                                        : <Ionicons name="download-outline" size={18} color={MUTED_FG} />}
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </Card>

            {/* Downloads by category */}
            <Card>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Ionicons name="trending-up-outline" size={18} color={BRAND} />
                    <Text style={{ fontSize: 16, fontWeight: '700', color: FG }}>Downloads by category</Text>
                </View>
                <Text style={{ fontSize: 13, color: MUTED_FG, marginBottom: 16 }}>
                    Where your school is engaging the most.
                </Text>
                {downloadsByCategory.length === 0 ? (
                    <Text style={{ fontSize: 13, color: MUTED_FG, textAlign: 'center', paddingVertical: 20 }}>
                        No download activity yet.
                    </Text>
                ) : (
                    <View style={{ gap: 12 }}>
                        {downloadsByCategory.map((d) => (
                            <View key={d.category_id ?? d.categoryId} style={{ gap: 6 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Text style={{ fontSize: 14, fontWeight: '500', color: FG, flex: 1, paddingRight: 8 }} numberOfLines={1}>
                                        {d.category_name ?? d.categoryName}
                                    </Text>
                                    <Text style={{ fontSize: 14, color: MUTED_FG }}>{d.count}</Text>
                                </View>
                                <View style={{ height: 8, backgroundColor: '#eef0f3', borderRadius: 4, overflow: 'hidden' }}>
                                    <View style={{ height: '100%', width: `${(d.count / maxDl) * 100}%`, backgroundColor: BRAND, borderRadius: 4 }} />
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </Card>

            {/* My categories */}
            <Card>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="git-network-outline" size={18} color={BRAND} />
                        <Text style={{ fontSize: 16, fontWeight: '700', color: FG }}>My categories</Text>
                    </View>
                    <Badge label={String(categories.length)} bg="#f3f4f6" fg="#4b5563" />
                </View>
                {categories.length === 0 ? (
                    <Text style={{ fontSize: 13, color: MUTED_FG, textAlign: 'center', paddingVertical: 20 }}>
                        No categories assigned yet. Contact your platform admin.
                    </Text>
                ) : (
                    <View style={{ gap: 4 }}>
                        {categories.slice(0, 6).map((cat) => (
                            <TouchableOpacity
                                key={cat.categoryId ?? cat.id}
                                onPress={() => router.push('/(school)/portal')}
                                activeOpacity={0.7}
                                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 12 }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                                    <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: SUCCESS + '22', alignItems: 'center', justifyContent: 'center' }}>
                                        <Ionicons name="book-outline" size={16} color="#059669" />
                                    </View>
                                    <View style={{ flex: 1, minWidth: 0 }}>
                                        <Text style={{ fontSize: 14, fontWeight: '600', color: FG }} numberOfLines={1}>{cat.categoryName}</Text>
                                        <Text style={{ fontSize: 12, color: MUTED_FG }} numberOfLines={1}>{cat.categoryType ?? 'Program'}</Text>
                                    </View>
                                </View>
                                <Ionicons name="arrow-up-outline" size={16} color={MUTED_FG} style={{ transform: [{ rotate: '45deg' }] }} />
                            </TouchableOpacity>
                        ))}
                        {categories.length > 6 && (
                            <TouchableOpacity
                                onPress={() => router.push('/(school)/portal')}
                                style={{ marginTop: 8, borderWidth: 1, borderColor: BORDER, borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}
                            >
                                <Text style={{ fontSize: 13, fontWeight: '600', color: FG }}>View all {categories.length}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </Card>

            {/* Messages */}
            <Card>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="notifications-outline" size={18} color={BRAND} />
                        <Text style={{ fontSize: 16, fontWeight: '700', color: FG }}>Messages</Text>
                    </View>
                    <Badge label={`${unreadCount} new`} bg={unreadCount ? BRAND : '#f3f4f6'} fg={unreadCount ? 'white' : '#4b5563'} />
                </View>
                {notifications.length === 0 ? (
                    <Text style={{ fontSize: 13, color: MUTED_FG, textAlign: 'center', paddingVertical: 16 }}>No messages yet.</Text>
                ) : (
                    <View style={{ gap: 12 }}>
                        {notifications.slice(0, 4).map((n) => (
                            <View key={n.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                                <View style={{ width: 6, height: 6, borderRadius: 3, marginTop: 6, backgroundColor: n.read ? '#d1d5db' : BRAND }} />
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '500', color: FG }} numberOfLines={1}>
                                        {n.subject || n.title || 'Notification'}
                                    </Text>
                                    <Text style={{ fontSize: 12, color: MUTED_FG }} numberOfLines={2}>{n.message}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
                <TouchableOpacity
                    onPress={() => router.push('/(school)/notifications')}
                    style={{ marginTop: 16, borderWidth: 1, borderColor: BORDER, borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}
                >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: FG }}>View all messages</Text>
                </TouchableOpacity>
            </Card>

            {/* Quick actions */}
            <Card>
                <Text style={{ fontSize: 15, fontWeight: '700', color: FG, marginBottom: 12 }}>Quick actions</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {[
                        { label: 'Library', icon: 'book-outline', route: '/(school)/portal' },
                        { label: 'Saved', icon: 'bookmark-outline', route: '/(school)/bookmarks' },
                        { label: 'Messages', icon: 'notifications-outline', route: '/(school)/notifications' },
                        { label: 'Analytics', icon: 'trending-up-outline', route: '/(school)/analytics' },
                    ].map((a) => (
                        <TouchableOpacity
                            key={a.label}
                            onPress={() => router.push(a.route as any)}
                            activeOpacity={0.7}
                            style={{
                                width: '47.5%', flexGrow: 1,
                                flexDirection: 'row', alignItems: 'center', gap: 8,
                                borderWidth: 1, borderColor: BORDER, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 12,
                            }}
                        >
                            <Ionicons name={a.icon as any} size={16} color={FG} />
                            <Text style={{ fontSize: 13, fontWeight: '600', color: FG }}>{a.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </Card>
        </ScrollView>
    );
}
