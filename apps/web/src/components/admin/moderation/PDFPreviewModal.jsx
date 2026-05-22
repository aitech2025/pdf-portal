
import React, { useState } from 'react';
import client from '@/lib/apiClient.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { Document, Page } from 'react-pdf';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import '@/lib/setupPdfWorker.js';
import { usePdfDocument } from '@/hooks/usePdfDocument.js';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

const PDFPreviewModal = ({ isOpen, onClose, pdf }) => {
  const [numPages, setNumPages] = useState(null);
  const [useNativeViewer, setUseNativeViewer] = useState(false);

  const { file, blobUrl, loading, error } = usePdfDocument({
    pdfId: isOpen && pdf?.id ? pdf.id : null,
    versionId: null,
  });

  const handleDownload = async () => {
    if (!pdf?.id) return;
    try {
      const blob = await client.fetchPdfBlob(pdf.id, { preview: false });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = pdf.fileName || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      toast.error('Download failed');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl h-[85vh] flex flex-col p-0 overflow-hidden bg-card">
        <DialogHeader className="p-4 border-b flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <FileText className="w-5 h-5 text-primary shrink-0" />
            <DialogTitle className="truncate text-base">{pdf?.fileName}</DialogTitle>
          </div>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" /> Download
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-muted/20 p-4 flex justify-center min-h-0">
          {loading && <Skeleton className="w-[500px] h-[700px]" />}
          {error && <p className="text-destructive">{error}</p>}
          {!loading && !error && useNativeViewer && blobUrl && (
            <iframe title={pdf?.fileName} src={blobUrl} className="w-full h-full min-h-[600px] border-0" />
          )}
          {!loading && !error && !useNativeViewer && file && (
            <Document
              file={file}
              onLoadSuccess={({ numPages: pages }) => setNumPages(pages)}
              onLoadError={() => setUseNativeViewer(true)}
              loading={<Skeleton className="w-[500px] h-[700px]" />}
              className="flex flex-col gap-6"
            >
              {Array.from({ length: Math.min(numPages || 1, 5) }, (_, i) => (
                <Page key={`page_${i + 1}`} pageNumber={i + 1} width={500} renderTextLayer={false} renderAnnotationLayer={false} className="bg-white shadow-lg" />
              ))}
            </Document>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PDFPreviewModal;
