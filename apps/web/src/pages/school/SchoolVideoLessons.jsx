import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/apiClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Play, Download, ExternalLink, Video, VideoOff, Eye, BookOpen, Loader2 } from 'lucide-react';
import PageTransition from '@/components/PageTransition.jsx';
import { toast } from 'sonner';

const PLAYER_SIZES = [
  { key: 'compact',  label: 'S',  title: 'Compact',  cls: 'sm:max-w-xl' },
  { key: 'standard', label: 'M',  title: 'Standard', cls: 'sm:max-w-3xl' },
  { key: 'large',    label: 'L',  title: 'Large',    cls: 'sm:max-w-5xl' },
  { key: 'theater',  label: 'XL', title: 'Theater',  cls: 'sm:max-w-[90vw]' },
];

const getToken = () => {
  try {
    return pb.authStore.token || localStorage.getItem('authToken') || '';
  } catch {
    return '';
  }
};

const apiFetch = async (url, options = {}) => {
  const token = getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.status === 204 ? null : res.json();
};

const parseVimeoUrl = (url) => {
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
};

const buildVimeoSrc = (vimeoUrl) => {
  const { id, hash } = parseVimeoUrl(vimeoUrl);
  if (!id) return null;
  // api=1 enables postMessage events so we can detect whether the player loaded
  const p = new URLSearchParams({ autoplay: '1', title: '0', byline: '0', portrait: '0', api: '1' });
  if (hash) p.set('h', hash);
  return `https://player.vimeo.com/video/${id}?${p}`;
};

const VimeoPlayer = ({ vimeoUrl }) => {
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'blocked'
  const src = buildVimeoSrc(vimeoUrl);

  useEffect(() => {
    if (!src) return;
    setStatus('loading');
    const onMessage = (e) => {
      if (e.origin !== 'https://player.vimeo.com') return;
      try {
        const data = JSON.parse(typeof e.data === 'string' ? e.data : JSON.stringify(e.data));
        if (data.event === 'ready') setStatus('ready');
        if (data.event === 'error') setStatus('blocked');
      } catch {}
    };
    window.addEventListener('message', onMessage);
    // Vimeo shows its own error page (no postMessage) when privacy blocks embedding
    const timer = setTimeout(() => setStatus(s => s === 'loading' ? 'blocked' : s), 8000);
    return () => { window.removeEventListener('message', onMessage); clearTimeout(timer); };
  }, [src]);

  if (!src) return null;
  const { id: vimeoId } = parseVimeoUrl(vimeoUrl);
  const directUrl = vimeoUrl || (vimeoId ? `https://vimeo.com/${vimeoId}` : '#');

  return (
    <div className="relative w-full rounded-lg overflow-hidden bg-black" style={{ paddingTop: '56.25%' }}>
      <iframe
        src={src}
        className="absolute inset-0 w-full h-full"
        frameBorder="0"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        title="Video Lesson"
      />
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
          <Loader2 className="w-8 h-8 animate-spin text-white/70" />
        </div>
      )}
      {status === 'blocked' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/97 z-10 p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <VideoOff className="w-7 h-7 text-muted-foreground/60" />
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">Video cannot be played here</p>
          <p className="text-xs text-muted-foreground mb-4 max-w-xs leading-relaxed">
            The video's Vimeo embed settings are preventing playback. Please contact your administrator.
          </p>
          <a href={directUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="gap-2">
              <ExternalLink className="w-3.5 h-3.5" /> Watch on Vimeo
            </Button>
          </a>
        </div>
      )}
    </div>
  );
};

