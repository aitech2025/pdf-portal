
import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { 
  ZoomIn, ZoomOut, Maximize, Minimize, ChevronLeft, ChevronRight, 
  Download, Printer, Share2, Info, BookmarkPlus, Search, RotateCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Set worker path for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const AdvancedPDFViewer = ({ url, title, metadata, onDownload }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [loading, setLoading] = useState(true);
  const [pageInput, setPageInput] = useState('1');
  
  const containerRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
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
  }, [pageNumber, numPages, scale, isFullscreen]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const handlePrevPage = () => setPageNumber(prev => Math.max(prev - 1, 1));
  const handleNextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages || 1));
  
  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 3.0));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
  
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

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

  const handlePageInputChange = (e) => {
    setPageInput(e.target.value);
  };

  const handlePageInputSubmit = (e) => {
    if (e.key === 'Enter') {
      const page = parseInt(pageInput, 10);
      if (page >= 1 && page <= numPages) {
        setPageNumber(page);
      } else {
        setPageInput(pageNumber.toString());
        toast.error(`Please enter a valid page number between 1 and ${numPages}`);
      }
    }
  };

  useEffect(() => {
    setPageInput(pageNumber.toString());
  }, [pageNumber]);

  return (
    <div 
      ref={containerRef} 
      className={cn(
        "flex flex-col bg-background border border-border/50 rounded-[var(--radius-xl)] overflow-hidden shadow-soft-xl transition-all duration-300",
        isFullscreen ? "fixed inset-0 z-50 rounded-none border-none" : "h-[800px]"
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border/50 shrink-0 z-10">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setShowSidebar(!showSidebar)} className="text-muted-foreground hover:text-foreground">
            <Info className="w-5 h-5" />
          </Button>
          <div className="h-6 w-px bg-border mx-2"></div>
          <h3 className="font-poppins font-semibold text-foreground truncate max-w-[200px] md:max-w-md">
            {title || 'Document Viewer'}
          </h3>
        </div>

        <div className="flex items-center gap-1 md:gap-2 bg-muted/30 p-1 rounded-[var(--radius-md)]">
          <Button variant="ghost" size="icon" onClick={handlePrevPage} disabled={pageNumber <= 1} className="h-8 w-8">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 px-2">
            <Input 
              value={pageInput}
              onChange={handlePageInputChange}
              onKeyDown={handlePageInputSubmit}
              className="w-12 h-7 text-center text-xs bg-background border-border/50 px-1"
            />
            <span className="text-xs text-muted-foreground font-medium">of {numPages || '-'}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={handleNextPage} disabled={pageNumber >= numPages} className="h-8 w-8">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          <div className="hidden md:flex items-center gap-1 bg-muted/30 p-1 rounded-[var(--radius-md)] mr-2">
            <Button variant="ghost" size="icon" onClick={handleZoomOut} disabled={scale <= 0.5} className="h-8 w-8">
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs font-medium w-12 text-center">{Math.round(scale * 100)}%</span>
            <Button variant="ghost" size="icon" onClick={handleZoomIn} disabled={scale >= 3.0} className="h-8 w-8">
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
          
          <Button variant="ghost" size="icon" onClick={handleRotate} className="text-muted-foreground hover:text-foreground hidden sm:inline-flex">
            <RotateCw className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-muted-foreground hover:text-foreground">
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </Button>
          <div className="h-6 w-px bg-border mx-1 hidden sm:block"></div>
          <Button variant="ghost" size="icon" onClick={onDownload} className="text-primary hover:bg-primary/10 hidden sm:inline-flex">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden bg-muted/10 relative">
        
        {/* Sidebar (Metadata & Tools) */}
        {showSidebar && (
          <div className="w-72 shrink-0 border-r border-border/50 bg-card overflow-y-auto p-5 hidden lg:block animate-fade-in">
            <h4 className="font-poppins font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Document Info</h4>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">File Name</p>
                <p className="text-sm font-medium text-foreground break-words">{title}</p>
              </div>
              {metadata && Object.entries(metadata).map(([key, value]) => (
                <div key={key}>
                  <p className="text-xs text-muted-foreground mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                  <p className="text-sm font-medium text-foreground">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 space-y-3">
              <Button variant="outline" className="w-full justify-start shadow-soft-sm bg-background">
                <Search className="w-4 h-4 mr-2 text-muted-foreground" /> Search Document
              </Button>
              <Button variant="outline" className="w-full justify-start shadow-soft-sm bg-background">
                <BookmarkPlus className="w-4 h-4 mr-2 text-muted-foreground" /> Add Bookmark
              </Button>
              <Button variant="outline" className="w-full justify-start shadow-soft-sm bg-background">
                <Share2 className="w-4 h-4 mr-2 text-muted-foreground" /> Share Link
              </Button>
              <Button variant="outline" className="w-full justify-start shadow-soft-sm bg-background">
                <Printer className="w-4 h-4 mr-2 text-muted-foreground" /> Print Document
              </Button>
            </div>
          </div>
        )}

        {/* PDF Render Area */}
        <div className="flex-1 overflow-auto flex justify-center bg-[#e5e7eb] dark:bg-[#0f172a] relative p-4 md:p-8">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/50 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-4">
                <Skeleton className="w-[600px] h-[800px] rounded-lg shadow-xl" />
              </div>
            </div>
          )}
          
          <Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={null}
            className="flex flex-col items-center"
          >
            <Card className="border-none shadow-2xl overflow-hidden rounded-none transition-transform duration-200 ease-out" style={{ transform: `rotate(${rotation}deg)` }}>
              <Page 
                pageNumber={pageNumber} 
                scale={scale} 
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="bg-white"
                loading={<Skeleton className="w-[600px] h-[800px]" />}
              />
            </Card>
          </Document>
        </div>
      </div>
    </div>
  );
};

export default AdvancedPDFViewer;
