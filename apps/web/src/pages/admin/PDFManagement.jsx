
import React, { useState, useEffect, useRef } from 'react';
import pb from '@/lib/apiClient';
import { toast } from 'sonner';
import { Upload, Trash2, Search, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import PageTransition from '@/components/PageTransition.jsx';
import PageHeader from '@/components/PageHeader.jsx';
import { Skeleton } from '@/components/ui/skeleton';

const PDFManagement = () => {
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [pdfs, setPdfs] = useState([]);
  
  const [selectedCat, setSelectedCat] = useState('');
  const [selectedSubCat, setSelectedSubCat] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const cats = await pb.collection('categories').getList(1, 100, { sort: 'categoryName', $autoCancel: false });
        setCategories(cats.items);
      } catch (err) {
        toast.error('Failed to load categories');
      } finally {
        setLoading(false);
      }
    };
    fetchCats();
  }, []);

  useEffect(() => {
    if (!selectedCat) {
      setSubCategories([]);
      setSelectedSubCat('');
      return;
    }
    const fetchSubs = async () => {
      try {
        const subs = await pb.collection('subCategories').getList(1, 100, { filter: `categoryId="${selectedCat}"`, sort: 'subCategoryName', $autoCancel: false });
        setSubCategories(subs.items);
        setSelectedSubCat('');
      } catch (err) {
        toast.error('Failed to load sub-categories');
      }
    };
    fetchSubs();
  }, [selectedCat]);

  useEffect(() => {
    if (!selectedSubCat) {
      setPdfs([]);
      return;
    }
    const fetchPdfs = async () => {
      setLoading(true);
      try {
        const records = await pb.collection('pdfs').getList(1, 200, { filter: `subCategoryId="${selectedSubCat}"`, sort: '-created', $autoCancel: false });
        setPdfs(records.items);
      } catch (err) {
        toast.error('Failed to load PDFs');
      } finally {
        setLoading(false);
      }
    };
    fetchPdfs();
  }, [selectedSubCat]);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    if (!selectedCat || !selectedSubCat) {
      toast.error('Please select Category and Sub-Category first');
      return;
    }

    setUploading(true);
    let successCount = 0;

    for (const file of files) {
      if (file.type !== 'application/pdf') {
        toast.error(`${file.name} is not a PDF`);
        continue;
      }
      
      const formData = new FormData();
      formData.append('pdfFile', file);
      formData.append('fileName', file.name);
      formData.append('fileSize', file.size);
      formData.append('categoryId', selectedCat);
      formData.append('subCategoryId', selectedSubCat);
      formData.append('isActive', true);

      try {
        await pb.collection('pdfs').create(formData, { $autoCancel: false });
        successCount++;
      } catch (err) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} file(s)`);
      // Refresh list
      const records = await pb.collection('pdfs').getList(1, 200, { filter: `subCategoryId="${selectedSubCat}"`, sort: '-created', $autoCancel: false });
      setPdfs(records.items);
    }
    
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this PDF permanently?')) {
      try {
        await pb.collection('pdfs').delete(id, { $autoCancel: false });
        toast.success('PDF deleted');
        setPdfs(pdfs.filter(p => p.id !== id));
      } catch (err) {
        toast.error('Failed to delete PDF');
      }
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredPdfs = pdfs.filter(p => p.fileName.toLowerCase().includes(search.toLowerCase()));

  return (
    <PageTransition>
      <PageHeader 
        title="PDF Management" 
        description="Upload and organize educational PDF resources."
        breadcrumbs={[{ label: 'Content Management' }, { label: 'PDFs' }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Selection & Upload */}
        <div className="space-y-6">
          <Card className="shadow-soft border-border/50">
            <CardContent className="p-6 space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">1. Select Category</Label>
                <Select value={selectedCat} onValueChange={setSelectedCat}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Choose category..." /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.categoryName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-semibold">2. Select Sub-Category</Label>
                <Select value={selectedSubCat} onValueChange={setSelectedSubCat} disabled={!selectedCat}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Choose sub-category..." /></SelectTrigger>
                  <SelectContent>
                    {subCategories.map(s => <SelectItem key={s.id} value={s.id}>{s.subCategoryName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4 border-t border-border/50">
                <Label className="text-sm font-semibold mb-2 block">3. Upload Files</Label>
                <div 
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${(!selectedCat || !selectedSubCat) ? 'opacity-50 bg-muted/30 border-border cursor-not-allowed' : 'bg-primary/5 border-primary/30 hover:bg-primary/10 cursor-pointer'}`}
                  onClick={() => selectedCat && selectedSubCat && fileInputRef.current?.click()}
                >
                  <Upload className={`w-10 h-10 mx-auto mb-3 ${(!selectedCat || !selectedSubCat) ? 'text-muted-foreground' : 'text-primary'}`} />
                  <p className="text-sm font-medium mb-1">Click to browse or drag files here</p>
                  <p className="text-xs text-muted-foreground">Supports multiple .pdf files up to 50MB</p>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".pdf" 
                    multiple 
                    onChange={handleFileSelect}
                    disabled={!selectedCat || !selectedSubCat || uploading}
                  />
                </div>
                {uploading && <p className="text-sm text-primary font-medium mt-3 text-center animate-pulse">Uploading files, please wait...</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: File List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between bg-card p-2 rounded-xl border border-border/50 shadow-sm">
            <div className="relative flex-1 max-w-md ml-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search files in this sub-category..." className="pl-9 border-none bg-transparent shadow-none focus-visible:ring-0" value={search} onChange={(e) => setSearch(e.target.value)} disabled={!selectedSubCat} />
            </div>
            <div className="text-sm text-muted-foreground px-4 font-medium">
              {filteredPdfs.length} files
            </div>
          </div>

          <div className="border border-border/50 rounded-2xl bg-card overflow-hidden shadow-soft min-h-[400px]">
            {!selectedSubCat ? (
              <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
                <FileText className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-lg font-medium">No Sub-Category Selected</p>
                <p className="text-sm mt-1">Select a category and sub-category to view files.</p>
              </div>
            ) : loading ? (
              <div className="p-4 space-y-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPdfs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">No PDFs found in this sub-category.</TableCell>
                    </TableRow>
                  ) : (
                    filteredPdfs.map(pdf => (
                      <TableRow key={pdf.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                            <span className="line-clamp-1" title={pdf.fileName}>{pdf.fileName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{formatSize(pdf.fileSize)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{new Date(pdf.created).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(pdf.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default PDFManagement;
