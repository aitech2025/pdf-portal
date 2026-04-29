
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Printer, ZoomIn, ZoomOut, RotateCcw, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import LoadingSpinner from './LoadingSpinner.jsx';

// Set up worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const PDFViewer = ({ isOpen, onClose, pdfUrl, title, onDownload }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const changePage = (offset) => {
    setPageNumber(prevPageNumber => Math.min(Math.max(1, prevPageNumber + offset), numPages || 1));
  };

  const handlePrint = () => {
    const printWindow = window.open(pdfUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => printWindow.print();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-full h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-secondary/30">
        <DialogHeader className="px-4 py-3 border-b bg-background flex flex-row items-center justify-between shrink-0">
          <DialogTitle className="truncate pr-4 flex-1">{title || 'PDF Document'}</DialogTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" /> Print
            </Button>
            <Button size="sm" onClick={onDownload}>
              <Download className="w-4 h-4 mr-2" /> Download
            </Button>
          </div>
        </DialogHeader>

        <div className="bg-muted p-2 border-b flex items-center justify-center gap-4 shrink-0">
          <div className="flex items-center gap-1 bg-background rounded-md border p-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => changePage(-1)} disabled={pageNumber <= 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs font-medium px-2 tabular-nums">
              Page {pageNumber} of {numPages || '-'}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => changePage(1)} disabled={pageNumber >= numPages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1 bg-background rounded-md border p-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScale(s => Math.max(0.5, s - 0.2))}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs font-medium px-2 min-w-[3rem] text-center tabular-nums">{Math.round(scale * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScale(s => Math.min(3, s + 0.2))}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <div className="w-px h-4 bg-border mx-1" />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScale(1.0)}>
              <RotateCcw className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto flex justify-center bg-zinc-800/5 dark:bg-black/40 p-4">
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={<LoadingSpinner text="Loading PDF..." />}
            error={<div className="text-destructive p-4">Failed to load PDF. Please try downloading it instead.</div>}
            className="flex flex-col items-center drop-shadow-xl"
          >
            <Page 
              pageNumber={pageNumber} 
              scale={scale} 
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="bg-white rounded-sm"
            />
          </Document>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PDFViewer;
