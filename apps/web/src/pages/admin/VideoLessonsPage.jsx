import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Play, Edit2, Trash2, Video, VideoOff, Search, ExternalLink, Loader2,
  Eye, GraduationCap, BookOpen, Tag, Info, LayoutList, LayoutGrid
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import PageTransition from '@/components/PageTransition.jsx';
import PaginationControls from '@/components/PaginationControls.jsx';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext.jsx';
import client from '@/lib/apiClient';
import { matchesSearch } from '@/lib/utils';

const PLATFORM_ADMIN_ROLES = ['super_admin', 'platform_admin', 'admin'];

const PLAYER_SIZES = [
  { key: 'compact',  label: 'S', title: 'Compact',  cls: 'sm:max-w-xl' },
  { key: 'standard', label: 'M', title: 'Standard', cls: 'sm:max-w-3xl' },
  { key: 'large',    label: 'L', title: 'Large',    cls: 'sm:max-w-5xl' },
  { key: 'theater',  label: 'XL', title: 'Theater', cls: 'sm:max-w-[90vw]' },
];

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

const buildVimeoSrc = (vimeoUrl, autoplay = false) => {
  const { id, hash } = parseVimeoUrl(vimeoUrl);
  if (!id) return null;
  // api=1 enables postMessage events so we can detect whether the player loaded
  const p = new URLSearchParams({ title: '0', byline: '0', portrait: '0', api: '1' });
  if (autoplay) p.set('autoplay', '1');
  if (hash) p.set('h', hash);
  return `https://player.vimeo.com/video/${id}?${p}`;
};

const extractVimeoId = (url) => parseVimeoUrl(url).id;