const VideoPlayerDialog = ({ lesson, open, onClose }) => {
  const [size, setSize] = useState('standard');
  const sizeClass = PLAYER_SIZES.find(s => s.key === size)?.cls ?? 'sm:max-w-3xl';

  useEffect(() => {
    if (open && lesson?.id) {
      apiFetch(`/api/videoLessons/${lesson.id}/view`, { method: 'POST' }).catch(() => {});
    }
  }, [open, lesson?.id]);

  // Reset size when a new video opens
  useEffect(() => { if (open) setSize('standard'); }, [open]);

  const handleDownload = async () => {
    if (!lesson) return;
    try {
      await apiFetch(`/api/videoLessons/${lesson.id}/download`, { method: 'POST' });
    } catch {
      // non-fatal
    }
    window.open(lesson.vimeoUrl || `https://vimeo.com/${lesson.vimeoId}`, '_blank', 'noopener');
    toast.success('Opening Vimeo page for download');
  };

  if (!lesson) return null;
  const vimeoUrl = lesson.vimeoUrl;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className={`${sizeClass} p-0 overflow-hidden transition-all duration-200`}>
        <DialogHeader className="p-5 pb-3 border-b border-border/50">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-semibold leading-snug">{lesson.title}</DialogTitle>
              {lesson.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{lesson.description}</p>
              )}
            </div>
            {/* Window size picker */}
            <div className="flex items-center gap-0.5 shrink-0 bg-muted rounded-md p-0.5">
              {PLAYER_SIZES.map(opt => (
                <button
                  key={opt.key}
                  title={opt.title}
                  onClick={() => setSize(opt.key)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    size === opt.key
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-4">
          {vimeoUrl ? (
            <VimeoPlayer vimeoUrl={vimeoUrl} />
          ) : (
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-sm">
              Video unavailable
            </div>
          )}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
              {lesson.programName && (
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  {lesson.programName}
                </span>
              )}
              {lesson.className && (
                <>
                  <span className="text-border">•</span>
                  <span>{lesson.className}</span>
                </>
              )}
              {lesson.subjectName && (
                <>
                  <span className="text-border">•</span>
                  <span>{lesson.subjectName}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2">
                <Download className="w-4 h-4" /> Download
              </Button>
              <Button
                variant="ghost" size="sm"
                onClick={() => window.open(`https://vimeo.com/${vimeoId}`, '_blank', 'noopener')}
                className="gap-2 text-muted-foreground"
              >
                <ExternalLink className="w-4 h-4" /> Open in Vimeo
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const SchoolVideoLessons = () => {
  const { currentUser } = useAuth();
  const schoolId = currentUser?.schoolId ?? currentUser?.school_id;

  const [lessons, setLessons] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterProgram, setFilterProgram] = useState('all');
  const [filterClass, setFilterClass] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [playingLesson, setPlayingLesson] = useState(null);

  const fetchData = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const [lessonsRes, programsRes, classesRes, subjectsRes] = await Promise.all([
        apiFetch('/api/videoLessons'),
        apiFetch(`/api/schools/${schoolId}/categories`),
        apiFetch(`/api/schools/${schoolId}/classes`).catch(() => ({ items: [] })),
        apiFetch(`/api/schools/${schoolId}/subjects`).catch(() => ({ items: [] })),
      ]);

      setLessons(lessonsRes?.items ?? []);

      setPrograms((programsRes?.items ?? []).map(a => ({ id: a.categoryId, name: a.categoryName })));

      setClasses((classesRes?.items ?? []).map(a => ({
        id: a.classId,
        name: a.className || a.subCategoryName,
        programId: a.programId || a.categoryId,
      })));

      setSubjects((subjectsRes?.items ?? []).map(a => ({
        id: a.subjectId,
        name: a.subjectName,
        classId: a.classId,
        programId: a.programId,
      })));
    } catch (err) {
      toast.error('Failed to load video lessons');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const programMap = Object.fromEntries(programs.map(p => [p.id, p.name]));
  const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]));
  const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s.name]));

  // Cascade filter dropdowns
  const filteredClasses = filterProgram !== 'all'
    ? classes.filter(c => c.programId === filterProgram)
    : classes;

  const filteredSubjects = filterClass !== 'all'
    ? subjects.filter(s => s.classId === filterClass)
    : filterProgram !== 'all'
      ? subjects.filter(s => s.programId === filterProgram)
      : subjects;

  const filtered = lessons.filter(lesson => {
    const matchSearch = !search || lesson.title?.toLowerCase().includes(search.toLowerCase());
    const matchProgram = filterProgram === 'all' || lesson.programId === filterProgram;
    const matchClass = filterClass === 'all' || lesson.classId === filterClass;
    const matchSubject = filterSubject === 'all' || lesson.subjectId === filterSubject;
    return matchSearch && matchProgram && matchClass && matchSubject;
  });

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-poppins font-bold text-foreground">Video Lessons</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Watch educational videos from your assigned programs
            </p>
          </div>
          <Badge variant="secondary" className="self-start sm:self-center gap-1.5 text-sm px-3 py-1">
            <Video className="w-3.5 h-3.5" />
            {lessons.length} lessons available
          </Badge>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search lessons..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterProgram} onValueChange={v => { setFilterProgram(v); setFilterClass('all'); setFilterSubject('all'); }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Programs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Programs</SelectItem>
              {programs.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterClass} onValueChange={v => { setFilterClass(v); setFilterSubject('all'); }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {filteredClasses.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filteredSubjects.length > 0 && (
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {filteredSubjects.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Lessons Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-video w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Video className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              {lessons.length === 0 ? 'No video lessons yet' : 'No lessons match your filters'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              {lessons.length === 0
                ? 'Video lessons will appear here once they are assigned to your programs.'
                : 'Try adjusting your search or filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map(lesson => {
              const { id: vimeoId } = parseVimeoUrl(lesson.vimeoUrl);
              const thumbnail = lesson.thumbnail || (vimeoId ? `https://vumbnail.com/${vimeoId}.jpg` : null);
              const programName = programMap[lesson.programId] || '';
              const className = classMap[lesson.classId] || '';
              const subjectName = subjectMap[lesson.subjectId] || '';

              return (
                <Card
                  key={lesson.id}
                  className="group cursor-pointer overflow-hidden border-border/50 hover:shadow-md transition-all duration-200"
                  onClick={() => setPlayingLesson({ ...lesson, programName, className, subjectName })}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-muted overflow-hidden">
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt={lesson.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Video className="w-10 h-10 text-muted-foreground/40" />
                      </div>
                    )}
                    {/* Play overlay */}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                        <Play className="w-6 h-6 text-primary fill-primary ml-1" />
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-4 space-y-2">
                    <h3 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                      {lesson.title}
                    </h3>
                    {lesson.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{lesson.description}</p>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex flex-col gap-0.5">
                        {programName && (
                          <span className="text-xs text-muted-foreground truncate max-w-[120px]">{programName}</span>
                        )}
                        {className && (
                          <span className="text-xs text-primary/70 font-medium truncate max-w-[120px]">
                            {className}{subjectName ? ` · ${subjectName}` : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                        <Eye className="w-3 h-3" />
                        <span>{lesson.viewCount ?? 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <VideoPlayerDialog
        lesson={playingLesson}
        open={!!playingLesson}
        onClose={() => setPlayingLesson(null)}
      />
    </PageTransition>
  );
};

export default SchoolVideoLessons;
