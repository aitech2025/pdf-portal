import { useEffect, useState, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, TextInput,
    RefreshControl, ActivityIndicator, Modal, useWindowDimensions,
    ScrollView, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useAuth } from '../../src/context/AuthContext';
import { apiFetch } from '../../src/lib/apiClient';
import { PressableScale, Skeleton } from '../../src/components/motion';

/* Design tokens mirrored from apps/web (index.css / tailwind.config.js) */
const BRAND = '#5b5ff1';
const BG = '#fbfcff';
const FG = '#111827';
const MUTED_FG = '#6b7280';
const CARD_BORDER = '#eef0f3';
const RADIUS_LG = 16;
const SOFT_SM = {
    shadowColor: '#111a2e', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
};

interface VideoLesson {
    id: string; title: string; description?: string;
    vimeoId?: string; vimeoUrl?: string;
    programId?: string; classId?: string; subjectId?: string;
    programName?: string; className?: string; subjectName?: string;
    thumbnail?: string; viewCount?: number;
}

function parseVimeoUrl(url?: string): { id: string | null; hash: string | null } {
    if (!url) return { id: null, hash: null };
    let m = url.match(/player\.vimeo\.com\/video\/(\d+)/);
    if (m) {
        const h = url.match(/[?&]h=([a-zA-Z0-9]+)/);
        return { id: m[1], hash: h ? h[1] : null };
    }
    m = url.match(/vimeo\.com\/(\d+)(?:\/([a-zA-Z0-9]+))?/);
    if (m) return { id: m[1], hash: m[2] || null };
    if (/^\d+$/.test((url || '').trim())) return { id: url.trim(), hash: null };
    return { id: null, hash: null };
}

function resolveVimeoId(video: VideoLesson): { id: string | null; hash: string | null } {
    if (video.vimeoId && /^\d+$/.test(String(video.vimeoId))) return { id: String(video.vimeoId), hash: null };
    return parseVimeoUrl(video.vimeoUrl ?? video.vimeoId);
}

// Walk pages so a school with 100+ assigned videos sees all of them.
async function fetchAllVideoLessons(): Promise<VideoLesson[]> {
    const PER_PAGE = 200;
    const all: VideoLesson[] = [];
    let page = 1;
    for (let i = 0; i < 100; i++) {
        const res: any = await apiFetch('/api/videoLessons', 'GET', null, { page, per_page: PER_PAGE });
        const items = res?.items ?? [];
        all.push(...items);
        const total = res?.totalItems ?? res?.total ?? all.length;
        if (items.length === 0 || all.length >= total) break;
        page += 1;
    }
    return all;
}

