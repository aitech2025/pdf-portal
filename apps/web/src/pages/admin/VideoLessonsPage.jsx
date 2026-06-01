import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Play, Download, Edit2, Trash2, Video, X, Search, ExternalLink, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { toast } from 'sonner';
import client from '@/lib/apiClient';

const extractVimeoId = (url) => {
  const patterns = [
    /vimeo\.com\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/
  ];
  for (const p of patterns) {
    const m = url?.match(p);
    if (m) return m[1];
  }
  return null;
};

const VimeoPlayer = ({ url, title }) => {
  const vimeoId = extractVimeoId(url);
  if (!vimeoId) {
    return (
      <div className="flex items-center justify-center bg-muted/30 rounded-lg h-64 text-muted-foreground">
        <p className="text-sm">Invalid Vimeo URL</p>
      </div>
    );
  }
  return (
    <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
      <iframe
        className="absolute inset-0 w-full h-full rounded-lg"
        src={`https://player.vimeo.com/video/${vimeoId}?title=0&byline=0&portrait=0`}
        title={title}
        frameBorder="0"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
};

const VideoLessonModal = ({ isOpen, onClose, onSave, lesson = null, programs = [], classes = [], subjects = [] }) => {
  const [form, setForm] = useState({
    title: '', description: '', vimeoUrl: '', programId: '', classId: '', subjectId: '', isActive: true
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(lesson
        ? { title: lesson.title || '', description: lesson.description || '', vimeoUrl: lesson.vimeoUrl || '', programId: lesson.programId || '', classId: lesson.classId || '', subjectId: lesson.subjectId || '', isActive: lesson.isActive !== false }
        : { title: '', description: '', vimeoUrl: '', programId: '', classId: '', subjectId: '', isActive: true }
      );
    }
  }, [isOpen, lesson]);

  const filteredClasses = classes.filter(c => c.categoryId === form.programId);
  const filteredSubjects = subjects.filter(s => s.classId === form.classId);
  const vimeoId = extractVimeoId(form.vimeoUrl);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.vimeoUrl || !form.programId || !form.classId) {
      toast.error('Title, Vimeo URL, Program, and Class are required');
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch {
      // toast handled upstream
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !saving && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-poppins text-xl">{lesson ? 'Edit Video Lesson' : 'Add Video Lesson'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Title <span className="text-destructive">*</span></Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Introduction to Algebra" required />
          </div>

          <div className="space-y-1">
            <Label>Vimeo URL <span className="text-destructive">*</span></Label>
            <Input value={form.vimeoUrl} onChange={e => setForm(f => ({ ...f, vimeoUrl: e.target.value }))} placeholder="https://vimeo.com/123456789" required />
            {vimeoId && <p className="text-xs text-emerald-600">Video ID: {vimeoId}</p>}
            {form.vimeoUrl && !vimeoId && <p className="text-xs text-destructive">Could not extract Vimeo ID from this URL</p>}
          </div>

          {/* Preview */}
          {vimeoId && (
            <div>
              <Label className="mb-2 block">Preview</Label>
              <VimeoPlayer url={form.vimeoUrl} title={form.title} />
            </div>
          )}

          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description..." className="resize-none h-20" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Program <span className="text-destructive">*</span></Label>
              <Select value={form.programId} onValueChange={v => setForm(f => ({ ...f, programId: v, classId: '', subjectId: '' }))}>
                <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                <SelectContent>
                  {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.categoryName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Class <span className="text-destructive">*</span></Label>
              <Select value={form.classId} onValueChange={v => setForm(f => ({ ...f, classId: v, subjectId: '' }))} disabled={!form.programId}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {filteredClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.subCategoryName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Subject (optional)</Label>
            <Select value={form.subjectId || 'none'} onValueChange={v => setForm(f => ({ ...f, subjectId: v === 'none' ? '' : v }))} disabled={!form.classId}>
              <SelectTrigger><SelectValue placeholder="No specific subject" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific subject</SelectItem>
                {filteredSubjects.map(s => <SelectItem key={s.id} value={s.id}>{s.subjectName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/50 p-3 bg-muted/20">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">Schools with access can view this lesson</p>
            </div>
            <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save Lesson'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const VideoPlayerDialog = ({ lesson, onClose }) => {
  const handleDownload = async () => {
    try {
      await client.fetch(`/videoLessons/${lesson.id}/download`, 'POST');
    } catch {}
    const vimeoId = extractVimeoId(lesson.vimeoUrl);
    window.open(`https://vimeo.com/${vimeoId}`, '_blank');
    toast.info('Opening Vimeo page — use the download option there if enabled by the uploader.');
  };

  return (
    <Dialog open={!!lesson} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-poppins">{lesson?.title}</DialogTitle>
        </DialogHeader>
        {lesson && (
          <div className="space-y-4">
            <VimeoPlayer url={lesson.vimeoUrl} title={lesson.title} />
            {lesson.description && <p className="text-sm text-muted-foreground">{lesson.description}</p>}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" /> Download
              </Button>
              <Button variant="outline" onClick={() => window.open(lesson.vimeoUrl, '_blank')}>
                <ExternalLink className="w-4 h-4 mr-2" /> Open in Vimeo
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const VideoLessonsPage = () => {
  const [lessons, setLessons] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterProgram, setFilterProgram] = useState('all');
  const [filterClass, setFilterClass] = useState('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [playingLesson, setPlayingLesson] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [lessonsRes, progsRes, clsRes, subjRes] = await Promise.all([
        client.fetch('/videoLessons/admin'),
        client.fetch('/categories'),
        client.fetch('/subCategories'),
        client.fetch('/subjects').catch(() => ({ items: [] }))
      ]);
      setLessons(lessonsRes?.items ?? []);
      setPrograms(progsRes?.items ?? []);
      setClasses(clsRes?.items ?? []);
      setSubjects(subjRes?.items ?? []);
    } catch (err) {
      toast.error(err.message || 'Failed to load video lessons');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async (formData) => {
    if (editingLesson) {
      await client.fetch(`/videoLessons/${editingLesson.id}`, 'PATCH', formData);
      toast.success('Lesson updated');
    } else {
      await client.fetch('/videoLessons', 'POST', formData);
      toast.success('Lesson created');
    }
    await fetchData();
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await client.fetch(`/videoLessons/${id}`, 'DELETE');
      toast.success('Lesson deleted');
      await fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const handlePlay = async (lesson) => {
    setPlayingLesson(lesson);
    try { await client.fetch(`/videoLessons/${lesson.id}/view`, 'POST'); } catch {}
  };

  const filteredLessons = lessons.filter(l => {
    const matchSearch = !search || l.title?.toLowerCase().includes(search.toLowerCase()) || l.description?.toLowerCase().includes(search.toLowerCase());
    const matchProgram = filterProgram === 'all' || l.programId === filterProgram;
    const matchClass = filterClass === 'all' || l.classId === filterClass;
    return matchSearch && matchProgram && matchClass;
  });

  const filteredClassesForFilter = filterProgram !== 'all' ? classes.filter(c => c.categoryId === filterProgram) : classes;

  const getProgramName = (id) => programs.find(p => p.id === id)?.categoryName || 'Unknown';
  const getClassName = (id) => classes.find(c => c.id === id)?.subCategoryName || 'Unknown';
  const getSubjectName = (id) => subjects.find(s => s.id === id)?.subjectName || '';

  return (
    <PageTransition className="space-y-6 pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-poppins font-bold text-foreground">Video Lessons</h1>
          <p className="text-muted-foreground mt-1">Manage Vimeo-hosted video lessons for programs and classes.</p>
        </div>
        <Button onClick={() => { setEditingLesson(null); setModalOpen(true); }} className="shadow-soft-sm">
          <Plus className="w-4 h-4 mr-2" /> Add Video Lesson
        </Button>
      </div>

      {/* Filters */}
      <Card className="shadow-soft-sm border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search lessons..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterProgram} onValueChange={v => { setFilterProgram(v); setFilterClass('all'); }}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Programs" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.categoryName}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterClass} onValueChange={setFilterClass} disabled={filterProgram === 'all'}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Classes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {filteredClassesForFilter.map(c => <SelectItem key={c.id} value={c.id}>{c.subCategoryName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lessons Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      ) : filteredLessons.length === 0 ? (
        <Card className="shadow-soft-sm border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Video className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No video lessons found</h3>
            <p className="text-muted-foreground text-sm mb-6">Create your first video lesson with a Vimeo URL.</p>
            <Button onClick={() => { setEditingLesson(null); setModalOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Add Video Lesson
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredLessons.map(lesson => {
            const vimeoId = extractVimeoId(lesson.vimeoUrl);
            const thumbUrl = vimeoId ? `https://vumbnail.com/${vimeoId}.jpg` : null;

            return (
              <Card key={lesson.id} className="shadow-soft-sm border-border/50 overflow-hidden group hover:shadow-soft-md transition-shadow">
                {/* Thumbnail */}
                <div className="relative bg-muted/30 aspect-video overflow-hidden">
                  {thumbUrl ? (
                    <img src={thumbUrl} alt={lesson.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="w-12 h-12 text-muted-foreground/30" />
                    </div>
                  )}
                  <button
                    onClick={() => handlePlay(lesson)}
                    className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                      <Play className="w-6 h-6 text-primary ml-1" />
                    </div>
                  </button>
                  {!lesson.isActive && (
                    <Badge variant="secondary" className="absolute top-2 left-2">Inactive</Badge>
                  )}
                </div>

                <CardContent className="p-4">
                  <h3 className="font-semibold text-foreground line-clamp-1 mb-1">{lesson.title}</h3>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <Badge variant="outline" className="text-xs">{getProgramName(lesson.programId)}</Badge>
                    <Badge variant="outline" className="text-xs">{getClassName(lesson.classId)}</Badge>
                    {lesson.subjectId && <Badge variant="outline" className="text-xs">{getSubjectName(lesson.subjectId)}</Badge>}
                  </div>
                  {lesson.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{lesson.description}</p>}

                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{lesson.viewCount || 0} views</span>
                      <span>{lesson.downloadCount || 0} downloads</span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePlay(lesson)}>
                        <Play className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingLesson(lesson); setModalOpen(true); }}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(lesson.id)}
                        disabled={deletingId === lesson.id}
                      >
                        {deletingId === lesson.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <VideoLessonModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        lesson={editingLesson}
        programs={programs}
        classes={classes}
        subjects={subjects}
      />

      {playingLesson && (
        <VideoPlayerDialog lesson={playingLesson} onClose={() => setPlayingLesson(null)} />
      )}
    </PageTransition>
  );
};

export default VideoLessonsPage;
