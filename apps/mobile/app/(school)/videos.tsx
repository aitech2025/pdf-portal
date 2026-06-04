import { useEffect, useState, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, TextInput,
    RefreshControl, ActivityIndicator, Modal, useWindowDimensions,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { apiFetch } from '../../src/lib/apiClient';

interface VideoLesson {
    id: string; title: string; description?: string;
    vimeo_id?: string; vimeo_url?: string;
    category_name?: string; subject?: string;
    duration?: number; view_count?: number;
}

function formatDuration(seconds?: number) {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

/** Extract numeric Vimeo ID from either a bare ID, a URL, or embed URL. */
function resolveVimeoId(video: VideoLesson): string | null {
    if (video.vimeo_id && /^\d+$/.test(video.vimeo_id)) return video.vimeo_id;
    const url = video.vimeo_url ?? video.vimeo_id ?? '';
    const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return match?.[1] ?? null;
}

export default function VideosScreen() {
    const { width: screenWidth } = useWindowDimensions();
    const insets = useSafeAreaInsets();

    // 16:9 video height based on actual screen width
    const playerHeight = Math.round(screenWidth * (9 / 16));

    const [videos, setVideos] = useState<VideoLesson[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedVideo, setSelectedVideo] = useState<VideoLesson | null>(null);
    const [playerLoading, setPlayerLoading] = useState(true);

    const fetchVideos = useCallback(async () => {
        try {
            const res = await apiFetch('/api/videoLessons', 'GET', null, { per_page: 100 });
            setVideos(res.items ?? res ?? []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { fetchVideos(); }, [fetchVideos]);

    const handleOpen = (video: VideoLesson) => {
        setPlayerLoading(true);
        setSelectedVideo(video);
        // Track view (best-effort)
        apiFetch(`/api/videoLessons/${video.id}/view`, 'POST').catch(() => { });
    };

    const filtered = videos.filter(v =>
        v.title.toLowerCase().includes(search.toLowerCase()) ||
        (v.category_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (v.subject ?? '').toLowerCase().includes(search.toLowerCase())
    );

    const renderItem = ({ item }: { item: VideoLesson }) => {
        // Card thumbnail uses aspectRatio so it scales to any screen width automatically
        return (
            <TouchableOpacity
                className="bg-white mx-4 mb-3 rounded-2xl border border-border overflow-hidden"
                onPress={() => handleOpen(item)}
                activeOpacity={0.85}
            >
                {/* 16:9 thumbnail — width: auto (fills card), height: 56.25% of width */}
                <View style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="play" size={28} color="white" style={{ marginLeft: 3 }} />
                    </View>
                    {item.duration != null && (
                        <View style={{ position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ color: 'white', fontSize: 11 }}>{formatDuration(item.duration)}</Text>
                        </View>
                    )}
                </View>

                <View className="p-4">
                    <Text className="text-sm font-semibold text-foreground leading-tight" numberOfLines={2}>
                        {item.title}
                    </Text>
                    {item.description ? (
                        <Text className="text-xs text-muted mt-1" numberOfLines={2}>{item.description}</Text>
                    ) : null}
                    <View className="flex-row items-center gap-2 mt-2 flex-wrap">
                        {item.category_name && (
                            <View className="bg-primary/10 px-2 py-0.5 rounded-full">
                                <Text className="text-xs text-primary font-medium">{item.category_name}</Text>
                            </View>
                        )}
                        {item.subject && (
                            <Text className="text-xs text-muted">{item.subject}</Text>
                        )}
                        {item.view_count != null && (
                            <View className="flex-row items-center gap-1 ml-auto">
                                <Ionicons name="eye-outline" size={12} color="#9ca3af" />
                                <Text className="text-xs text-muted">{item.view_count}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const vimeoId = selectedVideo ? resolveVimeoId(selectedVideo) : null;
    // Vimeo embed URL — autoplay, no header chrome, branded color
    const embedUrl = vimeoId
        ? `https://player.vimeo.com/video/${vimeoId}?autoplay=1&loop=0&color=4f46e5&title=0&byline=0&portrait=0`
        : null;

    return (
        <View className="flex-1 bg-background">
            <View className="bg-white px-5 pt-14 pb-4 border-b border-border">
                <Text className="text-2xl font-bold text-foreground">Videos</Text>
                <Text className="text-sm text-muted mt-0.5 mb-3">Video lessons for your programs</Text>
                <View className="flex-row items-center bg-gray-100 rounded-xl px-3">
                    <Ionicons name="search" size={16} color="#9ca3af" />
                    <TextInput
                        className="flex-1 py-2.5 px-2 text-foreground text-sm"
                        placeholder="Search videos..."
                        placeholderTextColor="#9ca3af"
                        value={search}
                        onChangeText={setSearch}
                    />
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
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); fetchVideos(); }}
                            tintColor="#4f46e5"
                        />
                    }
                    ListEmptyComponent={
                        <View className="items-center justify-center py-24">
                            <View className="w-16 h-16 rounded-2xl bg-primary/10 items-center justify-center mb-4">
                                <Ionicons name="play-circle-outline" size={32} color="#4f46e5" />
                            </View>
                            <Text className="text-base font-semibold text-foreground">No videos available</Text>
                            <Text className="text-sm text-muted mt-1 text-center px-8">
                                Video lessons assigned to your school will appear here.
                            </Text>
                        </View>
                    }
                />
            )}

            {/* ── Inline Video Player Modal ── */}
            <Modal
                visible={!!selectedVideo}
                animationType="slide"
                statusBarTranslucent
                onRequestClose={() => setSelectedVideo(null)}
            >
                <View style={{ flex: 1, backgroundColor: '#000' }}>
                    {/* Modal header */}
                    <View style={{
                        paddingTop: insets.top + 8,
                        paddingBottom: 12,
                        paddingHorizontal: 16,
                        backgroundColor: '#111',
                        flexDirection: 'row',
                        alignItems: 'center',
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

                    {/* 16:9 player — width matches screen, height = screenWidth × 9/16 */}
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
                                    <View style={{
                                        position: 'absolute', inset: 0,
                                        backgroundColor: '#000',
                                        alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <ActivityIndicator size="large" color="#4f46e5" />
                                    </View>
                                )}
                            </>
                        ) : (
                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="alert-circle-outline" size={36} color="#9ca3af" />
                                <Text style={{ color: '#9ca3af', marginTop: 8, fontSize: 13 }}>
                                    No playable video source
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Video metadata below player */}
                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={{ padding: 20 }}
                    >
                        <Text style={{ color: 'white', fontSize: 17, fontWeight: '700', lineHeight: 24 }}>
                            {selectedVideo?.title}
                        </Text>
                        {selectedVideo?.category_name && (
                            <View style={{ marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                <View style={{ backgroundColor: 'rgba(79,70,229,0.3)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 }}>
                                    <Text style={{ color: '#a5b4fc', fontSize: 12, fontWeight: '600' }}>
                                        {selectedVideo.category_name}
                                    </Text>
                                </View>
                                {selectedVideo?.subject && (
                                    <Text style={{ color: '#6b7280', fontSize: 12, alignSelf: 'center' }}>
                                        {selectedVideo.subject}
                                    </Text>
                                )}
                            </View>
                        )}
                        {selectedVideo?.description && (
                            <Text style={{ color: '#9ca3af', fontSize: 14, marginTop: 12, lineHeight: 22 }}>
                                {selectedVideo.description}
                            </Text>
                        )}
                        {selectedVideo?.duration != null && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
                                <Ionicons name="time-outline" size={14} color="#6b7280" />
                                <Text style={{ color: '#6b7280', fontSize: 13 }}>
                                    {formatDuration(selectedVideo.duration)}
                                </Text>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}
