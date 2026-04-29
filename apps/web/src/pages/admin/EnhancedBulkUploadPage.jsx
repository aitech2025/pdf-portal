
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X, Play, Pause, RefreshCw } from 'lucide-react';
import PageTransition from '@/components/PageTransition.jsx';
import { formatBytes, cn } from '@/lib/utils';

const EnhancedBulkUploadPage = () => {
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [globalCategory, setGlobalCategory] = useState('');
  
  const onDrop = useCallback(acceptedFiles => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substring(7),
      progress: 0,
      status: 'pending', // pending, uploading, paused, success, error
      category: globalCategory || ''
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, [globalCategory]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: { 'application/pdf': ['.pdf'] }
  });

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const simulateUpload = async (fileObj) => {
    return new Promise((resolve, reject) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          resolve();
        }
        setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, progress } : f));
      }, 200);
    });
  };

  const startUpload = async () => {
    if (files.length === 0) return;
    setIsUploading(true);

    const pendingFiles = files.filter(f => f.status === 'pending' || f.status === 'error');
    
    for (const fileObj of pendingFiles) {
      setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'uploading' } : f));
      
      try {
        // In real app: use XMLHttpRequest for real progress events with FormData
        await simulateUpload(fileObj);
        setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'success', progress: 100 } : f));
      } catch (err) {
        setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'error' } : f));
      }
    }

    setIsUploading(false);
    toast.success('Bulk upload operation completed');
  };

  const clearCompleted = () => {
    setFiles(prev => prev.filter(f => f.status !== 'success'));
  };

  const totalProgress = files.length > 0 
    ? files.reduce((acc, f) => acc + f.progress, 0) / files.length 
    : 0;

  const successCount = files.filter(f => f.status === 'success').length;
  const errorCount = files.filter(f => f.status === 'error').length;

  return (
    <PageTransition>
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-poppins font-bold text-foreground">Bulk Upload Center</h1>
          <p className="text-muted-foreground mt-1">Efficiently upload and categorize multiple resources at once.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="shadow-soft-sm bg-card">Download Template</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
          
          {/* Dropzone */}
          <Card className={cn(
            "border-2 border-dashed transition-all duration-200 ease-in-out shadow-soft-sm",
            isDragActive ? "border-primary bg-primary/5 scale-[1.01]" : "border-border/60 bg-card hover:bg-muted/30"
          )}>
            <CardContent className="p-0">
              <div {...getRootProps()} className="p-12 text-center flex flex-col items-center justify-center cursor-pointer min-h-[280px]">
                <input {...getInputProps()} />
                <div className={cn(
                  "w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-colors",
                  isDragActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  <UploadCloud className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-poppins font-semibold text-foreground mb-2">
                  {isDragActive ? "Drop files now" : "Drag & Drop PDFs here"}
                </h3>
                <p className="text-muted-foreground mb-6 max-w-sm">
                  Upload up to 50 files at once. Maximum file size 50MB per PDF.
                </p>
                <Button variant="secondary" className="pointer-events-none shadow-soft-sm">Browse Files</Button>
              </div>
            </CardContent>
          </Card>

          {/* File List */}
          {files.length > 0 && (
            <Card className="shadow-soft-md border-border/50 bg-card overflow-hidden">
              <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between bg-muted/20">
                <div>
                  <CardTitle className="text-lg">Upload Queue ({files.length})</CardTitle>
                  <CardDescription>Manage individual files before uploading</CardDescription>
                </div>
                <div className="flex gap-2">
                  {successCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearCompleted} className="text-muted-foreground">
                      Clear Completed
                    </Button>
                  )}
                  <Button variant="gradient" size="sm" onClick={startUpload} disabled={isUploading || files.every(f => f.status === 'success')}>
                    {isUploading ? 'Uploading...' : 'Start Upload'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 max-h-[500px] overflow-y-auto">
                <div className="divide-y divide-border/50">
                  {files.map((fileObj) => (
                    <div key={fileObj.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={cn(
                          "w-12 h-12 rounded-[var(--radius-md)] flex items-center justify-center shrink-0",
                          fileObj.status === 'success' ? "bg-success/10 text-success" : 
                          fileObj.status === 'error' ? "bg-destructive/10 text-destructive" : 
                          "bg-rose-500/10 text-rose-500"
                        )}>
                          {fileObj.status === 'success' ? <CheckCircle2 className="w-6 h-6" /> : 
                           fileObj.status === 'error' ? <AlertCircle className="w-6 h-6" /> : 
                           <FileText className="w-6 h-6" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <p className="text-sm font-semibold text-foreground truncate pr-4" title={fileObj.file.name}>
                              {fileObj.file.name}
                            </p>
                            <span className="text-xs font-medium text-muted-foreground shrink-0">
                              {formatBytes(fileObj.file.size)}
                            </span>
                          </div>
                          
                          {fileObj.status === 'uploading' || fileObj.status === 'success' ? (
                            <div className="flex items-center gap-3 mt-2">
                              <Progress value={fileObj.progress} className={cn("h-1.5 flex-1", fileObj.status === 'success' && "[&>div]:bg-success")} />
                              <span className="text-xs font-medium w-8 text-right">{Math.round(fileObj.progress)}%</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={fileObj.status === 'error' ? 'destructive' : 'outline'} className="text-[10px] py-0 h-5 capitalize">
                                {fileObj.status}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-end gap-2 shrink-0 sm:w-auto w-full mt-2 sm:mt-0">
                        {fileObj.status === 'pending' && (
                          <Select value={fileObj.category} onValueChange={(v) => setFiles(prev => prev.map(f => f.id === fileObj.id ? {...f, category: v} : f))}>
                            <SelectTrigger className="w-[140px] h-8 text-xs bg-background">
                              <SelectValue placeholder="Select Category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="math">Mathematics</SelectItem>
                              <SelectItem value="science">Science</SelectItem>
                              <SelectItem value="history">History</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        
                        {fileObj.status !== 'uploading' && fileObj.status !== 'success' && (
                          <Button variant="ghost" size="icon" onClick={() => removeFile(fileObj.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar Controls */}
        <div className="space-y-6">
          <Card className="shadow-soft-md border-border/50 bg-card">
            <CardHeader>
              <CardTitle>Batch Settings</CardTitle>
              <CardDescription>Apply to all pending files</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Global Category</label>
                <Select value={globalCategory} onValueChange={(v) => {
                  setGlobalCategory(v);
                  setFiles(prev => prev.map(f => f.status === 'pending' ? {...f, category: v} : f));
                }}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Apply to all..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="math">Mathematics</SelectItem>
                    <SelectItem value="science">Science</SelectItem>
                    <SelectItem value="history">History</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft-md border-border/50 bg-card">
            <CardHeader>
              <CardTitle>Overall Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-medium">Total Completion</span>
                  <span className="font-bold text-primary">{Math.round(totalProgress)}%</span>
                </div>
                <Progress value={totalProgress} className="h-2.5" />
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-success/10 rounded-[var(--radius-md)] p-3 border border-success/20">
                  <p className="text-xs font-semibold text-success uppercase tracking-wider mb-1">Successful</p>
                  <p className="text-2xl font-poppins font-bold text-success">{successCount}</p>
                </div>
                <div className="bg-destructive/10 rounded-[var(--radius-md)] p-3 border border-destructive/20">
                  <p className="text-xs font-semibold text-destructive uppercase tracking-wider mb-1">Failed</p>
                  <p className="text-2xl font-poppins font-bold text-destructive">{errorCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
};

export default EnhancedBulkUploadPage;
