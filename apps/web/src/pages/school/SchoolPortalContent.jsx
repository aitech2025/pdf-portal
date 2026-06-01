import React, { useState, useEffect, useMemo } from 'react';
import pb from '@/lib/apiClient';
import { toast } from 'sonner';
import {
  FileText,
  FolderOpen,
  BookOpen,
  Download,
  ChevronRight,
  ArrowLeft,
  Bookmark,
  Eye,
  Search,
  X,
  Layers,
  GraduationCap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';
import PDFViewer from '@/components/PDFViewer.jsx';
import { cn } from '@/lib/utils';

const formatSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const SchoolPortalContent = ({ school }) => {
  const [step, setStep] = useState(1);
  const [programs, setPrograms] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [pdfs, setPdfs] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pdfsLoading, setPdfsLoading] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [search, setSearch] = useState('');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentPdf, setCurrentPdf] = useState(null);
  const [selectedPdfIds, setSelectedPdfIds] = useState([]);

  const authHeader = { Authorization: `Bearer ${pb.authStore.token}` };

  const apiFetch = async (url) => {
    const res = await fetch(url, { headers: authHeader });
    if (!res.ok) throw new Error(`Request failed: ${url}`);
    return res.json();
  };

  useEffect(() => {
    loadInitial();
  }, [school]);

  const loadInitial = async () => {
    try {
      setLoading(true);
      const [progRes, classRes, subjRes] = await Promise.all([
        apiFetch(`/api/schools/${school.id}/categories`),
        apiFetch(`/api/schools/${school.id}/classes`),
        apiFetch(`/api/schools/${school.id}/subjects`)
      ]);
      setPrograms(progRes.items || []);
      setAllClasses(classRes.items || []);
      setAllSubjects(subjRes.items || []);
    } catch {
      toast.error('Failed to load your content library');
    } finally {
      setLoading(false);
    }
  };

  const fetchPdfs = async (programId, classId, subjectId) => {
    try {
      setPdfsLoading(true);
      const data = await apiFetch(
        `/api/pdfs?categoryId=${programId}&classId=${classId}&subjectId=${subjectId}&per_page=500`
      );
      setPdfs(data.items || []);
      setSelectedPdfIds([]);
    } catch {
      toast.error('Failed to load PDFs');
    } finally {
      setPdfsLoading(false);
    }
  };

  const handleProgramClick = (prog) => {
    setSelectedProgram(prog);
    setSelectedClass(null);
    setSelectedSubject(null);
    setStep(2);
    setSearch('');
  };

  const handleClassClick = (cls) => {
    setSelectedClass(cls);
    setSelectedSubject(null);
    setStep(3);
    setSearch('');
  };

  const handleSubjectClick = (subj) => {
    setSelectedSubject(subj);
    setStep(4);
    setSearch('');
    fetchPdfs(selectedProgram.categoryId, selectedClass.classId, subj.subjectId);
  };

  const goToStep = (n) => {
    setStep(n);
    setSearch('');
    if (n <= 1) { setSelectedProgram(null); setSelectedClass(null); setSelectedSubject(null); }
    if (n <= 2) { setSelectedClass(null); setSelectedSubject(null); }
    if (n <= 3) { setSelectedSubject(null); setPdfs([]); }
  };

  // Derived lists
  const filteredPrograms = useMemo(
    () => programs.filter((p) => !search || (p.categoryName ?? '').toLowerCase().includes(search.toLowerCase())),
    [programs, search]
  );

  const classesForProgram = useMemo(
    () => allClasses.filter((c) => c.programId === selectedProgram?.categoryId),
    [allClasses, selectedProgram]
  );

  const filteredClasses = useMemo(
    () => classesForProgram.filter((c) => !search || (c.className ?? '').toLowerCase().includes(search.toLowerCase())),
    [classesForProgram, search]
  );

  const subjectsForClass = useMemo(
    () =>
      allSubjects.filter(
        (s) => s.programId === selectedProgram?.categoryId && s.classId === selectedClass?.classId
      ),
    [allSubjects, selectedProgram, selectedClass]
  );

  const filteredSubjects = useMemo(
    () => subjectsForClass.filter((s) => !search || (s.subjectName ?? '').toLowerCase().includes(search.toLowerCase())),
    [subjectsForClass, search]
  );

  const filteredPdfs = useMemo(
    () =>
      pdfs.filter(
        (p) =>
          !search ||
          (p.fileName ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (p.pdfId ?? '').toLowerCase().includes(search.toLowerCase())
      ),
    [pdfs, search]
  );

  const allFilteredSelected = filteredPdfs.length > 0 && filteredPdfs.every((p) => selectedPdfIds.includes(p.id));

  const togglePdfSelection = (id) =>
    setSelectedPdfIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleDownloadSingle = async (pdf, e) => {
    e?.stopPropagation();
    try {
      const res = await fetch(`/api/pdfs/${pdf.id}/download`, { headers: authHeader });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = pdf.fileName || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);
      toast.success('Download complete');
    } catch {
      toast.error('Download failed');
    }
  };

  const handleBookmark = async (pdf, e) => {
    e?.stopPropagation();
    try {
      await fetch('/api/favorites', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfId: pdf.id })
      });
      toast.success('Added to bookmarks');
    } catch {
      toast.error('Could not bookmark PDF');
    }
  };

  const handleBulkDownload = async () => {
    if (selectedPdfIds.length === 0) return;
    setDownloadingZip(true);
    try {
      const archiveName = `${selectedProgram?.categoryName || 'pdfs'}-${selectedClass?.className || ''}-${selectedSubject?.subjectName || 'bundle'}.zip`
        .replace(/\s+/g, '-')
        .replace(/[^\w.\-]+/g, '');
      const res = await fetch('/api/pdfs/bulk-download', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedPdfIds, archiveName })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Bulk download failed');
      }
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = archiveName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);
      toast.success(`Downloaded ${selectedPdfIds.length} files`);
      setSelectedPdfIds([]);
    } catch (err) {
      toast.error(err?.message || 'Failed to create archive');
    } finally {
      setDownloadingZip(false);
    }
  };

  const searchPlaceholder =
    step === 1 ? 'Search programs…' : step === 2 ? 'Search classes…' : step === 3 ? 'Search subjects…' : 'Search PDFs…';

  return (
    <div className="container max-w-7xl mx-auto py-6 px-4 space-y-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-poppins font-bold tracking-tight">Content Library</h1>
            <p className="text-muted-foreground mt-1">
              Browse, preview and download materials from your assigned programs.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Breadcrumb */}
        {step > 1 && (
          <div className="flex items-center flex-wrap text-sm text-muted-foreground font-medium gap-1">
            <button onClick={() => goToStep(1)} className="hover:text-primary transition-colors">
              Programs
            </button>
            {step >= 2 && (
              <>
                <ChevronRight className="w-4 h-4 opacity-50" />
                <button
                  onClick={() => step > 2 ? goToStep(2) : null}
                  className={cn(step === 2 ? 'text-foreground font-semibold' : 'hover:text-primary transition-colors')}
                >
                  {selectedProgram?.categoryName}
                </button>
              </>
            )}
            {step >= 3 && (
              <>
                <ChevronRight className="w-4 h-4 opacity-50" />
                <button
                  onClick={() => step > 3 ? goToStep(3) : null}
                  className={cn(step === 3 ? 'text-foreground font-semibold' : 'hover:text-primary transition-colors')}
                >
                  {selectedClass?.className}
                </button>
              </>
            )}
            {step >= 4 && (
              <>
                <ChevronRight className="w-4 h-4 opacity-50" />
                <span className="text-foreground font-semibold">{selectedSubject?.subjectName}</span>
              </>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="animate-in fade-in duration-300">

          {/* STEP 1: PROGRAMS */}
          {step === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPrograms.length === 0 ? (
                <div className="col-span-full py-16 text-center border rounded-xl border-dashed">
                  <Layers className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground font-medium">
                    {programs.length === 0
                      ? 'No programs are assigned to your school yet.'
                      : 'No programs match your search.'}
                  </p>
                </div>
              ) : (
                filteredPrograms.map((prog) => (
                  <Card
                    key={prog.categoryId}
                    className="cursor-pointer hover:shadow-soft-md transition-all hover:border-primary/40 group border-border/50"
                    onClick={() => handleProgramClick(prog)}
                  >
                    <CardHeader className="pb-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-[var(--radius-lg)] flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                        <FolderOpen className="w-6 h-6 text-primary" />
                      </div>
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        {prog.categoryName}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        {prog.categoryCode && (
                          <span className="font-mono text-[10px] text-muted-foreground">{prog.categoryCode}</span>
                        )}
                        <Badge variant="secondary" className="text-[10px] h-5">
                          {allClasses.filter((c) => c.programId === prog.categoryId).length} class(es)
                        </Badge>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Open program</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* STEP 2: CLASSES */}
          {step === 2 && (
            <div className="space-y-5">
              <Button variant="outline" size="sm" onClick={() => goToStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to programs
              </Button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredClasses.length === 0 ? (
                  <div className="col-span-full py-16 text-center border rounded-xl border-dashed">
                    <GraduationCap className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground font-medium">
                      {classesForProgram.length === 0
                        ? 'No classes are assigned for this program.'
                        : 'No classes match your search.'}
                    </p>
                  </div>
                ) : (
                  filteredClasses.map((cls) => (
                    <Card
                      key={cls.classId}
                      className="cursor-pointer hover:shadow-soft-md transition-all border-l-4 border-l-primary border-border/50"
                      onClick={() => handleClassClick(cls)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start gap-3">
                          <div className="min-w-0">
                            <CardTitle className="text-base">{cls.className}</CardTitle>
                            <CardDescription className="font-medium text-foreground/80 mt-1">
                              {allSubjects.filter(
                                (s) => s.programId === selectedProgram?.categoryId && s.classId === cls.classId
                              ).length}{' '}
                              subject(s)
                            </CardDescription>
                          </div>
                          <GraduationCap className="w-5 h-5 text-muted-foreground shrink-0" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Open class</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {/* STEP 3: SUBJECTS */}
          {step === 3 && (
            <div className="space-y-5">
              <Button variant="outline" size="sm" onClick={() => goToStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to classes
              </Button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredSubjects.length === 0 ? (
                  <div className="col-span-full py-16 text-center border rounded-xl border-dashed">
                    <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground font-medium">
                      {subjectsForClass.length === 0
                        ? 'No subjects are assigned for this class.'
                        : 'No subjects match your search.'}
                    </p>
                  </div>
                ) : (
                  filteredSubjects.map((subj) => (
                    <Card
                      key={subj.subjectId}
                      className="cursor-pointer hover:shadow-soft-md transition-all border-l-4 border-l-violet-500 border-border/50"
                      onClick={() => handleSubjectClick(subj)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start gap-3">
                          <div className="min-w-0">
                            <CardTitle className="text-base">{subj.subjectName}</CardTitle>
                            {subj.subjectCode && (
                              <CardDescription className="font-mono text-[10px] mt-1">
                                {subj.subjectCode}
                              </CardDescription>
                            )}
                          </div>
                          <BookOpen className="w-5 h-5 text-muted-foreground shrink-0" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>View PDFs</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {/* STEP 4: PDFs */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 p-3 rounded-xl border border-border/50">
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => goToStep(3)}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  {pdfsLoading ? (
                    <span className="text-sm text-muted-foreground">Loading PDFs…</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {filteredPdfs.length} PDF{filteredPdfs.length !== 1 ? 's' : ''}
                      {selectedPdfIds.length > 0 && (
                        <span className="ml-2 text-foreground font-medium">
                          · {selectedPdfIds.length} selected
                        </span>
                      )}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={filteredPdfs.length === 0}
                    onClick={() => setSelectedPdfIds(allFilteredSelected ? [] : filteredPdfs.map((p) => p.id))}
                  >
                    {allFilteredSelected ? 'Deselect all' : 'Select all'}
                  </Button>
                  <Button
                    onClick={handleBulkDownload}
                    disabled={selectedPdfIds.length === 0 || downloadingZip}
                    size="sm"
                  >
                    {downloadingZip ? (
                      <LoadingSpinner text="" className="p-0 h-4 w-4 mr-2" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Download ZIP
                  </Button>
                </div>
              </div>

              {pdfsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-48 rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredPdfs.length === 0 ? (
                    <div className="col-span-full py-16 text-center border rounded-xl border-dashed">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground font-medium">
                        {pdfs.length === 0 ? 'No PDFs in this section yet.' : 'No PDFs match your search.'}
                      </p>
                    </div>
                  ) : (
                    filteredPdfs.map((pdf) => {
                      const selected = selectedPdfIds.includes(pdf.id);
                      return (
                        <Card
                          key={pdf.id}
                          className={cn(
                            'relative overflow-hidden transition-all group cursor-pointer',
                            selected
                              ? 'ring-2 ring-primary border-primary'
                              : 'hover:border-primary/40 hover:shadow-soft-md border-border/50'
                          )}
                          onClick={() => {
                            setCurrentPdf(pdf);
                            setViewerOpen(true);
                          }}
                        >
                          <div className="absolute top-3 left-3 z-10" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selected}
                              onCheckedChange={() => togglePdfSelection(pdf.id)}
                              className={cn(
                                'bg-background/80 backdrop-blur-sm',
                                !selected && 'opacity-0 group-hover:opacity-100 transition-opacity'
                              )}
                            />
                          </div>

                          <div className="p-5 pt-10 flex flex-col h-full">
                            <div className="mx-auto w-16 h-20 bg-rose-100 dark:bg-rose-950/40 rounded shadow-sm flex items-center justify-center mb-3 relative">
                              <div className="absolute top-0 right-0 w-4 h-4 bg-background rounded-bl" />
                              <span className="font-bold text-rose-600 dark:text-rose-400 text-xs">PDF</span>
                            </div>

                            <div className="text-center">
                              <h3
                                className="font-semibold text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors"
                                title={pdf.fileName}
                              >
                                {pdf.fileName}
                              </h3>
                              <div className="flex items-center justify-center gap-2 mt-1.5 flex-wrap">
                                {pdf.pdfId && (
                                  <Badge variant="outline" className="text-[10px] h-4 font-mono">
                                    {pdf.pdfId}
                                  </Badge>
                                )}
                                <span className="text-[11px] text-muted-foreground font-mono">
                                  {formatSize(pdf.fileSize)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="border-t bg-muted/30 p-2 flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-1 text-xs h-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentPdf(pdf);
                                setViewerOpen(true);
                              }}
                            >
                              <Eye className="w-3 h-3 mr-1" /> View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-1 text-xs h-8"
                              onClick={(e) => handleBookmark(pdf, e)}
                            >
                              <Bookmark className="w-3 h-3 mr-1" /> Save
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-1 text-xs h-8"
                              onClick={(e) => handleDownloadSingle(pdf, e)}
                            >
                              <Download className="w-3 h-3 mr-1" /> Get
                            </Button>
                          </div>
                        </Card>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {currentPdf && (
        <PDFViewer
          isOpen={viewerOpen}
          onClose={() => {
            setViewerOpen(false);
            setTimeout(() => setCurrentPdf(null), 300);
          }}
          pdfId={currentPdf.id}
          title={`${selectedProgram?.categoryName ? `[${selectedProgram.categoryName}] ` : ''}${currentPdf.fileName}`}
          onDownload={() => handleDownloadSingle(currentPdf)}
        />
      )}
    </div>
  );
};

export default SchoolPortalContent;
