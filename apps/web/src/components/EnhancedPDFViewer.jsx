
import React, { useState, useEffect, useRef, Component } from 'react';
import { Document, Page } from 'react-pdf';

class PdfErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { caught: false }; }
  static getDerivedStateFromError() { return { caught: true }; }
  componentDidCatch() { this.props.onError?.(); }
  render() { return this.state.caught ? null : this.props.children; }
}
import '@/lib/setupPdfWorker.js';
import {
  ZoomIn, ZoomOut, Maximize, Minimize, ChevronLeft, ChevronRight,
  Download, X, FileWarning, Scaling,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import client from '@/lib/apiClient';
import { usePdfDocument } from '@/hooks/usePdfDocument.js';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

const ARCHIVE_TYPES = ['zip', 'rar', '7z'];

const getArchiveLabel = (pdfRecord) => {
  if (ARCHIVE_TYPES.includes(pdfRecord?.fileType)) return pdfRecord.fileType.toUpperCase();
  const match = (pdfRecord?.fileName || '').toLowerCase().match(/\.(zip|rar|7z)$/);
  return match ? match[1].toUpperCase() : null;
};

const EnhancedPDFViewer = ({ pdfRecord, versionId = null, onClose, className }) => {
  const archiveLabel = !versionId ? getArchiveLabel(pdfRecord) : null;
  const isZip = !!archiveLabel;
  // Skip the PDF fetch/parse for archives — they cannot be rendered by pdfjs.
  const pdfId = (versionId || isZip) ? null : pdfRecord?.id;
  const { file, blobUrl, loading, error } = usePdfDocument({ pdfId, versionId });

  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [useNativeViewer, setUseNativeViewer] = useState(false);
  const [pageInput, setPageInput] = useState('1');
  const [fitMode, setFitMode] = useState('page');

  const containerRef = useRef(null);
  const documentContainerRef = useRef(null);

  useEffect(() => {
    setPageNumber(1);
    setPageInput('1');
    setScale(1.0);
    setRotation(0);
    setNumPages(null);
    setUseNativeViewer(false);
  }, [pdfRecord?.id, versionId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!file && !blobUrl) return;
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=') { e.preventDefault(); handleZoomIn(); }
        if (e.key === '-') { e.preventDefault(); handleZoomOut(); }
      }
      if (e.key === 'ArrowRight') handleNextPage();
      if (e.key === 'ArrowLeft') handlePrevPage();
      if (e.key === 'Escape' && isFullscreen) toggleFullscreen();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pageNumber, numPages, scale, isFullscreen, file, blobUrl]);

  const onDocumentLoadSuccess = ({ numPages: pages }) => {
    setNumPages(pages);
    setUseNativeViewer(false);
  };

  const onDocumentLoadError = (loadError) => {
    console.error('react-pdf load error:', loadError);
    setUseNativeViewer(true);
    toast.message('Using browser PDF viewer', { description: 'Advanced viewer could not render this file.' });
  };

  const handlePrevPage = () => {
    setPageNumber((prev) => {
      const next = Math.max(prev - 1, 1);
      setPageInput(String(next));
      return next;
    });
  };

  const handleNextPage = () => {
    setPageNumber((prev) => {
      const next = Math.min(prev + 1, numPages || 1);
      setPageInput(String(next));
      return next;
    });
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3.0));
    setFitMode('custom');
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
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
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handlePageInputSubmit = (e) => {
    if (e.key === 'Enter') {
      const page = parseInt(pageInput, 10);
      if (!isNaN(page) && page >= 1 && page <= (numPages || 1)) {
        setPageNumber(page);
      } else {
        setPageInput(String(pageNumber));
      }
    }
  };

  const handleDownload = async () => {
    if (!pdfRecord?.id && !versionId) return;
    try {
      const blob = versionId
        ? await client.fetchPdfVersionBlob(versionId)
        : await client.fetchPdfBlob(pdfRecord.id, { preview: false });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = pdfRecord?.fileName || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Download started');
    } catch {
      toast.error('Download failed');
    }
  };

  if (!pdfRecord) {
    return (
      <div className={cn('flex items-center justify-center h-full min-h-[400px] bg-muted/20', className)}>
        <div className="text-center p-8">
          <FileWarning className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">No Document Selected</h3>
          <p className="text-sm text-muted-foreground">Select a PDF from the list to view it here.</p>
        </div>
      </div>
    );
  }

  if (isZip) {
    return (
      <div className={cn('pdf-viewer-container flex flex-col h-full bg-card shadow-soft-lg', className)}>
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-background/95 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden shrink-0">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            )}
            <h3 className="font-semibold text-sm truncate">{pdfRecord.fileName}</h3>
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 shrink-0">{archiveLabel}</Badge>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 hidden lg:inline-flex">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        <div className="flex-1 min-h-0 flex items-center justify-center bg-muted/30 p-8">
          <div className="text-center max-w-sm">
            <FileWarning className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">{archiveLabel} archive</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This file is a {archiveLabel} archive and can't be previewed. Download it to open the contents.
            </p>
            <Button onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" /> Download
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div
        ref={containerRef}
        className={cn(
          'pdf-viewer-container flex flex-col h-full bg-card shadow-soft-lg',
          isFullscreen && 'fullscreen',
          className,
        )}
      >
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-background/95 backdrop-blur z-20 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden shrink-0">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            )}
            <h3 className="font-semibold text-sm truncate">{pdfRecord.fileName}</h3>
            {pdfRecord.currentVersion && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 shrink-0">
                v{pdfRecord.currentVersion}
              </Badge>
            )}
          </div>

          {!useNativeViewer && numPages && (
            <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-md border">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevPage} disabled={pageNumber <= 1}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Input
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onKeyDown={handlePageInputSubmit}
                onBlur={() => setPageInput(String(pageNumber))}
                className="w-12 h-7 text-center text-xs"
              />
              <span className="text-xs text-muted-foreground">/ {numPages}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextPage} disabled={pageNumber >= numPages}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div className="flex items-center gap-1">
            {!useNativeViewer && (
              <>
                <Button variant="ghost" size="icon" className="h-8 w-8 hidden md:inline-flex" onClick={handleZoomOut}>
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 hidden md:inline-flex" onClick={handleZoomIn}>
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 hidden md:inline-flex" onClick={handleFitModeToggle}>
                  <Scaling className="w-4 h-4" />
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDownload}>
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:inline-flex" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </Button>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 hidden lg:inline-flex">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        <div ref={documentContainerRef} className="pdf-document-wrapper relative flex-1 min-h-0 overflow-auto bg-muted/30">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
              <Skeleton className="w-[80%] max-w-[600px] h-[70vh]" />
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <FileWarning className="w-12 h-12 text-destructive mb-4" />
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button variant="outline" onClick={handleDownload}>Download instead</Button>
            </div>
          )}

          {!loading && !error && useNativeViewer && blobUrl && (
            <iframe
              title={pdfRecord.fileName}
              src={blobUrl}
              className="w-full h-full min-h-[500px] border-0"
            />
          )}

          {!loading && !error && !useNativeViewer && file && (
            <PdfErrorBoundary key={pdfRecord?.id ?? versionId} onError={onDocumentLoadError}>
              <Document
                file={file}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={null}
                className="flex flex-col items-center py-4"
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  rotate={rotation}
                  renderTextLayer
                  renderAnnotationLayer
                  className="shadow-xl"
                />
              </Document>
            </PdfErrorBoundary>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default EnhancedPDFViewer;
