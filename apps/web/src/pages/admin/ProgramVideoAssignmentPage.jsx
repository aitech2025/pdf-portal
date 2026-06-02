import React, { useState, useEffect, useCallback } from 'react';
import {
  Video, Plus, X, GraduationCap, BookOpen, Tag, Loader2,
  ChevronRight, ListVideo, Search, CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageTransition from '@/components/PageTransition.jsx';
import { toast } from 'sonner';
import client from '@/lib/apiClient';

// ─── Video thumbnail card ─────────────────────────────────────────────────────
const extractVimeoId = url => {
  const m = url?.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
};

const VideoCard = ({ lesson, className, subjectName, actionLabel, actionVariant = 'outline', onAction, loading }) => {
  const vimeoId = extractVimeoId(lesson.vimeoUrl);
  const thumb = vimeoId ? `https://vumbnail.com/${vimeoId}.jpg` : null;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/20 transition-colors">
      <div className="w-24 h-14 rounded-md bg-muted overflow-hidden shrink-0">
        {thumb
          ? <img src={thumb} alt={lesson.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><Video className="w-6 h-6 text-muted-foreground/30" /></div>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground line-clamp-1">{lesson.title}</p>
        <div className="flex flex-wrap gap-1 mt-1">
          {className && (
            <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
              <GraduationCap className="w-3 h-3" />{className}
            </span>
          )}
          {subjectName && (
            <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
              <span className="text-border">•</span>
              <BookOpen className="w-3 h-3" />{subjectName}
            </span>
          )}
        </div>
      </div>
      <Button
        variant={actionVariant}
        size="sm"
        onClick={onAction}
        disabled={loading}
        className="shrink-0"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : actionLabel}
      </Button>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const ProgramVideoAssignmentPage = () => {
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [assignedVideos, setAssignedVideos] = useState([]);
  const [repoVideos, setRepoVideos] = useState([]);   // all admin videos (for assignment)
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [actioning, setActioning] = useState({}); // { [videoId]: true }
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [repoSearch, setRepoSearch] = useState('');
  const [repoFilterClass, setRepoFilterClass] = useState('all');
  const [repoFilterSubject, setRepoFilterSubject] = useState('all');

  // Load programs (categories) + lookup data
  useEffect(() => {
    const load = async () => {
      setLoadingPrograms(true);
      try {
        const [progsRes, clsRes, subjRes] = await Promise.all([
          client.fetch('/categories'),
          client.fetch('/masterClasses'),
          client.fetch('/masterSubjects')
        ]);
        setPrograms(progsRes?.items ?? []);
        setClasses(clsRes?.items ?? []);
        setSubjects(subjRes?.items ?? []);
      } catch (err) {
        toast.error('Failed to load programs');
      } finally {
        setLoadingPrograms(false);
      }
    };
    load();
  }, []);

  // Load videos when a program is selected
  const loadVideos = useCallback(async (programId) => {
    if (!programId) return;
    setLoadingVideos(true);
    try {
      const [assignedRes, repoRes] = await Promise.all([
        client.fetch(`/programs/${programId}/videos`),
        client.fetch('/videoLessons/admin')
      ]);
      setAssignedVideos(assignedRes?.items ?? []);
      setRepoVideos(repoRes?.items ?? []);
    } catch (err) {
      toast.error('Failed to load videos');
    } finally {
      setLoadingVideos(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProgram) {
      loadVideos(selectedProgram.id);
      setSearch(''); setFilterClass('all'); setFilterSubject('all');
      setRepoSearch(''); setRepoFilterClass('all'); setRepoFilterSubject('all');
    }
  }, [selectedProgram, loadVideos]);

  const assignedIds = new Set(assignedVideos.map(v => v.id));

  const handleAssign = async (videoId) => {
    setActioning(a => ({ ...a, [videoId]: true }));
    try {
      await client.fetch(`/programs/${selectedProgram.id}/videos`, 'POST', { videoId });
      toast.success('Video assigned to program');
      await loadVideos(selectedProgram.id);
    } catch (err) {
      toast.error(err.message || 'Failed to assign video');
    } finally {
      setActioning(a => ({ ...a, [videoId]: false }));
    }
  };

  const handleUnassign = async (videoId) => {
    setActioning(a => ({ ...a, [videoId]: true }));
    try {
      await client.fetch(`/programs/${selectedProgram.id}/videos/${videoId}`, 'DELETE');
      toast.success('Video removed from program');
      await loadVideos(selectedProgram.id);
    } catch (err) {
      toast.error(err.message || 'Failed to unassign video');
    } finally {
      setActioning(a => ({ ...a, [videoId]: false }));
    }
  };

  const getClassName = id => classes.find(c => c.id === id)?.className || '';
  const getSubjectName = id => subjects.find(s => s.id === id)?.subjectName || '';

  // Unassigned videos available to add (those not already assigned to THIS program)
  const availableToAssign = repoVideos.filter(v => !assignedIds.has(v.id));

  const filteredAssigned = assignedVideos.filter(v => {
    if (search && !v.title?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterClass !== 'all' && v.classId !== filterClass) return false;
    if (filterSubject !== 'all' && v.subjectId !== filterSubject) return false;
    return true;
  });

  const filteredAvailable = availableToAssign.filter(v => {
    if (repoSearch && !v.title?.toLowerCase().includes(repoSearch.toLowerCase())) return false;
    if (repoFilterClass !== 'all' && v.classId !== repoFilterClass) return false;
    if (repoFilterSubject !== 'all' && v.subjectId !== repoFilterSubject) return false;
    return true;
  });

  return (
    <PageTransition className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-poppins font-bold text-foreground">Program Videos</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Assign video lessons from the repository to programs. Schools access videos through their assigned programs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Left: Programs list */}
        <Card className="border-border/50 h-fit">
          <CardHeader className="p-4 pb-3 border-b border-border/50">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Programs
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            {loadingPrograms ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : programs.length === 0 ? (
              <p className="text-sm text-muted-foreground p-3">No programs found.</p>
            ) : (
              <div className="space-y-0.5">
                {programs.map(prog => {
                  const isSelected = selectedProgram?.id === prog.id;
                  return (
                    <button
                      key={prog.id}
                      onClick={() => setSelectedProgram(prog)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-md text-sm transition-colors text-left ${
                        isSelected
                          ? 'bg-primary text-primary-foreground font-medium'
                          : 'text-foreground hover:bg-muted/60'
                      }`}
                    >
                      <span className="truncate">{prog.categoryName}</span>
                      <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'opacity-70' : 'opacity-30'}`} />
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Video assignment panel */}
        {!selectedProgram ? (
          <Card className="border-border/50 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <ListVideo className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">Select a program to manage its video assignments</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {/* Program header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <ListVideo className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{selectedProgram.categoryName}</h2>
                {selectedProgram.categoryType && (
                  <p className="text-xs text-muted-foreground">{selectedProgram.categoryType}</p>
                )}
              </div>
              <Badge variant="secondary" className="ml-auto">
                {assignedVideos.length} video{assignedVideos.length !== 1 ? 's' : ''} assigned
              </Badge>
            </div>

            <Tabs defaultValue="assigned">
              <TabsList>
                <TabsTrigger value="assigned">
                  Assigned Videos ({assignedVideos.length})
                </TabsTrigger>
                <TabsTrigger value="repository">
                  Add from Repository ({availableToAssign.length})
                </TabsTrigger>
              </TabsList>

              {/* Assigned tab */}
              <TabsContent value="assigned" className="mt-4">
                {loadingVideos ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <div className="relative flex-1 min-w-[180px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search assigned videos..."
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <Select value={filterClass} onValueChange={v => { setFilterClass(v); setFilterSubject('all'); }}>
                        <SelectTrigger className="w-40"><SelectValue placeholder="All Classes" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Classes</SelectItem>
                          {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={filterSubject} onValueChange={setFilterSubject}>
                        <SelectTrigger className="w-40"><SelectValue placeholder="All Subjects" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Subjects</SelectItem>
                          {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.subjectName}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {filteredAssigned.length === 0 ? (
                      <Card className="border-dashed border-border/50">
                        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                          <Video className="w-10 h-10 text-muted-foreground/30 mb-3" />
                          <p className="text-sm font-medium text-foreground">No videos assigned yet</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Switch to the "Add from Repository" tab to assign videos to this program.
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-2">
                        {filteredAssigned.map(video => (
                          <VideoCard
                            key={video.id}
                            lesson={video}
                            className={getClassName(video.classId)}
                            subjectName={getSubjectName(video.subjectId)}
                            actionLabel="Remove"
                            actionVariant="outline"
                            onAction={() => handleUnassign(video.id)}
                            loading={actioning[video.id]}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Repository tab */}
              <TabsContent value="repository" className="mt-4">
                {loadingVideos ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <div className="relative flex-1 min-w-[180px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search video repository..."
                          value={repoSearch}
                          onChange={e => setRepoSearch(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <Select value={repoFilterClass} onValueChange={v => { setRepoFilterClass(v); setRepoFilterSubject('all'); }}>
                        <SelectTrigger className="w-40"><SelectValue placeholder="All Classes" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Classes</SelectItem>
                          {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={repoFilterSubject} onValueChange={setRepoFilterSubject}>
                        <SelectTrigger className="w-40"><SelectValue placeholder="All Subjects" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Subjects</SelectItem>
                          {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.subjectName}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {filteredAvailable.length === 0 ? (
                      <Card className="border-dashed border-border/50">
                        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                          <CheckCircle2 className="w-10 h-10 text-emerald-500/50 mb-3" />
                          <p className="text-sm font-medium text-foreground">
                            {repoVideos.length === 0
                              ? 'No videos in repository yet'
                              : 'All repository videos are assigned to this program'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {repoVideos.length === 0
                              ? 'Upload videos from the Video Repository page first.'
                              : 'Upload more videos or check other programs.'}
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-2">
                        {filteredAvailable.map(video => (
                          <VideoCard
                            key={video.id}
                            lesson={video}
                            className={getClassName(video.classId)}
                            subjectName={getSubjectName(video.subjectId)}
                            actionLabel={<><Plus className="w-3.5 h-3.5 mr-1" />Assign</>}
                            actionVariant="default"
                            onAction={() => handleAssign(video.id)}
                            loading={actioning[video.id]}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </PageTransition>
  );
};

export default ProgramVideoAssignmentPage;
