
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, Eye, CheckCircle, Trash2, History } from 'lucide-react';
import { formatBytes } from '@/lib/utils';
import { usePDFVersioning } from '@/hooks/usePDFVersioning.js';
import pb from '@/lib/apiClient';
import EnhancedPDFViewer from '@/components/EnhancedPDFViewer.jsx';

const VersionHistoryModal = ({ isOpen, onClose, pdf, onVersionChanged }) => {
  const [versions, setVersions] = useState([]);
  const [viewingVersion, setViewingVersion] = useState(null);
  const { getVersionHistory, makeVersionCurrent, deleteVersion, loading } = usePDFVersioning();

  useEffect(() => {
    if (isOpen && pdf) {
      loadVersions();
    } else {
      setViewingVersion(null);
    }
  }, [isOpen, pdf]);

  const loadVersions = async () => {
    if (!pdf) return;
    const history = await getVersionHistory(pdf.id);
    setVersions(history);
  };

  const handleMakeCurrent = async (version) => {
    if (window.confirm(`Are you sure you want to make Version ${version.versionNumber} the current version?`)) {
      await makeVersionCurrent(pdf.id, version.id, version.versionNumber);
      await loadVersions();
      if (onVersionChanged) onVersionChanged();
    }
  };

  const handleDelete = async (version) => {
    if (versions.length <= 1) {
      alert('Cannot delete the only version of this document.');
      return;
    }
    if (window.confirm(`Are you sure you want to delete Version ${version.versionNumber}? This cannot be undone.`)) {
      await deleteVersion(pdf.id, version.id);
      await loadVersions();
      if (onVersionChanged) onVersionChanged();
    }
  };

  const handleDownload = (version) => {
    const url =`/uploads/${version.pdfFile}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pdf.fileName}_v${version.versionNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (viewingVersion) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="max-w-5xl h-[90vh] p-0 flex flex-col overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between bg-muted/30">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                {pdf?.fileName} <Badge variant="outline">v{viewingVersion.versionNumber}</Badge>
              </h3>
            </div>
            <Button variant="outline" size="sm" onClick={() => setViewingVersion(null)}>
              Back to History
            </Button>
          </div>
          <div className="flex-1 overflow-hidden relative">
            <EnhancedPDFViewer 
              pdfRecord={viewingVersion} 
              className="h-full border-none rounded-none"
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" /> Version History
          </DialogTitle>
          <DialogDescription>
            Manage versions for <span className="font-semibold text-foreground">{pdf?.fileName}</span> ({pdf?.pdf_id})
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-4">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[100px]">Version</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Uploaded By</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="max-w-[200px]">Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versions.map((v) => (
                    <TableRow key={v.id} className={v.isCurrent ? "bg-primary/5" : ""}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          v{v.versionNumber}
                          {v.isCurrent && <Badge className="bg-primary text-primary-foreground text-[10px] px-1 py-0 h-4">Current</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(v.uploadDate || v.created).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {v.expand?.uploadedBy?.name || v.expand?.uploadedBy?.email || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatBytes(v.fileSize)}
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate" title={v.versionNotes}>
                        {v.versionNotes || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setViewingVersion(v)} title="View">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDownload(v)} title="Download">
                            <Download className="w-4 h-4" />
                          </Button>
                          {!v.isCurrent && (
                            <Button variant="ghost" size="icon" onClick={() => handleMakeCurrent(v)} title="Make Current" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDelete(v)} 
                            disabled={versions.length <= 1}
                            title="Delete" 
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {versions.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No version history found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VersionHistoryModal;
