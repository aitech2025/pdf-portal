
import React, { useState } from 'react';
import { 
  Search, Plus, Filter, Download, MoreHorizontal, MapPin,
  Building, Building2, Settings2, Trash2, Eye, Mail, BarChart3, Users
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import PageTransition from '@/components/PageTransition.jsx';

import { useSchoolManagement } from '@/hooks/useSchoolManagement.js';
import { SCHOOL_STATUSES, exportSchoolsToCSV } from '@/utils/schoolManagementUtils.js';

import SchoolStatusBadge from '@/components/admin/schools/SchoolStatusBadge.jsx';
import SchoolLogo from '@/components/admin/schools/SchoolLogo.jsx';
import FilterChip from '@/components/admin/schools/FilterChip.jsx';
import BulkActionBar from '@/components/admin/schools/BulkActionBar.jsx';
import BulkDeleteConfirmation from '@/components/admin/schools/BulkDeleteConfirmation.jsx';
import BulkDeactivateConfirmation from '@/components/admin/schools/BulkDeactivateConfirmation.jsx';
import CreateSchoolDialog from '@/components/admin/schools/CreateSchoolDialog.jsx';
import SchoolDetailsModal from '@/components/admin/schools/SchoolDetailsModal.jsx';
import SchoolTeamMembersModal from '@/components/admin/schools/SchoolTeamMembersModal.jsx';
import SchoolAnalyticsModal from '@/components/admin/schools/SchoolAnalyticsModal.jsx';

const SchoolManagement = () => {
  const {
    schools, totalItems, loading,
    selectedIds, setSelectedIds, schoolStats,
    page, setPage, perPage, setPerPage,
    searchTerm, setSearchInput,
    statusFilter, setStatusFilter,
    clearFilters, actions
  } = useSchoolManagement();

  // Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeactivateOpen, setBulkDeactivateOpen] = useState(false);
  const [activeSchool, setActiveSchool] = useState(null);

  const handleSelectAll = (checked) => {
    if (checked) setSelectedIds(schools.map(s => s.id));
    else setSelectedIds([]);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]);
  };

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 ? schools.filter(s => selectedIds.includes(s.id)) : schools;
    exportSchoolsToCSV(dataToExport);
  };

  const openModal = (school, setter) => {
    setActiveSchool(school);
    setter(true);
  };

  return (
    <PageTransition className="pb-24">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-poppins font-bold text-foreground">School Network</h1>
          <p className="text-muted-foreground mt-1">Manage participating institutions and their access.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="shadow-soft-sm bg-card" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
          <Button variant="default" className="shadow-soft-sm bg-primary text-primary-foreground" onClick={() => setCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Register School
          </Button>
        </div>
      </div>

      <Card className="shadow-soft-md border-border/50 bg-card overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-border/50 bg-muted/10 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by school name, code or principal..." 
                className="pl-9 bg-background border-border/50"
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
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value={SCHOOL_STATUSES.ACTIVE}>Active</SelectItem>
                  <SelectItem value={SCHOOL_STATUSES.INACTIVE}>Inactive</SelectItem>
                  <SelectItem value={SCHOOL_STATUSES.DEACTIVATED}>Deactivated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {(statusFilter !== 'all' || searchTerm) && (
            <div className="flex items-center gap-2 pt-2 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground uppercase mr-1">Filters:</span>
              <FilterChip label="Status" value={statusFilter} onRemove={() => setStatusFilter('all')} />
              <FilterChip label="Search" value={searchTerm ? `"${searchTerm}"` : ''} onRemove={() => setSearchInput('')} />
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-xs text-muted-foreground hover:bg-muted ml-auto">
                Clear All
              </Button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto relative min-h-[400px]">
          <Table>
            <TableHeader className="bg-muted/30 sticky top-0 z-10">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[40px] px-4">
                  <Checkbox checked={selectedIds.length > 0 && selectedIds.length === schools.length} onCheckedChange={handleSelectAll} />
                </TableHead>
                <TableHead className="font-semibold text-foreground">Institution</TableHead>
                <TableHead className="font-semibold text-foreground">Location</TableHead>
                <TableHead className="font-semibold text-foreground">Principal</TableHead>
                <TableHead className="font-semibold text-foreground">Status</TableHead>
                <TableHead className="font-semibold text-foreground text-center">Metrics</TableHead>
                <TableHead className="w-[80px] text-right px-4"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: perPage }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="px-4"><Skeleton className="h-4 w-4 rounded" /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-10 h-10 rounded-md" />
                        <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-16" /></div>
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 mx-auto rounded-full" /></TableCell>
                    <TableCell className="px-4"><Skeleton className="h-8 w-8 rounded-md ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : schools.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                      <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                        <Building2 className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-poppins font-medium mb-1">No schools found</h3>
                      <p className="text-sm text-muted-foreground mb-4">There are no schools matching your filters.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                schools.map((school) => (
                  <TableRow key={school.id} className="hover:bg-muted/30 group">
                    <TableCell className="px-4">
                      <Checkbox checked={selectedIds.includes(school.id)} onCheckedChange={() => toggleSelect(school.id)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <SchoolLogo school={school} className="w-10 h-10" />
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-sm truncate">{school.schoolName}</span>
                          <span className="text-xs text-muted-foreground font-mono">{school.schoolId}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="w-3 h-3 mr-1 shrink-0" />
                        <span className="truncate max-w-[120px]">{school.location || 'Unknown'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{school.pointOfContactName || 'N/A'}</div>
                      <div className="text-xs text-muted-foreground">{school.email}</div>
                    </TableCell>
                    <TableCell>
                      <SchoolStatusBadge status={school.computedStatus} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-3">
                        <div className="flex flex-col items-center" title="Users">
                          <Users className="w-3.5 h-3.5 text-muted-foreground mb-0.5" />
                          <span className="text-xs font-semibold">{schoolStats[school.id]?.totalUsers || 0}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 shadow-soft-lg">
                          <DropdownMenuLabel>School Actions</DropdownMenuLabel>
                          <DropdownMenuItem className="cursor-pointer" onClick={() => openModal(school, setEditModalOpen)}>
                            <Settings2 className="w-4 h-4 mr-2" /> Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer" onClick={() => openModal(school, setTeamModalOpen)}>
                            <Users className="w-4 h-4 mr-2" /> Manage Team
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer" onClick={() => openModal(school, setAnalyticsModalOpen)}>
                            <BarChart3 className="w-4 h-4 mr-2" /> View Analytics
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {school.isActive ? (
                            <DropdownMenuItem className="cursor-pointer text-amber-600" onClick={() => actions.updateSchoolStatus(school.id, false, 'Admin deactivated')}>
                              <Building2 className="w-4 h-4 mr-2" /> Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem className="cursor-pointer text-emerald-600" onClick={() => actions.updateSchoolStatus(school.id, true, '')}>
                              <Building className="w-4 h-4 mr-2" /> Activate
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="cursor-pointer text-destructive" onClick={() => { openModal(school, setBulkDeleteOpen); setSelectedIds([school.id]); }}>
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
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}>Prev</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page * perPage >= totalItems || loading}>Next</Button>
          </div>
        </div>
      </Card>

      <BulkActionBar 
        selectedCount={selectedIds.length} 
        onClear={() => setSelectedIds([])}
        onBulkDelete={() => setBulkDeleteOpen(true)}
        onBulkActivate={() => actions.bulkUpdateStatus(selectedIds, true, '')}
        onBulkDeactivate={() => setBulkDeactivateOpen(true)}
      />

      <CreateSchoolDialog isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} onSuccess={actions.refresh} />
      <SchoolDetailsModal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} school={activeSchool} stats={activeSchool ? schoolStats[activeSchool.id] : null} onSuccess={actions.refresh} />
      <SchoolTeamMembersModal isOpen={teamModalOpen} onClose={() => setTeamModalOpen(false)} school={activeSchool} />
      <SchoolAnalyticsModal isOpen={analyticsModalOpen} onClose={() => setAnalyticsModalOpen(false)} school={activeSchool} />
      
      <BulkDeactivateConfirmation isOpen={bulkDeactivateOpen} onClose={() => { setBulkDeactivateOpen(false); if(selectedIds.length === 1) setSelectedIds([]); }} selectedCount={selectedIds.length} onConfirm={() => actions.bulkUpdateStatus(selectedIds, false, 'Admin bulk deactivation')} />
      <BulkDeleteConfirmation isOpen={bulkDeleteOpen} onClose={() => { setBulkDeleteOpen(false); if(selectedIds.length === 1) setSelectedIds([]); }} selectedCount={selectedIds.length} onConfirm={() => actions.bulkDelete(selectedIds)} />

    </PageTransition>
  );
};

export default SchoolManagement;
