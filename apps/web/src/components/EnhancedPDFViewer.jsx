
import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { 
  ZoomIn, ZoomOut, Maximize, Minimize, ChevronLeft, ChevronRight, 
  Download, X, FileWarning, Scaling
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import pb from '@/lib/apiClient';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const EnhancedPDFViewer = ({ pdfRecord, onClose, className }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pageInput, setPageInput] = useState('1');
  const [fitMode, setFitMode] = useState('page');
  
  const containerRef = useRef(null);
  const documentContainerRef = useRef(null);

  const pdfUrl = pdfRecord ?`/uploads/${pdfRecord.pdfFile}` : null;

  useEffect(() => {
    setPageNumber(1);
    setPageInput('1');
    setScale(1.0);
    setRotation(0);
    setIsLoading(true);
    setError(null);
  }, [pdfUrl]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!pdfUrl) return;
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=') { e.preventDefault(); handleZoomIn(); }
        if (e.key === '-') { e.preventDefault(); handleZoomOut(); }
      }
      if (e.key === 'ArrowRight') { handleNextPage(); }
      if (e.key === 'ArrowLeft') { handlePrevPage(); }
      if (e.key === 'Escape' && isFullscreen) { toggleFullscreen(); }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pageNumber, numPages, scale, isFullscreen, pdfUrl]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setIsLoading(false);
    setError(null);
  };

  const onDocumentLoadError = (error) => {
    setIsLoading(false);
    setError(error.message || 'Failed to load PDF document.');
    toast.error('Failed to load PDF document.');
  };

  const handlePrevPage = () => {
    setPageNumber(prev => {
      const next = Math.max(prev - 1, 1);
      setPageInput(next.toString());
      return next;
    });
  };

  const handleNextPage = () => {
    setPageNumber(prev => {
      const next = Math.min(prev + 1, numPages || 1);
      setPageInput(next.toString());
      return next;
    });
  };
  
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3.0));
    setFitMode('custom');
  };
  
  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
    setFitMode('custom');
  };

  const handleFitModeToggle = () => {
    if (fitMode === 'page') {
      setFitMode('width');
      if (documentContainerRef.current) {
        const containerWidth = documentContainerRef.current.clientWidth - 64;
        setScale(containerWidth / 600); 
      }
    } else {
      setFitMode('page');
      setScale(1.0);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        toast.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handlePageInputChange = (e) => {
    setPageInput(e.target.value);
  };

  const handlePageInputSubmit = (e) => {
    if (e.key === 'Enter') {
      const page = parseInt(pageInput, 10);
      if (!isNaN(page) && page >= 1 && page <= (numPages || 1)) {
        setPageNumber(page);
      } else {
        setPageInput(pageNumber.toString());
        toast.error(`Please enter a valid page number between 1 and ${numPages || 1}`);
      }
    }
  };

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = pdfRecord.fileName || 'document.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Download started');
  };

  if (!pdfRecord) {
    return (
      <div className={cn("pdf-viewer-container flex items-center justify-center h-full min-h-[400px] bg-muted/20", className)}>
        <div className="text-center p-8">
          <FileWarning className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">No Document Selected</h3>
          <p className="text-sm text-muted-foreground">Select a PDF from the list to view it here.</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div 
        ref={containerRef} 
        className={cn(
          "pdf-viewer-container flex flex-col h-full bg-card shadow-soft-lg",
          isFullscreen && "fullscreen",
          className
        )}
      >
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-background/95 backdrop-blur z-20 shrink-0">
          <div className="flex items-center gap-3">
            {onClose && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden text-muted-foreground hover:bg-muted shrink-0">
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Back to list</TooltipContent>
              </Tooltip>
            )}
            <div className="hidden sm:flex items-center gap-2">
              <h3 className="font-semibold text-sm text-foreground truncate max-w-[200px] lg:max-w-[300px]">
                {pdfRecord.fileName}
              </h3>
              {pdfRecord.currentVersion && (
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-primary/10 text-primary">
                  v{pdfRecord.currentVersion}
                </Badge>
              )}
              {pdfRecord.isCurrent && (
                <Badge className="text-[10px] h-5 px-1.5 bg-emerald-500 text-white">Current</Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-2 bg-muted/40 p-1 rounded-[var(--radius-md)] border border-border/30 shadow-sm">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handlePrevPage} disabled={pageNumber <= 1} className="h-7 w-7 sm:h-8 sm:w-8">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Previous Page</TooltipContent>
            </Tooltip>
            
            <div className="flex items-center gap-2 px-1 sm:px-2">
              <Input 
                value={pageInput}
                onChange={handlePageInputChange}
                onKeyDown={handlePageInputSubmit}
                onBlur={() => setPageInput(pageNumber.toString())}
                className="w-10 sm:w-12 h-6 sm:h-7 text-center text-xs font-medium bg-background border-border/50 px-1 shadow-inner focus-visible:ring-1"
                aria-label="Page number"
              />
              <span className="text-xs text-muted-foreground font-medium tabular-nums whitespace-nowrap">
                / {numPages || '-'}
              </span>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleNextPage} disabled={pageNumber >= (numPages || 1)} className="h-7 w-7 sm:h-8 sm:w-8">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Next Page</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center gap-1">
            <div className="hidden md:flex items-center gap-1 mr-2 border-r border-border/50 pr-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleZoomOut} disabled={scale <= 0.5} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom Out</TooltipContent>
              </Tooltip>
              
              <span className="text-xs font-medium w-12 text-center tabular-nums text-muted-foreground">{Math.round(scale * 100)}%</span>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleZoomIn} disabled={scale >= 3.0} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom In</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleFitModeToggle} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <Scaling className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{fitMode === 'page' ? 'Fit Width' : 'Fit Page'}</TooltipContent>
              </Tooltip>
            </div>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleDownload} className="h-8 w-8 text-primary hover:bg-primary/10">
                  <Download className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download PDF</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="h-8 w-8 hidden sm:inline-flex text-muted-foreground hover:text-foreground">
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</TooltipContent>
            </Tooltip>
            
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 hidden lg:inline-flex text-muted-foreground hover:text-destructive hover:bg-destructive/10 ml-1">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        <div ref={documentContainerRef} className="pdf-document-wrapper relative">
          <AnimatePresence>
            {isLoading && !error && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 flex flex-col items-center pt-8 bg-background/50 backdrop-blur-sm"
              >
                <Skeleton className="w-[80%] max-w-[600px] h-[70vh] rounded-md shadow-2xl" />
              </motion.div>
            )}
          </AnimatePresence>

          {error ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-4">
                <FileWarning className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Document Error</h3>
              <p className="text-muted-foreground max-w-md">{error}</p>
              <Button onClick={handleDownload} className="mt-6" variant="outline">
                <Download className="w-4 h-4 mr-2" /> Download File Instead
              </Button>
            </div>
          ) : (
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={null}
              className="flex flex-col items-center"
            >
              <motion.div
                key={`${pageNumber}-${scale}`}
                initial={{ opacity: 0.5, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                style={{ transform: `rotate(${rotation}deg)` }}
                className="relative"
              >
                <Page 
                  pageNumber={pageNumber} 
                  scale={scale} 
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  loading={<Skeleton className="w-[600px] h-[800px]" />}
                  className="shadow-xl"
                  error="Failed to load page."
                />
              </motion.div>
            </Document>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default EnhancedPDFViewer;
