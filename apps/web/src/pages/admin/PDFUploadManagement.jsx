
import React, { useState, useEffect } from 'react';
import pb from '@/lib/apiClient';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Trash2, FileText, Filter, Upload, X, History, FilePlus } from 'lucide-react';
import PageTransition from '@/components/PageTransition.jsx';
import FileUploadZone from '@/components/FileUploadZone.jsx';
import ProgressIndicator from '@/components/ProgressIndicator.jsx';
import ConfirmationModal from '@/components/ConfirmationModal.jsx';
import EnhancedPDFViewer from '@/components/EnhancedPDFViewer.jsx';
import VersionHistoryModal from '@/components/admin/pdfs/VersionHistoryModal.jsx';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBytes, cn } from '@/lib/utils';
import { usePDFVersioning } from '@/hooks/usePDFVersioning.js';
import { generatePdfId } from '@/lib/pdfIdGenerator.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { motion, AnimatePresence } from 'framer-motion';

const PDFUploadManagement = () => {
  const { currentUser } = useAuth();
  const [pdfs, setPdfs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [selectedCat, setSelectedCat] = useState('all');
  const [search, setSearch] = useState('');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [pdfToDelete, setPdfToDelete] = useState(null);

  const [uploadCat, setUploadCat] = useState('');
  const [uploadSubCat, setUploadSubCat] = useState('');
  const [versionNotes, setVersionNotes] = useState('');

  const [selectedPdf, setSelectedPdf] = useState(null);
  const [isUploadMode, setIsUploadMode] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const { uploadNewVersion } = usePDFVersioning();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pdfRes, catRes, subCatRes] = await Promise.all([
        pb.collection('pdfs').getList(1, 100, { sort: '-created', expand: 'categoryId,subCategoryId', $autoCancel: false }),
        pb.collection('categories').getList(1, 100, { sort: 'categoryName', $autoCancel: false }),
        pb.collection('subCategories').getList(1, 200, { sort: 'subCategoryName', $autoCancel: false })
      ]);
      setPdfs(pdfRes.items);
      setCategories(catRes.items);
      setSubCategories(subCatRes.items);
    } catch (err) {
      toast.error('Failed to load PDF data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFileUpload = async (files) => {
    if (!uploadCat || !uploadSubCat) {
      toast.error('Please select a Category and Sub-Category before uploading.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const category = categories.find(c => c.id === uploadCat);
    const subCategory = subCategories.find(s => s.id === uploadSubCat);

    let successCount = 0;
    const totalFiles = files.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        setUploadProgress(Math.floor((i / totalFiles) * 100) + 10);

        // Check if PDF with same name exists in this category/subcategory
        const existingRes = await pb.collection('pdfs').getList(1, 1, {
          filter: `fileName = "${file.name}" && categoryId = "${uploadCat}" && subCategoryId = "${uploadSubCat}"`,
          $autoCancel: false
        });

        if (existingRes.items.length > 0) {
          // Create new version
          const existingPdf = existingRes.items[0];
          await uploadNewVersion(existingPdf.id, file, versionNotes, currentUser.id);
          successCount++;

          if (i === files.length - 1) {
            const fullRecord = await pb.collection('pdfs').getOne(existingPdf.id, { expand: 'categoryId', $autoCancel: false });
            setSelectedPdf(fullRecord);
            setIsUploadMode(false);
          }
        } else {
          // Create new PDF
          const newPdfId = await generatePdfId(category, subCategory);

          const formData = new FormData();
          formData.append('pdf_id', newPdfId);
          formData.append('pdfFile', file);
          formData.append('fileName', file.name);
          formData.append('fileSize', file.size);
          formData.append('categoryId', uploadCat);
          formData.append('subCategoryId', uploadSubCat);
          formData.append('isActive', 'true');
          formData.append('status', 'approved');
          formData.append('currentVersion', 1);
          formData.append('versionNotes', versionNotes);

          const newRecord = await pb.collection('pdfs').create(formData, { $autoCancel: false });

          // Create initial version record
          const versionData = new FormData();
          versionData.append('pdfId', newRecord.id);
          versionData.append('versionNumber', 1);
          versionData.append('uploadedBy', currentUser.id);
          versionData.append('fileSize', file.size);
          versionData.append('versionNotes', versionNotes || 'Initial upload');
          versionData.append('pdfFile', file);
          versionData.append('isCurrent', true);

          await pb.collection('pdfVersions').create(versionData, { $autoCancel: false });

          successCount++;

          if (i === files.length - 1) {
            const fullRecord = await pb.collection('pdfs').getOne(newRecord.id, { expand: 'categoryId', $autoCancel: false });
            setSelectedPdf(fullRecord);
            setIsUploadMode(false);
          }
        }
      } catch (err) {
        console.error(err);
        toast.error(`Failed to process ${file.name}`);
      }
    }

    setUploadProgress(100);
    setTimeout(() => {
      setUploading(false);
      setUploadProgress(0);
      setVersionNotes('');
      if (successCount > 0) {
        toast.success(`Successfully processed ${successCount} file(s)`);
        fetchData();
      }
    }, 500);
  };

  const confirmDelete = async () => {
    if (!pdfToDelete) return;
    try {
      await pb.collection('pdfs').delete(pdfToDelete, { $autoCancel: false });
      toast.success('PDF deleted successfully');
      if (selectedPdf?.id === pdfToDelete) {
        setSelectedPdf(null);
      }
      fetchData();
    } catch (err) {
      toast.error('Failed to delete PDF');
    } finally {
      setPdfToDelete(null);
    }
  };

  const filteredPdfs = pdfs.filter(p => {
    const matchesSearch = p.fileName.toLowerCase().includes(search.toLowerCase()) ||
      (p.pdf_id && p.pdf_id.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = selectedCat === 'all' || p.categoryId === selectedCat;
    return matchesSearch && matchesCat;
  });

  const availableSubCats = subCategories.filter(s => s.categoryId === uploadCat);

  return (
    <PageTransition>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-poppins font-bold text-foreground">PDF Management</h1>
          <p className="text-muted-foreground mt-1">Upload, organize, and manage educational resources with version control.</p>
        </div>
        <Button
          onClick={() => { setIsUploadMode(!isUploadMode); setSelectedPdf(null); }}
          variant={isUploadMode ? "outline" : "default"}
          className="shadow-soft-sm"
        >
          {isUploadMode ? <><X className="w-4 h-4 mr-2" /> Cancel Upload</> : <><Upload className="w-4 h-4 mr-2" /> Upload New</>}
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-12rem)] min-h-[600px]">
        <div className={cn(
          "w-full lg:w-1/3 flex flex-col gap-4 overflow-hidden transition-all duration-300",
          selectedPdf && !isUploadMode ? "hidden lg:flex" : "flex"
        )}>
          {isUploadMode ? (
            <Card className="flex-1 shadow-soft-md border-border/60 overflow-y-auto">
              <CardHeader className="bg-muted/20 border-b border-border/50 sticky top-0 z-10 backdrop-blur-sm">
                <CardTitle>Upload Documents</CardTitle>
                <CardDescription>Select destination and upload files</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Target Category *</label>
                  <Select value={uploadCat} onValueChange={(v) => { setUploadCat(v); setUploadSubCat(''); }}>
                    <SelectTrigger className="bg-background rounded-[var(--radius-md)] h-11"><SelectValue placeholder="Select category..." /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.categoryName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Target Sub-Category *</label>
                  <Select value={uploadSubCat} onValueChange={setUploadSubCat} disabled={!uploadCat}>
                    <SelectTrigger className="bg-background rounded-[var(--radius-md)] h-11"><SelectValue placeholder="Select sub-category..." /></SelectTrigger>
                    <SelectContent>
                      {availableSubCats.map(s => <SelectItem key={s.id} value={s.id}>{s.subCategoryName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Version Notes (Optional)</label>
                  <Input
                    placeholder="e.g. Fixed typos in chapter 2"
                    value={versionNotes}
                    onChange={(e) => setVersionNotes(e.target.value)}
                    className="bg-background border-border/50"
                  />
                </div>

                <div className="pt-2">
                  <FileUploadZone
                    onFileSelect={handleFileUpload}
                    disabled={uploading || !uploadCat || !uploadSubCat}
                    maxFiles={10}
                    className="border-primary/50 bg-primary/5 hover:bg-primary/10 hover:border-primary"
                  />

                  {uploading && (
                    <div className="mt-5 p-4 rounded-[var(--radius-md)] bg-muted/50 border border-border/50 space-y-2">
                      <ProgressIndicator value={uploadProgress} label="Processing files..." />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex flex-col gap-3 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search name or ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 bg-card shadow-soft-sm border-border/50 h-11"
                  />
                </div>
                <Select value={selectedCat} onValueChange={setSelectedCat}>
                  <SelectTrigger className="w-full bg-card shadow-soft-sm h-10 border-border/50 rounded-[var(--radius-md)]">
                    <div className="flex items-center">
                      <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Filter Category" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.categoryName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 overflow-y-auto bg-card border border-border/50 rounded-[var(--radius-lg)] shadow-soft-sm p-2 space-y-2 relative">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-[var(--radius-md)]" />
                  ))
                ) : filteredPdfs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <FileText className="w-10 h-10 text-muted-foreground/30 mb-3" />
                    <p className="font-medium text-foreground">No files found</p>
                    <p className="text-sm text-muted-foreground">Adjust filters or upload new.</p>
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
                          "flex flex-col gap-2 p-3 rounded-[var(--radius-md)] cursor-pointer border transition-all duration-200 group relative overflow-hidden",
                          selectedPdf?.id === pdf.id
                            ? "bg-primary/5 border-primary/30 shadow-sm"
                            : "bg-background border-transparent hover:border-border hover:bg-muted/30"
                        )}
                      >
                        {selectedPdf?.id === pdf.id && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-[var(--radius-md)]" />
                        )}

                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors mt-1",
                            selectedPdf?.id === pdf.id ? "bg-primary/20 text-primary" : "bg-rose-500/10 text-rose-500 group-hover:bg-rose-500/20"
                          )}>
                            <FileText className="w-5 h-5" />
                          </div>

                          <div className="flex-1 min-w-0 pr-6">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-[10px] px-1.5 h-4 border-border text-muted-foreground font-mono">
                                {pdf.pdf_id || 'ID PENDING'}
                              </Badge>
                              <Badge variant="secondary" className="text-[10px] px-1.5 h-4 bg-muted text-foreground">
                                v{pdf.currentVersion || 1}
                              </Badge>
                            </div>
                            <p className={cn(
                              "text-sm font-semibold truncate mb-1",
                              selectedPdf?.id === pdf.id ? "text-primary" : "text-foreground group-hover:text-primary"
                            )}>
                              {pdf.fileName}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                              <span className="truncate max-w-[100px] font-medium">{pdf.expand?.categoryId?.categoryName || 'Uncategorized'}</span>
                              <span>•</span>
                              <span>{formatBytes(pdf.fileSize)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-1 pt-2 border-t border-border/30">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[11px] text-muted-foreground hover:text-primary"
                            onClick={(e) => { e.stopPropagation(); setSelectedPdf(pdf); setHistoryModalOpen(true); }}
                          >
                            <History className="w-3 h-3 mr-1.5" /> History
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
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
            <div className="hidden lg:flex flex-col items-center justify-center h-full bg-muted/20 border border-border/50 border-dashed rounded-[var(--radius-xl)] p-8 text-center">
              <div className="w-16 h-16 bg-background rounded-full shadow-sm flex items-center justify-center mb-4 border border-border/50">
                <FilePlus className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">Upload & Versioning Active</h3>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto mb-6">
                Select a category on the left, then drop files. Identical names will automatically trigger version control options to keep your library organized.
              </p>
            </div>
          )}
        </div>
      </div>

      <VersionHistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        pdf={selectedPdf}
        onVersionChanged={fetchData}
      />

      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setPdfToDelete(null); }}
        onConfirm={confirmDelete}
        title="Delete Resource"
        description="Are you sure you want to permanently delete this PDF and all its versions? This action cannot be undone."
        confirmText="Delete All"
        isDestructive={true}
      />
    </PageTransition>
  );
};

export default PDFUploadManagement;
