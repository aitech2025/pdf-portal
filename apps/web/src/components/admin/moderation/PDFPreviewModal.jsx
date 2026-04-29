
import React, { useState } from 'react';
import pb from '@/lib/apiClient.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, FileText } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Skeleton } from '@/components/ui/skeleton';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const PDFPreviewModal = ({ isOpen, onClose, pdf }) => {
  const [numPages, setNumPages] = useState(null);

  const fileUrl = pdf?.pdfFile ?`/uploads/${pdf.pdfFile}` : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl h-[85vh] flex flex-col p-0 overflow-hidden bg-card">
        <DialogHeader className="p-4 border-b border-border/50 flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="truncate text-base font-poppins">{pdf?.fileName}</DialogTitle>
              <p className="text-xs text-muted-foreground truncate">{pdf?.uploaderName}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="shrink-0 ml-4 shadow-soft-sm bg-background" onClick={() => window.open(fileUrl, '_blank')}>
            <ExternalLink className="w-4 h-4 mr-2" /> Open Full
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-muted/20 p-6 flex justify-center">
          {fileUrl ? (
            <Document
              file={fileUrl}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              loading={<Skeleton className="w-[500px] h-[700px] rounded-lg shadow-soft-md" />}
              className="flex flex-col gap-6"
            >
              {Array.from({ length: Math.min(numPages || 1, 5) }, (_, i) => (
                <div key={`page_${i + 1}`} className="shadow-soft-lg rounded overflow-hidden">
                  <Page 
                    pageNumber={i + 1} 
                    width={500} 
                    renderTextLayer={false} 
                    renderAnnotationLayer={false} 
                    className="bg-white"
                  />
                </div>
              ))}
            </Document>
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground h-full">
              <FileText className="w-12 h-12 mb-4 opacity-20" />
              <p>No file preview available</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PDFPreviewModal;
