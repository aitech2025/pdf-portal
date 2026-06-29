
import React, { useState, useEffect, useCallback } from 'react';
import pb from '@/lib/apiClient';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Trash2, FileText, Filter, Upload, X, History, FilePlus, GraduationCap, BookOpen, Layers, Loader2 } from 'lucide-react';
import PageTransition from '@/components/PageTransition.jsx';
import FileUploadZone from '@/components/FileUploadZone.jsx';
import ProgressIndicator from '@/components/ProgressIndicator.jsx';
import ConfirmationModal from '@/components/ConfirmationModal.jsx';
import EnhancedPDFViewer from '@/components/EnhancedPDFViewer.jsx';
import VersionHistoryModal from '@/components/admin/pdfs/VersionHistoryModal.jsx';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBytes, cn, getPdfCode, matchesSearch } from '@/lib/utils';
import { usePDFVersioning } from '@/hooks/usePDFVersioning.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { motion, AnimatePresence } from 'framer-motion';

const getToken = () => {
  try { return pb.authStore.token || localStorage.getItem('authToken') || ''; } catch { return ''; }
};

const apiFetch = async (url, options = {}) => {
  const token = getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  if (!res.ok) { const err = await res.json().catch(() => ({ detail: res.statusText })); throw new Error(err.detail || 'Request failed'); }
  return res.status === 204 ? null : res.json();
};

