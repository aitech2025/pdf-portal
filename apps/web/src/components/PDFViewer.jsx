import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Download,
  Printer,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Document, Page } from 'react-pdf';
import '@/lib/setupPdfWorker.js';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import LoadingSpinner from './LoadingSpinner.jsx';
import { usePdfDocument } from '@/hooks/usePdfDocument.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/apiClient';
import { cn } from '@/lib/utils';

const PDFViewer = ({ isOpen, onClose, pdfId, title, onDownload }) => {
  const { currentUser } = useAuth();
  const { file, blobUrl, loading, error } = usePdfDocument({
    pdfId: isOpen ? pdfId : null,
    versionId: null
  });

  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [useNativeViewer, setUseNativeViewer] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPageNumber(1);
      setScale(1.0);
      setUseNativeViewer(false);
    }
  }, [isOpen, pdfId]);

  const onDocumentLoadSuccess = ({ numPages: pages }) => {
    setNumPages(pages);
    setUseNativeViewer(false);
  };

  const changePage = useCallback(
    (offset) => {
      setPageNumber((prev) => Math.min(Math.max(1, prev + offset), numPages || 1));
    },
    [numPages]
  );

  const handlePrint = async () => {
    if (pdfId) {
      try {
        await pb.fetch(`/pdfs/${pdfId}/print`, 'POST');
      } catch {
        /* audit optional */
      }
    }
    if (!blobUrl) return;
    const printWindow = window.open(blobUrl, '_blank');
    if (printWindow) printWindow.onload = () => printWindow.print();
  };

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen?.();
      } else {
        await document.exitFullscreen?.();
      }
    } catch {
      /* user may have rejected fullscreen */
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Keyboard shortcuts when viewer is open
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      // Don't capture when typing in form fields
      const target = e.target;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      switch (e.key) {
        case 'ArrowRight':
        case 'PageDown':
        case 'j':
          e.preventDefault();
          changePage(1);
          break;
        case 'ArrowLeft':
        case 'PageUp':
        case 'k':
          e.preventDefault();
          changePage(-1);
          break;
        case '+':
        case '=':
          e.preventDefault();
          setScale((s) => Math.min(3, s + 0.2));
          break;
        case '-':
        case '_':
          e.preventDefault();
          setScale((s) => Math.max(0.5, s - 0.2));
          break;
        case '0':
          e.preventDefault();
          setScale(1.0);
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'Escape':
          if (!document.fullscreenElement) onClose?.();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, changePage, toggleFullscreen, onClose]);

  const watermarkText = 'iicon academy';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-full h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-secondary/30">
        <DialogHeader className="px-4 py-3 border-b bg-background flex flex-row items-center justify-between shrink-0">
          <DialogTitle className="truncate pr-4 flex-1">{title || 'PDF Document'}</DialogTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={toggleFullscreen} title="Fullscreen (F)">
              {isFullscreen ? <Minimize2 className="w-4 h-4 mr-2" /> : <Maximize2 className="w-4 h-4 mr-2" />}
              {isFullscreen ? 'Exit' : 'Fullscreen'}
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} disabled={!blobUrl}>
              <Printer className="w-4 h-4 mr-2" /> Print
            </Button>
            <Button size="sm" onClick={onDownload}>
              <Download className="w-4 h-4 mr-2" /> Download
            </Button>
          </div>
        </DialogHeader>

        <div className="bg-muted p-2 border-b flex items-center justify-center gap-4 shrink-0">
          {!useNativeViewer && numPages && (
            <>
              <div className="flex items-center gap-1 bg-background rounded-md border p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => changePage(-1)}
                  disabled={pageNumber <= 1}
                  title="Previous (←)"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs font-medium px-2 tabular-nums">
                  Page {pageNumber} of {numPages}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => changePage(1)}
                  disabled={pageNumber >= numPages}
                  title="Next (→)"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-1 bg-background rounded-md border p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
                  title="Zoom out (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-xs font-medium px-2 min-w-[3rem] text-center tabular-nums">
                  {Math.round(scale * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setScale((s) => Math.min(3, s + 0.2))}
                  title="Zoom in (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setScale(1.0)}
                  title="Reset (0)"
                >
                  <RotateCcw className="w-3 h-3" />
                </Button>
              </div>
              <span className="hidden md:inline text-xs text-muted-foreground">
                ← → page · +/- zoom · 0 reset · F fullscreen · Esc close
              </span>
            </>
          )}
        </div>

        <div
          ref={containerRef}
          className={cn(
            'flex-1 overflow-auto flex justify-center bg-zinc-800/5 dark:bg-black/40 p-4 min-h-0 relative',
            isFullscreen && 'bg-background'
          )}
        >
          {watermarkText && !loading && !error && (
            <div
              className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden opacity-[0.12] select-none"
              aria-hidden
            >
              <p className="text-lg font-semibold rotate-[-24deg] whitespace-nowrap">{watermarkText}</p>
            </div>
          )}
          {loading && <LoadingSpinner text="Loading PDF..." />}
          {error && !loading && (
            <div className="text-destructive p-4">Failed to load PDF: {error}</div>
          )}
          {!loading && !error && useNativeViewer && blobUrl && (
            <iframe title={title} src={blobUrl} className="w-full h-full min-h-[600px] border-0" />
          )}
          {!loading && !error && !useNativeViewer && file && (
            <Document
              file={file}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={() => setUseNativeViewer(true)}
              loading={<LoadingSpinner text="Loading PDF..." />}
              className="flex flex-col items-center drop-shadow-xl"
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer
                renderAnnotationLayer
                className="bg-white rounded-sm"
              />
            </Document>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PDFViewer;
