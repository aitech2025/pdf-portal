
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FileText, Search, X, FolderOpen } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBytes } from '@/lib/utils';
import pb from '@/lib/apiClient';
import { toast } from 'sonner';

const PDFSelectionModal = ({ isOpen, onClose, onSelect }) => {
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchPdfs();
    }
  }, [isOpen]);

  const fetchPdfs = async () => {
    setLoading(true);
    try {
      const records = await pb.collection('pdfs').getList(1, 50, {
        sort: '-created',
        expand: 'categoryId',
        $autoCancel: false
      });
      setPdfs(records.items);
    } catch (err) {
      toast.error('Failed to load PDFs for selection');
    } finally {
      setLoading(false);
    }
  };

  const filteredPdfs = pdfs.filter(pdf => 
    pdf.fileName.toLowerCase().includes(search.toLowerCase()) ||
    pdf.expand?.categoryId?.categoryName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-background">
        <DialogHeader className="p-6 border-b border-border/50 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-poppins">Select a Document</DialogTitle>
              <DialogDescription>Browse or search for a PDF to view.</DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or category..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-muted/30 border-border/50"
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full rounded-[var(--radius-md)]" />)}
            </div>
          ) : filteredPdfs.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">No documents found</h3>
              <p className="text-sm text-muted-foreground">Try adjusting your search query.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPdfs.map(pdf => (
                <button
                  key={pdf.id}
                  onClick={() => {
                    onSelect(pdf);
                    onClose();
                  }}
                  className="flex items-start gap-4 p-4 rounded-[var(--radius-md)] border border-border/50 bg-card hover:border-primary/50 hover:shadow-soft-md transition-all duration-200 text-left group"
                >
                  <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-rose-500/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <FileText className="w-5 h-5 text-rose-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors mb-1">
                      {pdf.fileName}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate max-w-[120px] bg-muted px-1.5 py-0.5 rounded-sm">
                        {pdf.expand?.categoryId?.categoryName || 'Uncategorized'}
                      </span>
                      <span>•</span>
                      <span>{formatBytes(pdf.fileSize)}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PDFSelectionModal;