export default function VideosScreen() {
    const { user } = useAuth();
    const schoolId = user?.schoolId;
    const { width: screenWidth } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const playerHeight = Math.round(screenWidth * (9 / 16));

    const [videos, setVideos] = useState<VideoLesson[]>([]);
    const [programMap, setProgramMap] = useState<Record<string, string>>({});
    const [classMap, setClassMap] = useState<Record<string, string>>({});
    const [subjectMap, setSubjectMap] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedVideo, setSelectedVideo] = useState<VideoLesson | null>(null);
    const [playerLoading, setPlayerLoading] = useState(true);

    const fetchVideos = useCallback(async () => {
        try {
            const [allLessons, programsRes, classesRes, subjectsRes] = await Promise.all([
                fetchAllVideoLessons(),
                schoolId ? apiFetch(`/api/schools/${schoolId}/categories`).catch(() => ({ items: [] })) : Promise.resolve({ items: [] }),
                schoolId ? apiFetch(`/api/schools/${schoolId}/classes`).catch(() => ({ items: [] })) : Promise.resolve({ items: [] }),
                schoolId ? apiFetch(`/api/schools/${schoolId}/subjects`).catch(() => ({ items: [] })) : Promise.resolve({ items: [] }),
            ]);
            setVideos(allLessons);
            setProgramMap(Object.fromEntries((programsRes?.items ?? []).map((a: any) => [a.categoryId, a.categoryName])));
            setClassMap(Object.fromEntries((classesRes?.items ?? []).map((a: any) => [a.classId, a.className || a.subCategoryName])));
            setSubjectMap(Object.fromEntries((subjectsRes?.items ?? []).map((a: any) => [a.subjectId, a.subjectName])));
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    }, [schoolId]);

    useEffect(() => { fetchVideos(); }, [fetchVideos]);

    const handleOpen = (video: VideoLesson) => {
        setPlayerLoading(true);
        setSelectedVideo(video);
        apiFetch(`/api/videoLessons/${video.id}/view`, 'POST').catch(() => { });
    };

    const q = search.toLowerCase();
    const filtered = videos.filter(v => {
        const pn = programMap[v.programId ?? ''] ?? '';
        const cn = classMap[v.classId ?? ''] ?? '';
        const sn = subjectMap[v.subjectId ?? ''] ?? '';
        return (
            (v.title ?? '').toLowerCase().includes(q) ||
            (v.description ?? '').toLowerCase().includes(q) ||
            pn.toLowerCase().includes(q) ||
            cn.toLowerCase().includes(q) ||
            sn.toLowerCase().includes(q)
        );
    });

    const renderItem = ({ item }: { item: VideoLesson }) => {
        const { id: vimeoId } = parseVimeoUrl(item.vimeoUrl ?? item.vimeoId);
        const thumbnail = item.thumbnail || (vimeoId ? `https://vumbnail.com/${vimeoId}.jpg` : null);
        const programName = programMap[item.programId ?? ''] || '';
        const className = classMap[item.classId ?? ''] || '';
        const subjectName = subjectMap[item.subjectId ?? ''] || '';
        return (
            <PressableScale
                onPress={() => handleOpen({ ...item, programName, className, subjectName })}
                scaleTo={0.98}
                style={[{
                    backgroundColor: 'white', marginHorizontal: 16, marginBottom: 12,
                    borderRadius: RADIUS_LG, borderWidth: 1, borderColor: CARD_BORDER, overflow: 'hidden',
                }, SOFT_SM]}
            >
                <View style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' }}>
                    {thumbnail ? (
                        <Image source={{ uri: thumbnail }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    ) : (
                        <Ionicons name="videocam-outline" size={40} color="rgba(255,255,255,0.4)" />
                    )}
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="play" size={24} color={BRAND} style={{ marginLeft: 3 }} />
                        </View>
                    </View>
                </View>
                <View style={{ padding: 14 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: FG, lineHeight: 19 }} numberOfLines={2}>
                        {item.title}
                    </Text>
                    {item.description ? (
                        <Text style={{ fontSize: 12, color: MUTED_FG, marginTop: 4 }} numberOfLines={2}>{item.description}</Text>
                    ) : null}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                        <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                            {programName ? <Text style={{ fontSize: 12, color: MUTED_FG }} numberOfLines={1}>{programName}</Text> : null}
                            {className ? (
                                <Text style={{ fontSize: 12, color: BRAND, fontWeight: '500' }} numberOfLines={1}>
                                    {className}{subjectName ? ` · ${subjectName}` : ''}
                                </Text>
                            ) : null}
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name="eye-outline" size={13} color={MUTED_FG} />
                            <Text style={{ fontSize: 12, color: MUTED_FG }}>{item.viewCount ?? 0}</Text>
                        </View>
                    </View>
                </View>
            </PressableScale>
        );
    };

    const { id: vimeoId, hash } = selectedVideo ? resolveVimeoId(selectedVideo) : { id: null, hash: null };
    const embedUrl = vimeoId
        ? `https://player.vimeo.com/video/${vimeoId}?autoplay=1&title=0&byline=0&portrait=0${hash ? `&h=${hash}` : ''}`
        : null;

    return (
        <View style={{ flex: 1, backgroundColor: BG }}>
            {/* Header */}
            <View style={{ backgroundColor: 'white', paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: CARD_BORDER }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: BRAND, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>
                    School portal
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 24, fontWeight: '700', color: FG }}>Video Lessons</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#f3f4f6', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 }}>
                        <Ionicons name="videocam-outline" size={13} color={MUTED_FG} />
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#4b5563' }}>{videos.length}</Text>
                    </View>
                </View>
                <Text style={{ fontSize: 14, color: MUTED_FG, marginTop: 2, marginBottom: 12 }}>
                    Watch educational videos from your assigned programs
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 12 }}>
                    <Ionicons name="search" size={16} color="#9ca3af" />
                    <TextInput
                        style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8, color: FG, fontSize: 14 }}
                        placeholder="Search lessons..."
                        placeholderTextColor="#9ca3af"
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            </View>

            {loading ? (
                <View style={{ paddingTop: 12 }}>
                    {[0, 1, 2].map((i) => (
                        <View key={i} style={{
                            marginHorizontal: 16, marginBottom: 12, borderRadius: RADIUS_LG,
                            borderWidth: 1, borderColor: CARD_BORDER, backgroundColor: 'white', overflow: 'hidden',
                        }}>
                            <Skeleton width={'100%'} height={undefined as any} radius={0} style={{ aspectRatio: 16 / 9 }} />
                            <View style={{ padding: 14, gap: 8 }}>
                                <Skeleton width={'80%'} height={14} />
                                <Skeleton width={'55%'} height={12} />
                            </View>
                        </View>
                    ))}
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 24 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchVideos(); }} tintColor={BRAND} />
                    }
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 96 }}>
                            <View style={{ width: 64, height: 64, borderRadius: RADIUS_LG, backgroundColor: BRAND + '1a', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                <Ionicons name="videocam-outline" size={32} color={BRAND} />
                            </View>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: FG }}>
                                {videos.length === 0 ? 'No video lessons yet' : 'No lessons match your search'}
                            </Text>
                            <Text style={{ fontSize: 13, color: MUTED_FG, marginTop: 6, textAlign: 'center', paddingHorizontal: 40 }}>
                                {videos.length === 0
                                    ? 'Video lessons will appear here once they are assigned to your programs.'
                                    : 'Try adjusting your search.'}
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Inline Video Player Modal */}
            <Modal
                visible={!!selectedVideo}
                animationType="slide"
                statusBarTranslucent
                onRequestClose={() => setSelectedVideo(null)}
            >
                <View style={{ flex: 1, backgroundColor: '#000' }}>
                    <View style={{
                        paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16,
                        backgroundColor: '#111', flexDirection: 'row', alignItems: 'center',
                    }}>
                        <TouchableOpacity
                            onPress={() => setSelectedVideo(null)}
                            style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}
                        >
                            <Ionicons name="close" size={22} color="white" />
                        </TouchableOpacity>
                        <Text style={{ color: 'white', flex: 1, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
                            {selectedVideo?.title}
                        </Text>
                    </View>

                    <View style={{ width: screenWidth, height: playerHeight, backgroundColor: '#000' }}>
                        {embedUrl ? (
                            <>
                                <WebView
                                    source={{ uri: embedUrl }}
                                    style={{ width: screenWidth, height: playerHeight }}
                                    allowsFullscreenVideo
                                    mediaPlaybackRequiresUserAction={false}
                                    javaScriptEnabled
                                    allowsInlineMediaPlayback
                                    onLoadEnd={() => setPlayerLoading(false)}
                                />
                                {playerLoading && (
                                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
                                        <ActivityIndicator size="large" color={BRAND} />
                                    </View>
                                )}
                            </>
                        ) : (
                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="alert-circle-outline" size={36} color="#9ca3af" />
                                <Text style={{ color: '#9ca3af', marginTop: 8, fontSize: 13 }}>No playable video source</Text>
                            </View>
                        )}
                    </View>

                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
                        <Text style={{ color: 'white', fontSize: 17, fontWeight: '700', lineHeight: 24 }}>
                            {selectedVideo?.title}
                        </Text>
                        <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                            {selectedVideo?.programName ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                    <Ionicons name="book-outline" size={14} color="#a5b4fc" />
                                    <Text style={{ color: '#a5b4fc', fontSize: 12, fontWeight: '600' }}>{selectedVideo.programName}</Text>
                                </View>
                            ) : null}
                            {selectedVideo?.className ? (
                                <Text style={{ color: '#6b7280', fontSize: 12 }}>· {selectedVideo.className}</Text>
                            ) : null}
                            {selectedVideo?.subjectName ? (
                                <Text style={{ color: '#6b7280', fontSize: 12 }}>· {selectedVideo.subjectName}</Text>
                            ) : null}
                        </View>
                        {selectedVideo?.description ? (
                            <Text style={{ color: '#9ca3af', fontSize: 14, marginTop: 14, lineHeight: 22 }}>
                                {selectedVideo.description}
                            </Text>
                        ) : null}
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}