const VimeoEmbed = ({ vimeoUrl, title }) => {
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
    // If Vimeo blocks the embed it shows its own error page — the player never fires 'ready'
    const timer = setTimeout(() => setStatus(s => s === 'loading' ? 'blocked' : s), 8000);
    return () => { window.removeEventListener('message', onMessage); clearTimeout(timer); };
  }, [src]);

  if (!src) return null;
  const { id: vimeoId } = parseVimeoUrl(vimeoUrl);
  const directUrl = vimeoUrl || (vimeoId ? `https://vimeo.com/${vimeoId}` : '#');

  return (
    <div className="relative w-full rounded-lg overflow-hidden bg-black" style={{ paddingTop: '56.25%' }}>
      <iframe
        className="absolute inset-0 w-full h-full"
        src={src}
        title={title}
        frameBorder="0"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
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
          <p className="text-sm font-semibold text-foreground mb-1">Video blocked by Vimeo privacy settings</p>
          <p className="text-xs text-muted-foreground mb-4 max-w-xs leading-relaxed">
            In Vimeo, open the video settings → <strong>Privacy</strong> → set
            <strong> "Where can this be embedded?"</strong> to <strong>Anywhere</strong>.
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

// ─── Upload / Edit Modal ──────────────────────────────────────────────────────
const VideoModal = ({ isOpen, onClose, onSave, lesson = null, classes = [], subjects = [], programs = [] }) => {
  const [form, setForm] = useState({
    title: '', description: '', vimeoUrl: '', programId: '', classId: '', subjectId: '', isActive: true
  });
  const [saving, setSaving] = useState(false);
  const { id: vimeoId } = parseVimeoUrl(form.vimeoUrl);

  useEffect(() => {
    if (isOpen) {
      setForm(lesson
        ? {
            title: lesson.title || '',
            description: lesson.description || '',
            vimeoUrl: lesson.vimeoUrl || '',
            programId: lesson.programId || '',
            classId: lesson.classId || '',
            subjectId: lesson.subjectId || '',
            isActive: lesson.isActive !== false
          }
        : { title: '', description: '', vimeoUrl: '', programId: '', classId: '', subjectId: '', isActive: true }
      );
    }
  }, [isOpen, lesson]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.vimeoUrl || !form.classId) {
      toast.error('Title, Vimeo URL and Class are required');
      return;
    }
    if (!vimeoId) {
      toast.error('Could not extract a valid Vimeo ID from the URL');
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch {
      // handled upstream
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !saving && !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-poppins text-xl">
            {lesson ? 'Edit Video' : 'Add Video to Repository'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Title <span className="text-destructive">*</span></Label>
            <Input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Introduction to Algebra"
            />
          </div>

          <div className="space-y-1">
            <Label>Vimeo URL <span className="text-destructive">*</span></Label>
            <Input
              value={form.vimeoUrl}
              onChange={e => setForm(f => ({ ...f, vimeoUrl: e.target.value }))}
              placeholder="https://vimeo.com/123456789 or https://vimeo.com/123456789/privatehash"
            />
            {vimeoId
              ? <p className="text-xs text-emerald-600">Video ID detected: {vimeoId}</p>
              : form.vimeoUrl && <p className="text-xs text-destructive">Could not extract Vimeo ID from URL</p>}
            <div className="flex items-start gap-2 mt-1.5 p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-md">
              <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                <strong>Vimeo privacy required:</strong> In Vimeo, open the video → Privacy → set <strong>"Where can this be embedded?"</strong> to <strong>Anywhere</strong>. For unlisted videos, paste the full URL including the private hash (e.g. vimeo.com/123456/abc123).
              </p>
            </div>
          </div>

          {vimeoId && (
            <div>
              <Label className="mb-2 block">Preview</Label>
              <VimeoEmbed vimeoUrl={form.vimeoUrl} title={form.title} />
            </div>
          )}

          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Brief description..."
              className="resize-none h-20"
            />
          </div>

          {/* Program → Class → Subject row */}
          <div className="space-y-1">
            <Label>Program <span className="text-muted-foreground text-xs">(optional — assign immediately)</span></Label>
            <Select
              value={form.programId || 'none'}
              onValueChange={v => setForm(f => ({ ...f, programId: v === 'none' ? '' : v }))}
            >
              <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No program (assign later)</SelectItem>
                {programs.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.categoryName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Class <span className="text-destructive">*</span></Label>
              <Select
                value={form.classId}
                onValueChange={v => setForm(f => ({ ...f, classId: v, subjectId: '' }))}
              >
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Subject <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Select
                value={form.subjectId || 'none'}
                onValueChange={v => setForm(f => ({ ...f, subjectId: v === 'none' ? '' : v }))}
              >
                <SelectTrigger><SelectValue placeholder="No specific subject" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific subject</SelectItem>
                  {subjects.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.subjectName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/50 p-3 bg-muted/20">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">Make this video available to schools</p>
            </div>
            <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : 'Save Video'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ─── Video Player Dialog ──────────────────────────────────────────────────────
const VideoPlayerDialog = ({ lesson, onClose, classes, subjects, programs }) => {
  const [size, setSize] = useState('standard');
  const sizeClass = PLAYER_SIZES.find(s => s.key === size)?.cls ?? 'sm:max-w-3xl';

  useEffect(() => {
    if (lesson?.id) {
      client.fetch(`/videoLessons/${lesson.id}/view`, 'POST').catch(() => {});
    }
  }, [lesson?.id]);

  if (!lesson) return null;
  const vimeoId = extractVimeoId(lesson.vimeoUrl);
  const className = classes.find(c => c.id === lesson.classId)?.className;
  const subjectName = subjects.find(s => s.id === lesson.subjectId)?.subjectName;
  const programName = programs.find(p => p.id === lesson.programId)?.categoryName;

  return (
    <Dialog open={!!lesson} onOpenChange={open => !open && onClose()}>
      <DialogContent className={`${sizeClass} p-0 overflow-hidden`}>
        <DialogHeader className="p-5 pb-3 border-b border-border/50">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="min-w-0">
              <DialogTitle className="font-poppins text-lg leading-snug">{lesson.title}</DialogTitle>
              {lesson.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{lesson.description}</p>
              )}
            </div>
            {/* Size picker */}
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
          {vimeoId
            ? <VimeoEmbed vimeoUrl={lesson.vimeoUrl} title={lesson.title} />
            : (
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-sm">
                Video unavailable — invalid Vimeo URL
              </div>
            )
          }

          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {programName && <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{programName}</span>}
              {className && <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" />{className}</span>}
              {subjectName && <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{subjectName}</span>}
            </div>
            <Button
              variant="ghost" size="sm"
              onClick={() => window.open(lesson.vimeoUrl, '_blank', 'noopener')}
              className="gap-2 text-muted-foreground shrink-0"
            >
              <ExternalLink className="w-4 h-4" /> Open in Vimeo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const VideoLessonsPage = () => {
  const { currentUser } = useAuth();
  const isPlatformAdmin = PLATFORM_ADMIN_ROLES.includes(currentUser?.role);

  const [lessons, setLessons] = useState([]);
  const [totalLessons, setTotalLessons] = useState(0);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterProgram, setFilterProgram] = useState('all');
  const [filterClass, setFilterClass] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterUnassigned, setFilterUnassigned] = useState(false);
  const [page, setPage] = useState(1);
  const PER_PAGE = 50;

  const [viewMode, setViewMode] = useState('list');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [playingLesson, setPlayingLesson] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchLessons = useCallback(async (currentPage = 1) => {
    setLoading(true);
    try {
      const params = { page: currentPage, per_page: PER_PAGE };
      if (filterProgram !== 'all') params.programId = filterProgram;
      if (filterClass !== 'all') params.classId = filterClass;
      if (filterSubject !== 'all') params.subjectId = filterSubject;
      if (filterUnassigned) params.unassigned = 'true';
      const lessonsRes = await client.fetch('/videoLessons/admin', 'GET', null, params);
      setLessons(lessonsRes?.items ?? []);
      setTotalLessons(lessonsRes?.totalItems ?? lessonsRes?.total ?? 0);
    } catch (err) {
      toast.error(err.message || 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  }, [filterProgram, filterClass, filterSubject, filterUnassigned]);

  const fetchData = useCallback(async () => {
    try {
      const [clsRes, subjRes, progsRes] = await Promise.all([
        client.fetch('/masterClasses'),
        client.fetch('/masterSubjects'),
        client.fetch('/categories')
      ]);
      setClasses(clsRes?.items ?? []);
      setSubjects(subjRes?.items ?? []);
      setPrograms(progsRes?.items ?? []);
    } catch (err) {
      toast.error(err.message || 'Failed to load data');
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchLessons(page); }, [fetchLessons, page]);

  const handleSave = async (formData) => {
    try {
      if (editingLesson) {
        await client.fetch(`/videoLessons/${editingLesson.id}`, 'PATCH', formData);
        toast.success('Video updated');
      } else {
        await client.fetch('/videoLessons', 'POST', formData);
        toast.success('Video added to repository');
      }
      fetchLessons(page);
    } catch (err) {
      toast.error(err.message || 'Failed to save');
      throw err;
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await client.fetch(`/videoLessons/${id}`, 'DELETE');
      toast.success('Video deleted');
      fetchLessons(page);
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const getClassName = id => classes.find(c => c.id === id)?.className || '';
  const getSubjectName = id => subjects.find(s => s.id === id)?.subjectName || '';
  const getProgramName = id => programs.find(p => p.id === id)?.categoryName || '';

  const filtered = lessons.filter(l =>
    matchesSearch(
      search,
      l.title, l.description,
      getClassName(l.classId), getSubjectName(l.subjectId), getProgramName(l.programId),
      l.isActive !== false ? 'active' : 'inactive'
    )
  );

  const totalPages = Math.max(1, Math.ceil(totalLessons / PER_PAGE));

  const unassignedCount = filterUnassigned ? totalLessons : undefined;

  return (
    <PageTransition className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-poppins font-bold text-foreground">Video Repository</h1>
          <p className="text-muted-foreground mt-1 text-sm max-w-xl">
            Upload and manage Vimeo-hosted video lessons. After uploading, go to
            <strong> Programs</strong> to assign videos to a program for school access.
          </p>
        </div>
        {isPlatformAdmin && (
          <Button onClick={() => { setEditingLesson(null); setModalOpen(true); }} className="shrink-0">
            <Plus className="w-4 h-4 mr-2" /> Upload Video
          </Button>
        )}
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap gap-3">
        <div className="bg-card border border-border/50 rounded-lg px-4 py-2 text-sm">
          <span className="text-muted-foreground">Total: </span>
          <span className="font-semibold">{totalLessons}</span>
        </div>
        <button
          onClick={() => { setFilterUnassigned(v => !v); setPage(1); }}
          className={`border rounded-lg px-4 py-2 text-sm transition-colors ${
            filterUnassigned
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-400'
              : 'bg-card border-border/50 text-muted-foreground hover:border-amber-500/40'
          }`}
        >
          {filterUnassigned ? 'Unassigned only (active)' : 'Show unassigned'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search videos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterProgram} onValueChange={v => { setFilterProgram(v); setFilterClass('all'); setFilterSubject('all'); setPage(1); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Programs" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Programs</SelectItem>
            {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.categoryName}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterClass} onValueChange={v => { setFilterClass(v); setFilterSubject('all'); setPage(1); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Classes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSubject} onValueChange={v => { setFilterSubject(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Subjects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.subjectName}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-0.5 border border-border/50 rounded-md p-0.5 bg-muted/30 ml-auto">
          <button
            onClick={() => setViewMode('list')}
            title="List view"
            className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <LayoutList className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            title="Grid view"
            className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top pagination */}
      <PaginationControls
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage(p => Math.max(1, p - 1))}
        onNext={() => setPage(p => Math.min(totalPages, p + 1))}
        total={totalLessons}
        itemLabel="videos"
        loading={loading}
      />

      {/* List / Grid */}
      {loading ? (
        viewMode === 'list' ? (
          <div className="border rounded-xl overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-none border-b" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
          </div>
        )
      ) : filtered.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Video className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No videos found</h3>
            <p className="text-muted-foreground text-sm mb-6">
              {lessons.length === 0
                ? 'Upload your first video lesson using a Vimeo URL.'
                : 'Try adjusting your filters.'}
            </p>
            {isPlatformAdmin && lessons.length === 0 && (
              <Button onClick={() => { setEditingLesson(null); setModalOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" /> Upload Video
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'list' ? (
        <div className="border border-border/50 rounded-xl overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-8 text-center text-xs">#</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-36">Class</TableHead>
                <TableHead className="w-36 hidden md:table-cell">Subject</TableHead>
                <TableHead className="hidden lg:table-cell">Program</TableHead>
                <TableHead className="w-16 text-center">Views</TableHead>
                <TableHead className="w-20 text-center">Status</TableHead>
                <TableHead className="w-28 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((lesson, idx) => {
                const vimeoId = extractVimeoId(lesson.vimeoUrl);
                const thumbUrl = vimeoId ? `https://vumbnail.com/${vimeoId}.jpg` : null;
                const className = getClassName(lesson.classId);
                const subjectName = getSubjectName(lesson.subjectId);
                const programName = getProgramName(lesson.programId);
                return (
                  <TableRow key={lesson.id} className="hover:bg-muted/30">
                    <TableCell className="text-center text-xs text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-8 rounded overflow-hidden bg-muted shrink-0">
                          {thumbUrl
                            ? <img src={thumbUrl} alt={lesson.title} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center"><Video className="w-4 h-4 text-muted-foreground/40" /></div>
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground line-clamp-1">{lesson.title}</p>
                          {lesson.description && <p className="text-xs text-muted-foreground line-clamp-1">{lesson.description}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {className
                        ? <Badge variant="outline" className="text-xs gap-1"><GraduationCap className="w-3 h-3" />{className}</Badge>
                        : <span className="text-muted-foreground text-xs">—</span>
                      }
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {subjectName
                        ? <Badge variant="outline" className="text-xs gap-1"><BookOpen className="w-3 h-3" />{subjectName}</Badge>
                        : <span className="text-muted-foreground text-xs">—</span>
                      }
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {programName
                        ? <span className="text-xs text-emerald-700 dark:text-emerald-400">{programName}</span>
                        : <span className="text-xs text-amber-600">Unassigned</span>
                      }
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        <Eye className="w-3 h-3" />{lesson.viewCount ?? 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={lesson.isActive !== false ? 'default' : 'secondary'} className="text-xs">
                        {lesson.isActive !== false ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPlayingLesson(lesson)} title="Play">
                          <Play className="w-3.5 h-3.5" />
                        </Button>
                        {isPlatformAdmin && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingLesson(lesson); setModalOpen(true); }} title="Edit">
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(lesson.id)}
                              disabled={deletingId === lesson.id}
                              title="Delete"
                            >
                              {deletingId === lesson.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(lesson => {
            const vimeoId = extractVimeoId(lesson.vimeoUrl);
            const thumbUrl = vimeoId ? `https://vumbnail.com/${vimeoId}.jpg` : null;
            const className = getClassName(lesson.classId);
            const subjectName = getSubjectName(lesson.subjectId);
            const programName = getProgramName(lesson.programId);

            return (
              <Card
                key={lesson.id}
                className="border-border/50 overflow-hidden group hover:shadow-md transition-shadow"
              >
                {/* Thumbnail */}
                <div className="relative bg-muted/30 aspect-video overflow-hidden">
                  {thumbUrl
                    ? <img src={thumbUrl} alt={lesson.title} className="w-full h-full object-cover" />
                    : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="w-12 h-12 text-muted-foreground/30" />
                      </div>
                    )
                  }
                  <button
                    onClick={() => setPlayingLesson(lesson)}
                    className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                      <Play className="w-6 h-6 text-primary ml-1" />
                    </div>
                  </button>
                  {!lesson.isActive && (
                    <Badge variant="secondary" className="absolute top-2 left-2 text-xs">Inactive</Badge>
                  )}
                </div>

                <CardContent className="p-4 space-y-2">
                  <h3 className="font-semibold text-foreground line-clamp-1">{lesson.title}</h3>

                  <div className="flex flex-wrap gap-1.5">
                    {className && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <GraduationCap className="w-3 h-3" />{className}
                      </Badge>
                    )}
                    {subjectName && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <BookOpen className="w-3 h-3" />{subjectName}
                      </Badge>
                    )}
                  </div>

                  <div>
                    {programName
                      ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                          <Tag className="w-3 h-3" /> {programName}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
                          Unassigned to program
                        </span>
                      )
                    }
                  </div>

                  {lesson.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{lesson.description}</p>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-border/50">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Eye className="w-3 h-3" /> {lesson.viewCount ?? 0}
                    </span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPlayingLesson(lesson)} title="Play">
                        <Play className="w-3.5 h-3.5" />
                      </Button>
                      {isPlatformAdmin && (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingLesson(lesson); setModalOpen(true); }} title="Edit">
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(lesson.id)}
                            disabled={deletingId === lesson.id}
                            title="Delete"
                          >
                            {deletingId === lesson.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Trash2 className="w-3.5 h-3.5" />
                            }
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Bottom pagination */}
      <PaginationControls
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage(p => Math.max(1, p - 1))}
        onNext={() => setPage(p => Math.min(totalPages, p + 1))}
        total={totalLessons}
        itemLabel="videos"
        loading={loading}
        className="mt-4"
      />

      {isPlatformAdmin && (
        <VideoModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
          lesson={editingLesson}
          classes={classes}
          subjects={subjects}
          programs={programs}
        />
      )}

      {playingLesson && (
        <VideoPlayerDialog
          lesson={playingLesson}
          onClose={() => setPlayingLesson(null)}
          classes={classes}
          subjects={subjects}
          programs={programs}
        />
      )}
    </PageTransition>
  );
};

export default VideoLessonsPage;
