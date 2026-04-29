
import React, { useState } from 'react';
import { 
  Search, Filter, Download, MoreHorizontal, FileCheck, FolderTree, FileWarning, Clock, Percent,
  Eye, CheckCircle, XCircle, Settings2, Trash2, MessageSquare, History
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import PageTransition from '@/components/PageTransition.jsx';

import { useContentModeration } from '@/hooks/useContentModeration.js';
import { MODERATION_STATUSES, exportPDFsToCSV } from '@/utils/contentModerationUtils.js';

// Subcomponents
import PDFStatusBadge from '@/components/admin/moderation/PDFStatusBadge.jsx';
import PDFThumbnail from '@/components/admin/moderation/PDFThumbnail.jsx';
import FilterChip from '@/components/admin/moderation/FilterChip.jsx';
import StatCard from '@/components/admin/moderation/StatCard.jsx';
import BulkActionBar from '@/components/admin/moderation/BulkActionBar.jsx';
import ApprovePDFDialog from '@/components/admin/moderation/ApprovePDFDialog.jsx';
import RejectPDFDialog from '@/components/admin/moderation/RejectPDFDialog.jsx';
import BulkApproveConfirmation from '@/components/admin/moderation/BulkApproveConfirmation.jsx';
import BulkRejectConfirmation from '@/components/admin/moderation/BulkRejectConfirmation.jsx';
import PDFPreviewModal from '@/components/admin/moderation/PDFPreviewModal.jsx';
import PDFDetailsModal from '@/components/admin/moderation/PDFDetailsModal.jsx';
import CommentsSection from '@/components/admin/moderation/CommentsSection.jsx';
import CategoryManagementModal from '@/components/admin/moderation/CategoryManagementModal.jsx';
import VersionHistoryModal from '@/components/admin/pdfs/VersionHistoryModal.jsx';

const ContentModeration = () => {
  const {
    pdfs, totalItems, loading, stats,
    selectedIds, setSelectedIds,
    page, setPage, perPage, setPerPage,
    searchTerm, setSearchInput,
    statusFilter, setStatusFilter,
    clearFilters, actions
  } = useContentModeration();

  // Modals
  const [activePdf, setActivePdf] = useState(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [bulkApproveOpen, setBulkApproveOpen] = useState(false);
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);

  const handleSelectAll = (checked) => {
    if (checked) setSelectedIds(pdfs.map(p => p.id));
    else setSelectedIds([]);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]);
  };

  const openAction = (pdf, setter) => {
    setActivePdf(pdf);
    setter(true);
  };

  const handleExport = () => {
    exportPDFsToCSV(selectedIds.length > 0 ? pdfs.filter(p => selectedIds.includes(p.id)) : pdfs);
  };

  return (
    <PageTransition className="pb-24">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-poppins font-bold text-foreground">Content Moderation</h1>
          <p className="text-muted-foreground mt-1">Review, approve, and manage uploaded documents.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="bg-card shadow-soft-sm" onClick={() => setCatsOpen(true)}>
            <FolderTree className="w-4 h-4 mr-2 text-primary" /> Categories
          </Button>
          <Button variant="default" className="bg-primary shadow-soft-sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <StatCard title="Pending Review" value={stats.totalPending} icon={Clock} colorClass="bg-blue-500/10 text-blue-600 border-blue-500/20" />
        <StatCard title="Approved PDFs" value={stats.totalApproved} icon={FileCheck} colorClass="bg-emerald-500/10 text-emerald-600 border-emerald-500/20" />
        <StatCard title="Rejected PDFs" value={stats.totalRejected} icon={FileWarning} colorClass="bg-rose-500/10 text-rose-600 border-rose-500/20" />
        <StatCard title="Approval Rate" value={`${stats.approvalRate}%`} icon={Percent} colorClass="bg-primary/10 text-primary border-primary/20" />
        <StatCard title="Avg Review Time" value={stats.avgTime} icon={Clock} colorClass="bg-muted text-muted-foreground border-border/50" />
      </div>

      <Card className="shadow-soft-md border-border/50 bg-card overflow-hidden">
        <div className="p-4 border-b border-border/50 bg-muted/10 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by PDF name..." 
                className="pl-9 bg-background shadow-soft-sm"
                value={searchTerm}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2 w-full md:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px] bg-background">
                  <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value={MODERATION_STATUSES.PENDING}>Pending</SelectItem>
                  <SelectItem value={MODERATION_STATUSES.APPROVED}>Approved</SelectItem>
                  <SelectItem value={MODERATION_STATUSES.REJECTED}>Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {(statusFilter !== 'all' || searchTerm) && (
            <div className="flex items-center gap-2 pt-2 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground uppercase mr-1">Filters:</span>
              <FilterChip label="Status" value={statusFilter} onRemove={() => setStatusFilter('all')} />
              <FilterChip label="Search" value={searchTerm ? `"${searchTerm}"` : ''} onRemove={() => setSearchInput('')} />
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-xs text-muted-foreground hover:text-foreground hover:bg-muted ml-auto">
                Clear All
              </Button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto relative min-h-[400px]">
          <Table>
            <TableHeader className="bg-muted/30 sticky top-0 z-10">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[40px] px-4">
                  <Checkbox checked={selectedIds.length > 0 && selectedIds.length === pdfs.length} onCheckedChange={handleSelectAll} />
                </TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Uploader & School</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right px-4"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: perPage }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="px-4"><Skeleton className="h-4 w-4 rounded" /></TableCell>
                    <TableCell><div className="flex gap-3 items-center"><Skeleton className="w-12 h-16 rounded" /><Skeleton className="h-4 w-32" /></div></TableCell>
                    <TableCell><div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-20" /></div></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="px-4"><Skeleton className="h-8 w-8 rounded-md ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : pdfs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <FileCheck className="w-12 h-12 mb-3 opacity-20" />
                      <p className="font-medium">No documents found matching filters.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                pdfs.map((pdf) => (
                  <TableRow key={pdf.id} className="hover:bg-muted/30 group">
                    <TableCell className="px-4">
                      <Checkbox checked={selectedIds.includes(pdf.id)} onCheckedChange={() => toggleSelect(pdf.id)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 max-w-[300px]">
                        <PDFThumbnail />
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <Badge variant="outline" className="text-[10px] px-1 font-mono text-muted-foreground">{pdf.pdfId || 'NO-ID'}</Badge>
                            <Badge variant="secondary" className="text-[10px] px-1 bg-primary/10 text-primary border-none">v{pdf.currentVersion || 1}</Badge>
                          </div>
                          <span className="font-semibold text-sm truncate" title={pdf.fileName}>{pdf.fileName}</span>
                          <span className="text-xs text-muted-foreground">{(pdf.fileSize / 1024 / 1024).toFixed(2)} MB • {new Date(pdf.uploadedAt || pdf.created).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium truncate max-w-[150px]">{pdf.uploaderName}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[150px]">{pdf.schoolName}</div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm bg-muted/50 px-2 py-1 rounded-md border border-border/50">{pdf.categoryName}</span>
                    </TableCell>
                    <TableCell>
                      <PDFStatusBadge status={pdf.computedStatus} />
                    </TableCell>
                    <TableCell className="px-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 shadow-soft-lg">
                          <DropdownMenuItem className="cursor-pointer" onClick={() => openAction(pdf, setPreviewOpen)}>
                            <Eye className="w-4 h-4 mr-2" /> Preview Document
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer" onClick={() => openAction(pdf, setDetailsOpen)}>
                            <Settings2 className="w-4 h-4 mr-2" /> Edit Metadata
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer" onClick={() => openAction(pdf, setHistoryOpen)}>
                            <History className="w-4 h-4 mr-2 text-primary" /> Version History
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer" onClick={() => openAction(pdf, setCommentsOpen)}>
                            <MessageSquare className="w-4 h-4 mr-2" /> View Notes
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          
                          {pdf.computedStatus !== MODERATION_STATUSES.APPROVED && (
                            <DropdownMenuItem className="cursor-pointer text-emerald-600 focus:text-emerald-600" onClick={() => openAction(pdf, setApproveOpen)}>
                              <CheckCircle className="w-4 h-4 mr-2" /> Approve
                            </DropdownMenuItem>
                          )}
                          {pdf.computedStatus !== MODERATION_STATUSES.REJECTED && (
                            <DropdownMenuItem className="cursor-pointer text-rose-600 focus:text-rose-600" onClick={() => openAction(pdf, setRejectOpen)}>
                              <XCircle className="w-4 h-4 mr-2" /> Reject
                            </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={() => actions.deletePDF(pdf.id)}>
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="p-4 border-t border-border/50 bg-muted/10 flex items-center justify-between">
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            Showing {Math.min((page - 1) * perPage + 1, totalItems)} to {Math.min(page * perPage, totalItems)} of {totalItems}
            <Select value={perPage.toString()} onValueChange={(val) => { setPerPage(Number(val)); setPage(1); }}>
              <SelectTrigger className="w-[70px] h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map(v => <SelectItem key={v} value={v.toString()}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}>Prev</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page * perPage >= totalItems || loading}>Next</Button>
          </div>
        </div>
      </Card>

      <BulkActionBar 
        selectedCount={selectedIds.length} 
        onClear={() => setSelectedIds([])}
        onApprove={() => setBulkApproveOpen(true)}
        onReject={() => setBulkRejectOpen(true)}
        onDelete={() => actions.bulkDelete(selectedIds)}
      />

      <ApprovePDFDialog isOpen={approveOpen} onClose={() => setApproveOpen(false)} pdf={activePdf} onApprove={actions.updatePDFStatus} />
      <RejectPDFDialog isOpen={rejectOpen} onClose={() => setRejectOpen(false)} pdf={activePdf} onReject={actions.updatePDFStatus} />
      <BulkApproveConfirmation isOpen={bulkApproveOpen} onClose={() => setBulkApproveOpen(false)} count={selectedIds.length} onConfirm={() => actions.bulkUpdateStatus(selectedIds, 'approved')} />
      <BulkRejectConfirmation isOpen={bulkRejectOpen} onClose={() => setBulkRejectOpen(false)} count={selectedIds.length} onConfirm={(reason) => actions.bulkUpdateStatus(selectedIds, 'rejected', reason)} />
      
      <PDFPreviewModal isOpen={previewOpen} onClose={() => setPreviewOpen(false)} pdf={activePdf} />
      <PDFDetailsModal isOpen={detailsOpen} onClose={() => setDetailsOpen(false)} pdf={activePdf} onSave={actions.refresh} />
      <CommentsSection isOpen={commentsOpen} onClose={() => setCommentsOpen(false)} pdf={activePdf} />
      <CategoryManagementModal isOpen={catsOpen} onClose={() => setCatsOpen(false)} />
      <VersionHistoryModal isOpen={historyOpen} onClose={() => setHistoryOpen(false)} pdf={activePdf} onVersionChanged={actions.refresh} />

    </PageTransition>
  );
};

export default ContentModeration;
