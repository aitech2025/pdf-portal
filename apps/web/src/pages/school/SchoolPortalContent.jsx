
import React, { useState, useEffect } from 'react';
import pb from '@/lib/apiClient';
import { toast } from 'sonner';
import { FileText, FolderOpen, BookOpen, Download, ChevronRight, ArrowLeft, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';
import PDFViewer from '@/components/PDFViewer.jsx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver'; // Requires standard browser capabilities

const SchoolPortalContent = ({ school }) => {
  const [step, setStep] = useState(1); // 1: Categories, 2: SubCategories, 3: PDFs
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [pdfs, setPdfs] = useState([]);

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);

  const [loading, setLoading] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);

  // Viewer state
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
      // Map API response shape to the shape the component expects
      const cats = (data.items || []).map(item => ({
        id: item.categoryId,
        categoryName: item.categoryName,
        categoryType: item.categoryType,
        isActive: item.isActive,
      }));
      setCategories(cats);
    } catch (err) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubCategories = async (categoryId) => {
    try {
      setLoading(true);
      const records = await pb.collection('subCategories').getList(1, 100, {
        filter: `categoryId="${categoryId}"`,
        sort: 'subCategoryName',
        $autoCancel: false
      });
      setSubCategories(records.items);
    } catch (err) {
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
      // Map backend response shape to what the component expects
      const items = (data.items || []).map(pdf => ({
        id: pdf.id,
        fileName: pdf.fileName,
        fileSize: pdf.fileSize,
        filePath: pdf.filePath,
        categoryId: pdf.categoryId,
        subCategoryId: pdf.subCategoryId,
      }));
      setPdfs(items);
      setSelectedPdfIds([]);
    } catch (err) {
      toast.error('Failed to load PDFs');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (cat) => {
    setSelectedCategory(cat);
    setStep(2);
    fetchSubCategories(cat.id);
  };

  const handleSubCategoryClick = (subCat) => {
    setSelectedSubCategory(subCat);
    setStep(3);
    fetchPdfs(subCat.id);
  };

  const logDownload = async (pdfId, type = 'single') => {
    // Download logging is handled server-side by the download endpoint
    // No client-side logging needed
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
      toast.success('Download complete');
    } catch (err) {
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
    toast.info(`Preparing ZIP archive for ${selectedPdfIds.length} files...`);

    try {
      const zip = new JSZip();
      const folder = zip.folder(selectedSubCategory.subCategoryName || "Downloads");

      const filesToDownload = pdfs.filter(p => selectedPdfIds.includes(p.id));

      for (const pdf of filesToDownload) {
        const res = await fetch(`/api/pdfs/${pdf.id}/download`, {
          headers: { Authorization: `Bearer ${pb.authStore.token}` }
        });
        if (!res.ok) throw new Error(`Failed to download ${pdf.fileName}`);
        const blob = await res.blob();
        folder.file(pdf.fileName || `document-${pdf.id}.pdf`, blob);
      }

      const zipContent = await zip.generateAsync({ type: 'blob' });

      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(zipContent);
      link.download = `${selectedCategory.categoryName}-${selectedSubCategory.subCategoryName}.zip`.replace(/\s+/g, '-');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Log all downloads (handled server-side)
      await Promise.all(filesToDownload.map(pdf => logDownload(pdf.id, 'bulk')));

      toast.success('ZIP download complete');
      setSelectedPdfIds([]);
    } catch (err) {
      toast.error('Failed to create ZIP archive');
    } finally {
      setDownloadingZip(false);
    }
  };

  const togglePdfSelection = (id) => {
    setSelectedPdfIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4 space-y-6">
      {/* Header & Breadcrumbs */}
      <div className="flex flex-col gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Library</h1>
          <p className="text-muted-foreground">Browse and download educational materials.</p>
        </div>

        {step > 1 && (
          <div className="flex items-center text-sm text-muted-foreground font-medium">
            <button onClick={() => setStep(1)} className="hover:text-primary transition-colors flex items-center">
              Categories
            </button>
            <ChevronRight className="w-4 h-4 mx-1 opacity-50" />
            <button
              onClick={() => step > 2 ? setStep(2) : null}
              className={`${step === 2 ? 'text-foreground font-semibold' : 'hover:text-primary transition-colors'} flex items-center`}
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
        <LoadingSpinner />
      ) : (
        <div className="animate-in fade-in duration-300">

          {/* STEP 1: CATEGORIES */}
          {step === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.length === 0 ? (
                <div className="col-span-full py-12 text-center border rounded-xl border-dashed">
                  <p className="text-muted-foreground">No content categories are available for your current enrollment.</p>
                </div>
              ) : (
                categories.map(cat => (
                  <Card key={cat.id} className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50 group" onClick={() => handleCategoryClick(cat)}>
                    <CardHeader>
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                        <FolderOpen className="w-6 h-6 text-primary" />
                      </div>
                      <CardTitle className="text-xl">{cat.categoryName}</CardTitle>
                      <CardDescription>{cat.categoryType}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">{cat.description || "Educational resources and materials for this category."}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* STEP 2: SUB-CATEGORIES */}
          {step === 2 && (
            <div className="space-y-6">
              <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {subCategories.length === 0 ? (
                  <div className="col-span-full py-12 text-center border rounded-xl border-dashed">
                    <p className="text-muted-foreground">No sub-categories available in this section.</p>
                  </div>
                ) : (
                  subCategories.map(subCat => (
                    <Card key={subCat.id} className="cursor-pointer hover:shadow-md transition-all border-l-4 border-l-primary" onClick={() => handleSubCategoryClick(subCat)}>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{subCat.subCategoryName}</CardTitle>
                            <CardDescription className="font-medium text-foreground/80 mt-1">{subCat.programName}</CardDescription>
                          </div>
                          <BookOpen className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-2">{subCat.objective}</p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {/* STEP 3: PDFs */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/50 p-4 rounded-xl border">
                <Button variant="outline" size="sm" onClick={() => setStep(2)}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>

                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium text-muted-foreground">
                    {selectedPdfIds.length} selected
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedPdfIds(selectedPdfIds.length === pdfs.length ? [] : pdfs.map(p => p.id))}
                  >
                    {selectedPdfIds.length === pdfs.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  <Button
                    onClick={handleBulkDownload}
                    disabled={selectedPdfIds.length === 0 || downloadingZip}
                    className="shadow-sm"
                  >
                    {downloadingZip ? <LoadingSpinner text="" className="p-0 h-4 w-4 mr-2" /> : <Download className="w-4 h-4 mr-2" />}
                    Download ZIP
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {pdfs.length === 0 ? (
                  <div className="col-span-full py-16 text-center border rounded-xl border-dashed">
                    <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground font-medium">No PDFs uploaded in this section yet.</p>
                  </div>
                ) : (
                  pdfs.map(pdf => (
                    <Card
                      key={pdf.id}
                      className={`relative overflow-hidden transition-all group ${selectedPdfIds.includes(pdf.id) ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'}`}
                    >
                      <div className="absolute top-3 left-3 z-10">
                        <Checkbox
                          checked={selectedPdfIds.includes(pdf.id)}
                          onCheckedChange={() => togglePdfSelection(pdf.id)}
                          className={`bg-background/80 backdrop-blur-sm ${selectedPdfIds.includes(pdf.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 transition-opacity'}`}
                        />
                      </div>

                      <div
                        className="cursor-pointer p-6 pt-10 flex flex-col h-full"
                        onClick={() => {
                          setCurrentPdf(pdf);
                          setViewerOpen(true);
                        }}
                      >
                        <div className="mx-auto w-16 h-20 bg-red-100 dark:bg-red-950/40 rounded shadow-sm flex items-center justify-center mb-4 relative">
                          <div className="absolute top-0 right-0 w-4 h-4 bg-background rounded-bl" />
                          <span className="font-bold text-red-600 dark:text-red-400 text-sm">PDF</span>
                        </div>

                        <div className="text-center mt-auto">
                          <h3 className="font-medium text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors" title={pdf.fileName}>
                            {pdf.fileName}
                          </h3>
                          <p className="text-xs text-muted-foreground font-mono">
                            {formatSize(pdf.fileSize)}
                          </p>
                        </div>
                      </div>

                      <div className="border-t bg-muted/30 p-2 flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0">
                        <Button variant="ghost" size="sm" className="flex-1 text-xs h-8" onClick={(e) => handleBookmark(pdf, e)}>
                          <Bookmark className="w-3 h-3 mr-1" /> Save
                        </Button>
                        <Button variant="ghost" size="sm" className="flex-1 text-xs h-8" onClick={(e) => handleDownloadSingle(pdf, e)}>
                          <Download className="w-3 h-3 mr-1" /> Get
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* View Modal */}
      {currentPdf && (
        <PDFViewer
          isOpen={viewerOpen}
          onClose={() => {
            setViewerOpen(false);
            setTimeout(() => setCurrentPdf(null), 300);
          }}
          pdfId={currentPdf.id}
          title={currentPdf.fileName}
          onDownload={() => handleDownloadSingle(currentPdf)}
        />
      )}
    </div>
  );
};

export default SchoolPortalContent;
