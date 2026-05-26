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
  Layers
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
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [pdfs, setPdfs] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [search, setSearch] = useState('');

  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentPdf, setCurrentPdf] = useState(null);
  const [selectedPdfIds, setSelectedPdfIds] = useState([]);

  useEffect(() => {
    fetchCategories();
  }, [school]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/schools/${school.id}/categories`, {
        headers: { Authorization: `Bearer ${pb.authStore.token}` }
      });
      if (!res.ok) throw new Error('Failed to load categories');
      const data = await res.json();
      const cats = (data.items || []).map((item) => ({
        id: item.categoryId,
        categoryName: item.categoryName,
        categoryType: item.categoryType,
        categoryCode: item.categoryCode,
        isActive: item.isActive
      }));
      setCategories(cats);
    } catch {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubCategories = async (categoryId) => {
    try {
      setLoading(true);
      const records = await pb.collection('subCategories').getList(1, 200, {
        filter: `categoryId="${categoryId}"`,
        sort: 'subCategoryName',
        $autoCancel: false
      });
      setSubCategories(records.items || []);
    } catch {
      toast.error('Failed to load sub-categories');
    } finally {
      setLoading(false);
    }
  };

  const fetchPdfs = async (subCategoryId) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/pdfs?subCategoryId=${subCategoryId}&per_page=500`, {
        headers: { Authorization: `Bearer ${pb.authStore.token}` }
      });
      if (!res.ok) throw new Error('Failed to load PDFs');
      const data = await res.json();
      setPdfs(data.items || []);
      setSelectedPdfIds([]);
    } catch {
      toast.error('Failed to load PDFs');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (cat) => {
    setSelectedCategory(cat);
    setStep(2);
    setSearch('');
    fetchSubCategories(cat.id);
  };

  const handleSubCategoryClick = (subCat) => {
    setSelectedSubCategory(subCat);
    setStep(3);
    setSearch('');
    fetchPdfs(subCat.id);
  };

  const handleDownloadSingle = async (pdf, e) => {
    e?.stopPropagation();
    try {
      const res = await fetch(`/api/pdfs/${pdf.id}/download`, {
        headers: { Authorization: `Bearer ${pb.authStore.token}` }
      });
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
      await pb.fetch('/favorites', 'POST', { pdfId: pdf.id });
      toast.success('Added to bookmarks');
    } catch {
      toast.error('Could not bookmark PDF');
    }
  };

  const handleBulkDownload = async () => {
    if (selectedPdfIds.length === 0) return;
    setDownloadingZip(true);
    try {
      const archiveName = `${selectedCategory?.categoryName || 'pdfs'}-${selectedSubCategory?.subCategoryName || 'bundle'}.zip`
        .replace(/\s+/g, '-')
        .replace(/[^\w.\-]+/g, '');
      const res = await fetch('/api/pdfs/bulk-download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${pb.authStore.token}`
        },
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

  const togglePdfSelection = (id) => {
    setSelectedPdfIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const filteredCategories = useMemo(
    () => categories.filter((c) => !search || (c.categoryName ?? '').toLowerCase().includes(search.toLowerCase())),
    [categories, search]
  );
  const filteredSubCategories = useMemo(
    () =>
      subCategories.filter(
        (s) =>
          !search ||
          (s.subCategoryName ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (s.programName ?? '').toLowerCase().includes(search.toLowerCase())
      ),
    [subCategories, search]
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

  return (
    <div className="container max-w-7xl mx-auto py-6 px-4 space-y-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-poppins font-bold tracking-tight">Content Library</h1>
            <p className="text-muted-foreground mt-1">
              Browse, preview and download materials from your assigned categories.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={
                step === 1 ? 'Search categories…' : step === 2 ? 'Search subcategories…' : 'Search PDFs…'
              }
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

        {step > 1 && (
          <div className="flex items-center text-sm text-muted-foreground font-medium">
            <button onClick={() => setStep(1)} className="hover:text-primary transition-colors">
              Categories
            </button>
            <ChevronRight className="w-4 h-4 mx-1 opacity-50" />
            <button
              onClick={() => (step > 2 ? setStep(2) : null)}
              className={cn(
                step === 2 ? 'text-foreground font-semibold' : 'hover:text-primary transition-colors'
              )}
            >
              {selectedCategory?.categoryName}
            </button>
            {step > 2 && (
              <>
                <ChevronRight className="w-4 h-4 mx-1 opacity-50" />
                <span className="text-foreground font-semibold">{selectedSubCategory?.subCategoryName}</span>
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
          {/* STEP 1: CATEGORIES */}
          {step === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCategories.length === 0 ? (
                <div className="col-span-full py-16 text-center border rounded-xl border-dashed">
                  <Layers className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground font-medium">
                    {categories.length === 0
                      ? 'No content categories are available for your enrollment.'
                      : 'No categories match your search.'}
                  </p>
                </div>
              ) : (
                filteredCategories.map((cat) => (
                  <Card
                    key={cat.id}
                    className="cursor-pointer hover:shadow-soft-md transition-all hover:border-primary/40 group border-border/50"
                    onClick={() => handleCategoryClick(cat)}
                  >
                    <CardHeader className="pb-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-[var(--radius-lg)] flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                        <FolderOpen className="w-6 h-6 text-primary" />
                      </div>
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        {cat.categoryName}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        {cat.categoryType && (
                          <Badge variant="secondary" className="text-[10px] h-5">
                            {cat.categoryType}
                          </Badge>
                        )}
                        {cat.categoryCode && (
                          <span className="font-mono text-[10px] text-muted-foreground">{cat.categoryCode}</span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Open materials</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* STEP 2: SUB-CATEGORIES */}
          {step === 2 && (
            <div className="space-y-5">
              <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to categories
              </Button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredSubCategories.length === 0 ? (
                  <div className="col-span-full py-16 text-center border rounded-xl border-dashed">
                    <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground font-medium">
                      {subCategories.length === 0
                        ? 'No sub-categories in this section.'
                        : 'No sub-categories match your search.'}
                    </p>
                  </div>
                ) : (
                  filteredSubCategories.map((subCat) => (
                    <Card
                      key={subCat.id}
                      className="cursor-pointer hover:shadow-soft-md transition-all border-l-4 border-l-primary border-border/50"
                      onClick={() => handleSubCategoryClick(subCat)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start gap-3">
                          <div className="min-w-0">
                            <CardTitle className="text-base">{subCat.subCategoryName}</CardTitle>
                            <CardDescription className="font-medium text-foreground/80 mt-1 truncate">
                              {subCat.programName}
                            </CardDescription>
                          </div>
                          <BookOpen className="w-5 h-5 text-muted-foreground shrink-0" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        {subCat.objective && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{subCat.objective}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {/* STEP 3: PDFs */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 p-3 rounded-xl border border-border/50">
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => setStep(2)}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {filteredPdfs.length} PDF{filteredPdfs.length !== 1 ? 's' : ''}
                    {selectedPdfIds.length > 0 && (
                      <span className="ml-2 text-foreground font-medium">
                        · {selectedPdfIds.length} selected
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={filteredPdfs.length === 0}
                    onClick={() =>
                      setSelectedPdfIds(allFilteredSelected ? [] : filteredPdfs.map((p) => p.id))
                    }
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
          title={`${currentPdf.categoryName ? `[${currentPdf.categoryName}] ` : ''}${currentPdf.fileName}`}
          onDownload={() => handleDownloadSingle(currentPdf)}
        />
      )}
    </div>
  );
};

export default SchoolPortalContent;