const PDFUploadManagement = () => {
  const { currentUser } = useAuth();
  const [pdfs, setPdfs] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Filter state
  const [filterProgram, setFilterProgram] = useState('all');
  const [filterClass, setFilterClass] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [search, setSearch] = useState('');

  // Upload form state
  const [uploadProgram, setUploadProgram] = useState('');
  const [uploadClass, setUploadClass] = useState('');
  const [uploadSubject, setUploadSubject] = useState('');
  const [versionNotes, setVersionNotes] = useState('');

  // Program structure for upload form (classes + subjects)
  const [uploadStructure, setUploadStructure] = useState(null);
  const [structureLoading, setStructureLoading] = useState(false);

  // Program structure for filter (classes + subjects)
  const [filterStructure, setFilterStructure] = useState(null);

  const [selectedPdf, setSelectedPdf] = useState(null);
  const [isUploadMode, setIsUploadMode] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [pdfToDelete, setPdfToDelete] = useState(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const { uploadNewVersion } = usePDFVersioning();

  // ── fetch PDF list ──
  const fetchPdfs = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: '1', per_page: '200' });
      if (filterProgram && filterProgram !== 'all') params.set('categoryId', filterProgram);
      if (filterClass && filterClass !== 'all') params.set('classId', filterClass);
      if (filterSubject && filterSubject !== 'all') params.set('subjectId', filterSubject);
      const res = await apiFetch(`/api/pdfs?${params}`);
      setPdfs(res?.items ?? []);
    } catch {
      toast.error('Failed to load PDFs');
    }
  }, [filterProgram, filterClass, filterSubject]);

  // ── initial load ──
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const progRes = await apiFetch('/api/categories');
      setPrograms(progRes?.items ?? []);
    } catch {
      toast.error('Failed to load programs');
    } finally {
      setLoading(false);
    }
    await fetchPdfs();
  }, [fetchPdfs]);

  useEffect(() => { fetchData(); }, []);

  // Re-fetch PDFs whenever filters change
  useEffect(() => { fetchPdfs(); }, [fetchPdfs]);

  // ── load structure for upload form ──
  const loadUploadStructure = useCallback(async (programId) => {
    if (!programId) { setUploadStructure(null); return; }
    setStructureLoading(true);
    try {
      const data = await apiFetch(`/api/programs/${programId}/structure`);
      setUploadStructure(data);
    } catch {
      setUploadStructure(null);
    } finally {
      setStructureLoading(false);
    }
  }, []);

  // ── load structure for filter ──
  const loadFilterStructure = useCallback(async (programId) => {
    if (!programId || programId === 'all') { setFilterStructure(null); return; }
    try {
      const data = await apiFetch(`/api/programs/${programId}/structure`);
      setFilterStructure(data);
    } catch {
      setFilterStructure(null);
    }
  }, []);

  const handleUploadProgramChange = (v) => {
    setUploadProgram(v);
    setUploadClass('');
    setUploadSubject('');
    setUploadStructure(null);
    if (v) loadUploadStructure(v);
  };

  const handleUploadClassChange = (v) => {
    setUploadClass(v);
    setUploadSubject('');
  };

  const handleFilterProgramChange = (v) => {
    setFilterProgram(v);
    setFilterClass('all');
    setFilterSubject('all');
    loadFilterStructure(v);
  };

  const handleFilterClassChange = (v) => {
    setFilterClass(v);
    setFilterSubject('all');
  };

  // Classes and subjects for upload form
  const uploadClasses = uploadStructure?.classes ?? [];
  const uploadSubjects = uploadClasses.find(c => c.classId === uploadClass)?.subjects ?? [];

  // Classes and subjects for filter
  const filterClasses = filterStructure?.classes ?? [];
  const filterSubjects = filterClasses.find(c => c.classId === filterClass)?.subjects ?? [];

  // ── file upload ──
  const handleFileUpload = async (files) => {
    if (!uploadProgram || !uploadClass) {
      toast.error('Please select Program and Class before uploading.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    let successCount = 0;

    const zipFiles = files.filter(f => f.name.toLowerCase().endsWith('.zip'));
    const pdfFiles = files.filter(f => !f.name.toLowerCase().endsWith('.zip'));

    // Handle ZIP files first
    for (let i = 0; i < zipFiles.length; i++) {
      const zip = zipFiles[i];
      try {
        setUploadProgress(Math.floor((i / files.length) * 80) + 5);
        const formData = new FormData();
        formData.append('categoryId', uploadProgram);
        formData.append('classId', uploadClass);
        if (uploadSubject) formData.append('subjectId', uploadSubject);
        formData.append('versionNotes', versionNotes || 'Extracted from ZIP');
        formData.append('file', zip);

        const token = getToken();
        const res = await fetch('/api/pdfs/upload-zip', {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: res.statusText }));
          throw new Error(err.detail || 'ZIP upload failed');
        }
        const result = await res.json();
        successCount += result.created ?? 0;
        if (result.created > 0) {
          toast.success(`Extracted ${result.created} PDF(s) from ${zip.name}`);
        }
        if (result.skipped?.length > 0) {
          toast.warning(`${result.skipped.length} file(s) skipped (not PDFs or failed)`);
        }
      } catch (err) {
        toast.error(`Failed to process ${zip.name}: ${err.message || 'Unknown error'}`);
      }
    }

    // Handle individual PDF files
    for (let i = 0; i < pdfFiles.length; i++) {
      const file = pdfFiles[i];
      try {
        setUploadProgress(Math.floor(((zipFiles.length + i) / files.length) * 80) + 10);

        // Check for existing PDF with same name in this combination
        const checkParams = new URLSearchParams({ categoryId: uploadProgram, classId: uploadClass });
        if (uploadSubject) checkParams.set('subjectId', uploadSubject);
        const existingRes = await apiFetch(`/api/pdfs?${checkParams}`);
        const existingPdf = (existingRes?.items ?? []).find(p =>
          (p.fileName || p.file_name) === file.name
        );

        if (existingPdf) {
          await uploadNewVersion(existingPdf.id, file, versionNotes, currentUser.id);
          successCount++;
          if (i === pdfFiles.length - 1 && zipFiles.length === 0) {
            const fullRecord = await apiFetch(`/api/pdfs/${existingPdf.id}`);
            setSelectedPdf(fullRecord);
            setIsUploadMode(false);
          }
        } else {
          const formData = new FormData();
          formData.append('fileName', file.name);
          formData.append('categoryId', uploadProgram);
          formData.append('classId', uploadClass);
          if (uploadSubject) formData.append('subjectId', uploadSubject);
          formData.append('isActive', 'true');
          formData.append('status', 'approved');
          formData.append('versionNotes', versionNotes || 'Initial upload');
          formData.append('file', file);

          const newRecord = await pb.uploadPdf(formData);
          successCount++;

          if (i === pdfFiles.length - 1 && zipFiles.length === 0) {
            const fullRecord = await apiFetch(`/api/pdfs/${newRecord.id}`);
            setSelectedPdf(fullRecord);
            setIsUploadMode(false);
          }
        }
      } catch (err) {
        toast.error(`Failed to process ${file.name}: ${err.message || 'Unknown error'}`);
      }
    }

    setUploadProgress(100);
    setTimeout(() => {
      setUploading(false);
      setUploadProgress(0);
      setVersionNotes('');
      if (successCount > 0) {
        toast.success(`Successfully processed ${successCount} file(s)`);
        fetchPdfs();
      }
    }, 500);
  };

  const confirmDelete = async () => {
    if (!pdfToDelete) return;
    try {
      await pb.collection('pdfs').delete(pdfToDelete, { $autoCancel: false });
      toast.success('PDF deleted');
      if (selectedPdf?.id === pdfToDelete) setSelectedPdf(null);
      fetchPdfs();
    } catch {
      toast.error('Failed to delete PDF');
    } finally {
      setPdfToDelete(null);
    }
  };

  const getProgramName = (id) => programs.find(p => p.id === id)?.categoryName || '';

  const filteredPdfs = pdfs.filter(p =>
    matchesSearch(
      search,
      p.fileName || p.file_name,
      getPdfCode(p),
      getProgramName(p.categoryId || p.category_id),
      p.className || p.class_name,
      p.subjectName || p.subject_name,
      p.description, p.tags
    )
  );

  return (
    <PageTransition>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-poppins font-bold text-foreground">PDF Management</h1>
          <p className="text-muted-foreground mt-1">Upload PDFs tagged by Program → Class → Subject for organized delivery.</p>
        </div>
        <Button
          onClick={() => { setIsUploadMode(!isUploadMode); setSelectedPdf(null); }}
          variant={isUploadMode ? "outline" : "default"}
          className="shadow-soft-sm"
        >
          {isUploadMode ? <><X className="w-4 h-4 mr-2" /> Cancel</> : <><Upload className="w-4 h-4 mr-2" /> Upload New</>}
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-12rem)] min-h-[600px]">
        {/* ── Left Panel ── */}
        <div className={cn(
          "w-full lg:w-1/3 flex flex-col gap-4 overflow-hidden transition-all duration-300",
          selectedPdf && !isUploadMode ? "hidden lg:flex" : "flex"
        )}>
          {isUploadMode ? (
            <Card className="flex-1 shadow-soft-md border-border/60 overflow-y-auto">
              <CardHeader className="bg-muted/20 border-b border-border/50 sticky top-0 z-10 backdrop-blur-sm">
                <CardTitle>Upload PDF</CardTitle>
                <CardDescription>Select Program → Class → Subject, then upload files</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">

                {/* Program */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-muted-foreground" /> Program <span className="text-destructive">*</span>
                  </label>
                  <Select value={uploadProgram} onValueChange={handleUploadProgramChange}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Select program..." /></SelectTrigger>
                    <SelectContent>
                      {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.categoryName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Class */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <GraduationCap className="w-3.5 h-3.5 text-muted-foreground" /> Class <span className="text-destructive">*</span>
                  </label>
                  {structureLoading ? (
                    <div className="flex items-center gap-2 h-10 px-3 border border-border/50 rounded-md text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                    </div>
                  ) : (
                    <Select value={uploadClass} onValueChange={handleUploadClassChange} disabled={!uploadProgram || uploadClasses.length === 0}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder={!uploadProgram ? "Select program first" : uploadClasses.length === 0 ? "No classes assigned" : "Select class..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {uploadClasses.map(c => (
                          <SelectItem key={c.classId} value={c.classId}>
                            {c.className}{c.classCode ? ` (${c.classCode})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Subject */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-muted-foreground" /> Subject <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                  </label>
                  <Select value={uploadSubject} onValueChange={setUploadSubject} disabled={!uploadClass || uploadSubjects.length === 0}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder={!uploadClass ? "Select class first" : uploadSubjects.length === 0 ? "No subjects assigned" : "Select subject..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {uploadSubjects.map(s => (
                        <SelectItem key={s.subjectId} value={s.subjectId}>
                          {s.subjectName}{s.subjectCode ? ` (${s.subjectCode})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Current selection summary */}
                {uploadProgram && uploadClass && (
                  <div className="flex flex-wrap gap-1.5 p-2.5 bg-primary/5 border border-primary/20 rounded-lg text-xs">
                    <span className="font-semibold text-primary">Uploading to:</span>
                    <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                      {getProgramName(uploadProgram)}
                    </span>
                    <span className="text-muted-foreground">›</span>
                    <span className="bg-muted px-1.5 py-0.5 rounded">
                      {uploadClasses.find(c => c.classId === uploadClass)?.className}
                    </span>
                    {uploadSubject && (
                      <>
                        <span className="text-muted-foreground">›</span>
                        <span className="bg-muted px-1.5 py-0.5 rounded">
                          {uploadSubjects.find(s => s.subjectId === uploadSubject)?.subjectName}
                        </span>
                      </>
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">Version Notes</label>
                  <Input
                    placeholder="e.g. Updated for 2025 curriculum"
                    value={versionNotes}
                    onChange={e => setVersionNotes(e.target.value)}
                    className="bg-background border-border/50"
                  />
                </div>

                <div className="pt-1">
                  <FileUploadZone
                    onFileSelect={handleFileUpload}
                    accept=".pdf,.zip"
                    disabled={uploading || !uploadProgram || !uploadClass}
                    maxFiles={20}
                    className="border-primary/50 bg-primary/5 hover:bg-primary/10 hover:border-primary"
                  />
                  {uploading && (
                    <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border/50 space-y-2">
                      <ProgressIndicator value={uploadProgress} label="Processing files..." />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Search + filters */}
              <div className="flex flex-col gap-3 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search name or ID..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 bg-card shadow-soft-sm border-border/50 h-11"
                  />
                </div>

                {/* Filter: Program */}
                <Select value={filterProgram} onValueChange={handleFilterProgramChange}>
                  <SelectTrigger className="w-full bg-card shadow-soft-sm h-10 border-border/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                      <SelectValue placeholder="All Programs" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Programs</SelectItem>
                    {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.categoryName}</SelectItem>)}
                  </SelectContent>
                </Select>

                {/* Filter: Class (cascades on program) */}
                {filterProgram !== 'all' && filterClasses.length > 0 && (
                  <Select value={filterClass} onValueChange={handleFilterClassChange}>
                    <SelectTrigger className="w-full bg-card shadow-soft-sm h-10 border-border/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-3.5 h-3.5 text-muted-foreground" />
                        <SelectValue placeholder="All Classes" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      {filterClasses.map(c => (
                        <SelectItem key={c.classId} value={c.classId}>{c.className}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Filter: Subject (cascades on class) */}
                {filterClass !== 'all' && filterSubjects.length > 0 && (
                  <Select value={filterSubject} onValueChange={setFilterSubject}>
                    <SelectTrigger className="w-full bg-card shadow-soft-sm h-10 border-border/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                        <SelectValue placeholder="All Subjects" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subjects</SelectItem>
                      {filterSubjects.map(s => (
                        <SelectItem key={s.subjectId} value={s.subjectId}>{s.subjectName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* PDF list */}
              <div className="flex-1 overflow-y-auto bg-card border border-border/50 rounded-lg shadow-soft-sm p-2 space-y-2">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)
                ) : filteredPdfs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <FileText className="w-10 h-10 text-muted-foreground/30 mb-3" />
                    <p className="font-medium text-foreground">No files found</p>
                    <p className="text-sm text-muted-foreground">Adjust filters or upload new PDFs.</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {filteredPdfs.map(pdf => (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        key={pdf.id}
                        onClick={() => setSelectedPdf(pdf)}
                        className={cn(
                          "flex flex-col gap-2 p-3 rounded-lg cursor-pointer border transition-all group relative overflow-hidden",
                          selectedPdf?.id === pdf.id
                            ? "bg-primary/5 border-primary/30 shadow-sm"
                            : "bg-background border-transparent hover:border-border hover:bg-muted/30"
                        )}
                      >
                        {selectedPdf?.id === pdf.id && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-lg" />
                        )}
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-1",
                            selectedPdf?.id === pdf.id ? "bg-primary/20 text-primary" : "bg-rose-500/10 text-rose-500"
                          )}>
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0 pr-6">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-[10px] px-1.5 h-4 font-mono">
                                {getPdfCode(pdf) ?? 'PENDING'}
                              </Badge>
                              <Badge variant="secondary" className="text-[10px] px-1.5 h-4">
                                v{pdf.currentVersion || 1}
                              </Badge>
                            </div>
                            <p className={cn(
                              "text-sm font-semibold truncate mb-1",
                              selectedPdf?.id === pdf.id ? "text-primary" : "text-foreground"
                            )}>
                              {pdf.fileName || pdf.file_name}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                              <span className="font-medium truncate max-w-[90px]">
                                {getProgramName(pdf.categoryId || pdf.category_id) || 'Unknown Program'}
                              </span>
                              {(pdf.className || pdf.class_name) && (
                                <><span>›</span><span className="truncate max-w-[70px]">{pdf.className || pdf.class_name}</span></>
                              )}
                              {(pdf.subjectName || pdf.subject_name) && (
                                <><span>›</span><span className="truncate max-w-[70px]">{pdf.subjectName || pdf.subject_name}</span></>
                              )}
                              <span>•</span>
                              <span>{formatBytes(pdf.fileSize || pdf.file_size || 0)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-border/30">
                          <Button
                            variant="ghost" size="sm"
                            className="h-6 px-2 text-[11px] text-muted-foreground hover:text-primary"
                            onClick={(e) => { e.stopPropagation(); setSelectedPdf(pdf); setHistoryModalOpen(true); }}
                          >
                            <History className="w-3 h-3 mr-1.5" /> History
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            onClick={(e) => { e.stopPropagation(); setPdfToDelete(pdf.id); setDeleteModalOpen(true); }}
                            className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Right Panel: PDF Viewer ── */}
        <div className={cn(
          "w-full lg:w-2/3 flex-1 flex flex-col transition-all duration-300",
          (!selectedPdf && !isUploadMode) || isUploadMode ? "hidden lg:flex" : "flex"
        )}>
          {!isUploadMode ? (
            <EnhancedPDFViewer
              pdfRecord={selectedPdf}
              onClose={() => setSelectedPdf(null)}
              className="h-full border border-border/50"
            />
          ) : (
            <div className="hidden lg:flex flex-col items-center justify-center h-full bg-muted/20 border border-border/50 border-dashed rounded-xl p-8 text-center">
              <div className="w-16 h-16 bg-background rounded-full shadow-sm flex items-center justify-center mb-4 border border-border/50">
                <FilePlus className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Upload with Smart Tagging</h3>
              <p className="text-muted-foreground max-w-md">
                Each PDF is tagged with Program → Class → Subject so students see exactly the right material for their program and level.
              </p>
              <div className="flex items-center gap-3 mt-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5 bg-background border border-border/50 px-3 py-1.5 rounded-full">
                  <Layers className="w-3.5 h-3.5 text-primary" /> Program
                </div>
                <span>→</span>
                <div className="flex items-center gap-1.5 bg-background border border-border/50 px-3 py-1.5 rounded-full">
                  <GraduationCap className="w-3.5 h-3.5 text-primary" /> Class
                </div>
                <span>→</span>
                <div className="flex items-center gap-1.5 bg-background border border-border/50 px-3 py-1.5 rounded-full">
                  <BookOpen className="w-3.5 h-3.5 text-primary" /> Subject
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <VersionHistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        pdf={selectedPdf}
        onVersionChanged={fetchPdfs}
      />

      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setPdfToDelete(null); }}
        onConfirm={confirmDelete}
        title="Delete Resource"
        description="Permanently delete this PDF and all its versions? This cannot be undone."
        confirmText="Delete"
        isDestructive
      />
    </PageTransition>
  );
};

export default PDFUploadManagement;
