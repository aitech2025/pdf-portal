
import React, { useState } from 'react';
import {
  Search, Plus, Filter, Download, MoreHorizontal, ShieldAlert,
  UserCheck, UserX, Settings2, Trash2, Eye, Mail, Users, KeyRound, Copy, CheckCheck
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import PageTransition from '@/components/PageTransition.jsx';
import pb from '@/lib/apiClient';

import { useUserManagement } from '@/hooks/useUserManagement.js';
import { USER_ROLES, USER_STATUSES, exportUsersToCSV } from '@/utils/userManagementUtils.js';

// Subcomponents
import UserStatusBadge from '@/components/admin/users/UserStatusBadge.jsx';
import UserRoleBadge from '@/components/admin/users/UserRoleBadge.jsx';
import UserAvatar from '@/components/admin/users/UserAvatar.jsx';
import FilterChip from '@/components/admin/users/FilterChip.jsx';
import BulkActionBar from '@/components/admin/users/BulkActionBar.jsx';
import BulkDeleteConfirmation from '@/components/admin/users/BulkDeleteConfirmation.jsx';
import CreateUserDialog from '@/components/admin/users/CreateUserDialog.jsx';
import UserDetailsModal from '@/components/admin/users/UserDetailsModal.jsx';
import UserActivityModal from '@/components/admin/users/UserActivityModal.jsx';

const UserManagement = () => {
  const {
    users, totalItems, loading,
    selectedIds, setSelectedIds,
    page, setPage, perPage, setPerPage,
    searchTerm, setSearchInput,
    roleFilter, setRoleFilter,
    statusFilter, setStatusFilter,
    clearFilters,
    actions
  } = useUserManagement();

  // Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [activeUser, setActiveUser] = useState(null);

  // Password reset
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetUser, setResetUser] = useState(null);
  const [resetSendVia, setResetSendVia] = useState('manual');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const openReset = (user) => {
    setResetUser(user);
    setResetResult(null);
    setResetSendVia('manual');
    setResetModalOpen(true);
  };

  const handleResetPassword = async () => {
    if (!resetUser) return;
    setResetLoading(true);
    try {
      const token = pb.authStore.token;
      const resp = await fetch(`/api/users/${resetUser.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sendVia: resetSendVia }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || 'Failed');
      setResetResult(data);
      toast.success('Password reset successfully');
    } catch (e) {
      toast.error(e.message || 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  const copyPassword = () => {
    if (resetResult?.generatedPassword) {
      navigator.clipboard.writeText(resetResult.generatedPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(users.map(u => u.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
    );
  };

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0
      ? users.filter(u => selectedIds.includes(u.id))
      : users;
    exportUsersToCSV(dataToExport);
  };

  const openEdit = (user) => {
    setActiveUser(user);
    setEditModalOpen(true);
  };

  const openActivity = (user) => {
    setActiveUser(user);
    setActivityModalOpen(true);
  };

  const handleBulkActivate = () => actions.bulkUpdateStatus(selectedIds, true);
  const handleBulkSuspend = () => actions.bulkUpdateStatus(selectedIds, false, true);

  return (
    <PageTransition className="pb-24">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-poppins font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-1">Manage platform users, roles, and access permissions.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="shadow-soft-sm bg-card" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
          <Button variant="default" className="shadow-soft-sm bg-primary text-primary-foreground" onClick={() => setCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add User
          </Button>
        </div>
      </div>

      <Card className="shadow-soft-md border-border/50 bg-card overflow-hidden">
        {/* Filters Header */}
        <div className="p-4 border-b border-border/50 bg-muted/10 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                className="pl-9 bg-background border-border/50 shadow-soft-sm"
                value={searchTerm}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[140px] bg-background">
                  <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value={USER_ROLES.ADMIN}>Admin</SelectItem>
                  <SelectItem value={USER_ROLES.SCHOOL}>School</SelectItem>
                  <SelectItem value={USER_ROLES.TEACHER}>Teacher</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] bg-background">
                  <ShieldAlert className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value={USER_STATUSES.ACTIVE}>Active</SelectItem>
                  <SelectItem value={USER_STATUSES.INACTIVE}>Inactive</SelectItem>
                  <SelectItem value={USER_STATUSES.PENDING}>Pending</SelectItem>
                  <SelectItem value={USER_STATUSES.SUSPENDED}>Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filter Chips */}
          {(roleFilter !== 'all' || statusFilter !== 'all' || searchTerm) && (
            <div className="flex items-center gap-2 pt-2 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mr-1">Active Filters:</span>
              <FilterChip label="Role" value={roleFilter} onRemove={() => setRoleFilter('all')} />
              <FilterChip label="Status" value={statusFilter} onRemove={() => setStatusFilter('all')} />
              <FilterChip label="Search" value={searchTerm ? `"${searchTerm}"` : ''} onRemove={() => setSearchInput('')} />
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-xs text-muted-foreground hover:text-foreground hover:bg-muted ml-auto">
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
                  <Checkbox
                    checked={selectedIds.length > 0 && selectedIds.length === users.length}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all users"
                  />
                </TableHead>
                <TableHead className="font-semibold text-foreground">User</TableHead>
                <TableHead className="font-semibold text-foreground">Role</TableHead>
                <TableHead className="font-semibold text-foreground">Status</TableHead>
                <TableHead className="font-semibold text-foreground">Last Login</TableHead>
                <TableHead className="w-[80px] text-right px-4"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                // Skeletons
                Array.from({ length: perPage }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="px-4"><Skeleton className="h-4 w-4 rounded" /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="px-4"><Skeleton className="h-8 w-8 rounded-md ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                // Empty state
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                      <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                        <Users className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-poppins font-medium text-foreground mb-1">No users found</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        We couldn't find any users matching your current filter criteria.
                      </p>
                      <Button variant="outline" onClick={clearFilters} className="bg-background">
                        Clear Filters
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                // Data rows
                users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/30 transition-colors group">
                    <TableCell className="px-4">
                      <Checkbox
                        checked={selectedIds.includes(user.id)}
                        onCheckedChange={() => toggleSelect(user.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <UserAvatar user={user} className="w-10 h-10" />
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-sm text-foreground truncate">{user.displayName}</span>
                          <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <UserRoleBadge role={user.role} />
                    </TableCell>
                    <TableCell>
                      <UserStatusBadge status={user.computedStatus} />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 data-[state=open]:opacity-100">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 shadow-soft-lg">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem className="cursor-pointer" onClick={() => openEdit(user)}>
                            <Settings2 className="w-4 h-4 mr-2 text-muted-foreground" /> Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer" onClick={() => openActivity(user)}>
                            <Eye className="w-4 h-4 mr-2 text-muted-foreground" /> View Activity
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer">
                            <Mail className="w-4 h-4 mr-2 text-muted-foreground" /> Send Email
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer" onClick={() => openReset(user)}>
                            <KeyRound className="w-4 h-4 mr-2 text-muted-foreground" /> Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />

                          {user.isActive ? (
                            <DropdownMenuItem className="cursor-pointer text-amber-600 focus:text-amber-600" onClick={() => actions.suspendUser(user.id, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())}>
                              <UserX className="w-4 h-4 mr-2" /> Suspend User
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem className="cursor-pointer text-emerald-600 focus:text-emerald-600" onClick={() => actions.activateUser(user.id)}>
                              <UserCheck className="w-4 h-4 mr-2" /> Activate User
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={() => { setActiveUser(user); setBulkDeleteOpen(true); setSelectedIds([user.id]); }}>
                            <Trash2 className="w-4 h-4 mr-2" /> Delete User
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

        {/* Pagination Footer */}
        <div className="p-4 border-t border-border/50 bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            Showing {Math.min((page - 1) * perPage + 1, totalItems)} to {Math.min(page * perPage, totalItems)} of {totalItems} users
            <Select value={perPage.toString()} onValueChange={(val) => { setPerPage(Number(val)); setPage(1); }}>
              <SelectTrigger className="w-[70px] h-8 text-xs bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading} className="bg-background">
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page * perPage >= totalItems || loading} className="bg-background">
              Next
            </Button>
          </div>
        </div>
      </Card>

      <BulkActionBar
        selectedCount={selectedIds.length}
        onClear={() => setSelectedIds([])}
        onBulkDelete={() => setBulkDeleteOpen(true)}
        onBulkActivate={handleBulkActivate}
        onBulkSuspend={handleBulkSuspend}
      />

      {/* Modals */}
      <CreateUserDialog
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={actions.refresh}
      />

      <UserDetailsModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        user={activeUser}
        onSuccess={actions.refresh}
      />

      <UserActivityModal
        isOpen={activityModalOpen}
        onClose={() => setActivityModalOpen(false)}
        user={activeUser}
      />

      <BulkDeleteConfirmation
        isOpen={bulkDeleteOpen}
        onClose={() => { setBulkDeleteOpen(false); if (selectedIds.length === 1) setSelectedIds([]); }}
        selectedCount={selectedIds.length}
        onConfirm={() => actions.bulkDelete(selectedIds)}
      />

      {/* Password Reset Modal */}
      <Dialog open={resetModalOpen} onOpenChange={(o) => { if (!resetLoading) setResetModalOpen(o); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" /> Reset Password
            </DialogTitle>
          </DialogHeader>
          {!resetResult ? (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Reset password for <span className="font-semibold text-foreground">{resetUser?.displayName || resetUser?.email}</span>
              </p>
              <div className="space-y-3">
                <Label>Send new password via</Label>
                <RadioGroup value={resetSendVia} onValueChange={setResetSendVia} className="space-y-2">
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 cursor-pointer hover:bg-muted/30">
                    <RadioGroupItem value="email" id="via-email" />
                    <Label htmlFor="via-email" className="cursor-pointer flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-500" /> Send via Email
                    </Label>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 cursor-pointer hover:bg-muted/30">
                    <RadioGroupItem value="whatsapp" id="via-wa" />
                    <Label htmlFor="via-wa" className="cursor-pointer flex items-center gap-2">
                      <span className="text-emerald-500 font-bold text-sm">WA</span> Send via WhatsApp
                    </Label>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 cursor-pointer hover:bg-muted/30">
                    <RadioGroupItem value="manual" id="via-manual" />
                    <Label htmlFor="via-manual" className="cursor-pointer flex items-center gap-2">
                      <Copy className="w-4 h-4 text-muted-foreground" /> Show password to share manually
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setResetModalOpen(false)}>Cancel</Button>
                <Button onClick={handleResetPassword} disabled={resetLoading}>
                  {resetLoading ? 'Resetting...' : 'Reset Password'}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium mb-1">Password reset successfully</p>
                {resetSendVia !== 'manual' && (
                  <p className="text-xs text-muted-foreground">Sent via {resetSendVia} to {resetResult.userEmail}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Generated Password</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-3 rounded-lg bg-muted font-mono text-sm text-foreground border border-border">
                    {resetResult.generatedPassword}
                  </code>
                  <Button variant="outline" size="icon" onClick={copyPassword}>
                    {copied ? <CheckCheck className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Share this password securely with the user.</p>
              </div>
              <DialogFooter>
                <Button onClick={() => setResetModalOpen(false)}>Done</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
};

export default UserManagement;
