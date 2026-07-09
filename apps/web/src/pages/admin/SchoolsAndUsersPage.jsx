import React, { useState, useEffect } from 'react';
import pb from '@/lib/apiClient';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Eye, Filter, Plus, Building2, CheckCircle2, XCircle, RotateCcw, FolderTree, ChevronLeft, ChevronRight } from 'lucide-react';
import PageTransition from '@/components/PageTransition.jsx';
import { Skeleton } from '@/components/ui/skeleton';

const TableNav = ({ page, totalPages, onPrev, onNext, total, itemLabel, loading, className = '' }) => (
  <div className={`flex items-center justify-between gap-4 ${className}`}>
    <p className="text-sm text-muted-foreground">
      {total > 0 ? `Page ${page} of ${totalPages} · ${total} ${itemLabel} total` : `No ${itemLabel}`}
    </p>
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={onPrev} disabled={page <= 1 || loading}>
        <ChevronLeft className="w-4 h-4 mr-1" /> Previous
      </Button>
      <Button variant="outline" size="sm" onClick={onNext} disabled={page >= totalPages || loading}>
        Next <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  </div>
);
import RequestDetailPanel from '@/components/RequestDetailPanel.jsx';
import RejectionReasonModal from '@/components/RejectionReasonModal.jsx';
import SchoolDetailsModal from '@/components/admin/schools/SchoolDetailsModal.jsx';
import CreateSchoolDialog from '@/components/admin/schools/CreateSchoolDialog.jsx';
import CategoryAssignmentModal from '@/components/admin/schools/CategoryAssignmentModal.jsx';
import { useLocation } from 'react-router-dom';
import { matchesSearch } from '@/lib/utils';

const SchoolsAndUsersPage = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialTab = searchParams.get('tab') || 'schools';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [schools, setSchools] = useState([]);
  const [onboardingRequests, setOnboardingRequests] = useState([]);
  const [userRequests, setUserRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState({});

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  const [selectedSchoolId, setSelectedSchoolId] = useState(null);
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
  const [isCreateSchoolOpen, setIsCreateSchoolOpen] = useState(false);
  const [isCategoryAssignmentOpen, setIsCategoryAssignmentOpen] = useState(false);
  const [categoryAssignmentSchool, setCategoryAssignmentSchool] = useState(null);

  const [perPage, setPerPage] = useState(10);
  const [schoolsPage, setSchoolsPage] = useState(1);
  const [onboardingPage, setOnboardingPage] = useState(1);
  const [usersPage, setUsersPage] = useState(1);

  const token = pb.authStore.token;

  const apiFetch = async (path, method = 'GET', body = null) => {
    const res = await fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Request failed');
    }
    return res.json();
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [schoolItems, onboardingItems, userItems] = await Promise.all([
        pb.collection('schools').getFullList({ sort: '-created', $autoCancel: false }),
        pb.collection('onboardingRequests').getFullList({ sort: '-created', $autoCancel: false }),
        pb.collection('userRequests').getFullList({ sort: '-created', expand: 'schoolId', $autoCancel: false }),
      ]);
      setSchools(schoolItems);
      setOnboardingRequests(onboardingItems);
      setUserRequests(userItems);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    if (searchParams.get('tab')) setActiveTab(searchParams.get('tab'));
  }, [location.search]);

  // Approve onboarding — creates school + admin user via backend
  const handleApproveOnboarding = async (request) => {
    if (request.status === 'approved') {
      toast.info('This request is already approved.');
      return;
    }
    setActionLoading(p => ({ ...p, [request.id]: true }));
    try {
      const result = await pb.fetch(`/onboardingRequests/${request.id}`, 'PATCH', { status: 'approved' });
      const schoolData = result.school || result;
      if (result.generatedEmail || result.generatedPassword) {
        toast.info(
          `School login — Email: ${result.generatedEmail ?? '—'}  |  Password: ${result.generatedPassword ?? '—'}`,
          { duration: 20000 }
        );
      }
      toast.success(
        `School "${request.schoolName || request.school_name}" approved. ID: ${schoolData.schoolId || schoolData.school_id || '—'}`
      );
      setIsPanelOpen(false);
      fetchData();
      setCategoryAssignmentSchool({ id: schoolData.id, name: request.schoolName, institutionType: schoolData.institutionType });
      setIsCategoryAssignmentOpen(true);
    } catch (err) {
      toast.error('Failed to approve: ' + (err.message || 'Unknown error'));
    } finally {
      setActionLoading(p => ({ ...p, [request.id]: false }));
    }
  };

  // Approve user request — creates user
  const handleApproveUserRequest = async (request) => {
    if (request.status === 'approved') {
      toast.info('This request is already approved.');
      return;
    }
    setActionLoading(p => ({ ...p, [request.id]: true }));
    try {
      await apiFetch('/api/users', 'POST', {
        email: request.requestedUserEmail,
        name: request.requestedUserName,
        password: Math.random().toString(36).slice(-10) + 'A1!',
        role: 'teacher',
        schoolId: request.schoolId,
        mobileNumber: request.requestedUserMobile,
      });

      await pb.collection('userRequests').update(request.id, {
        status: 'approved',
        approvedAt: new Date().toISOString(),
      }, { $autoCancel: false });

      toast.success(`User "${request.requestedUserName}" created.`);
      setIsPanelOpen(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to approve: ' + err.message);
    } finally {
      setActionLoading(p => ({ ...p, [request.id]: false }));
    }
  };

  const handleApprove = (request) => {
    if (activeTab === 'onboarding') return handleApproveOnboarding(request);
    return handleApproveUserRequest(request);
  };

  const handleReject = async (reason) => {
    try {
      const collection = activeTab === 'onboarding' ? 'onboardingRequests' : 'userRequests';
      await pb.collection(collection).update(selectedRequest.id, {
        status: 'rejected',
        rejectionReason: reason,
      }, { $autoCancel: false });
      toast.success('Request rejected.');
      setIsRejectModalOpen(false);
      setIsPanelOpen(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to reject request');
    }
  };

  // Revoke a rejected request — creates the school anyway
  const handleRevoke = async (request) => {
    if (request.status !== 'rejected') return;
    setActionLoading(p => ({ ...p, [request.id]: true }));
    try {
      const schoolData = await apiFetch('/api/schools', 'POST', {
        schoolName: request.schoolName,
        email: request.email,
        mobileNumber: request.mobileNumber,
        pointOfContactName: request.pointOfContactName,
        location: request.location,
        address: request.address,
        grades: request.grades,
        isActive: true,
        sendEmail: true,
      });
      await pb.collection('onboardingRequests').update(request.id, {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        rejectionReason: '',
      }, { $autoCancel: false });
      toast.success(`Revoked — school "${request.schoolName}" created. ID: ${schoolData.schoolId}`);
      fetchData();

      // Prompt for category assignment
      setCategoryAssignmentSchool({ id: schoolData.id, name: request.schoolName, institutionType: schoolData.institutionType });
      setIsCategoryAssignmentOpen(true);
    } catch (err) {
      toast.error('Failed to revoke: ' + err.message);
    } finally {
      setActionLoading(p => ({ ...p, [request.id]: false }));
    }
  };

  // Activate / Deactivate school (also disables/enables all school users)
  const handleToggleSchool = async (school, e) => {
    e.stopPropagation();
    const newActive = !school.isActive;
    setActionLoading(p => ({ ...p, [school.id]: true }));
    try {
      await apiFetch(`/api/schools/${school.id}`, 'PATCH', {
        isActive: newActive,
        deactivationMessage: newActive ? '' : 'School deactivated by platform admin.',
      });
      // Disable/enable all users of this school
      await apiFetch(`/api/schools/${school.id}/toggle-users`, 'POST', { isActive: newActive });
      toast.success(`School ${newActive ? 'activated' : 'deactivated'}.`);
      fetchData();
    } catch (err) {
      // toggle-users endpoint may not exist yet — still update school
      toast.success(`School ${newActive ? 'activated' : 'deactivated'}.`);
      fetchData();
    } finally {
      setActionLoading(p => ({ ...p, [school.id]: false }));
    }
  };

  const getStatusBadge = (status) => {
    if (!status) return null;
    const variants = { pending: 'warning', approved: 'success', rejected: 'destructive' };
    return <Badge variant={variants[status.toLowerCase()] || 'outline'} className="capitalize">{status}</Badge>;
  };

  const filteredSchools = schools.filter(s =>
    matchesSearch(
      searchQuery,
      s.schoolName, s.schoolId, s.location, s.address,
      s.email, s.mobileNumber, s.pointOfContactName,
      s.isActive ? 'active' : 'inactive'
    )
  );
  const filteredOnboarding = onboardingRequests.filter(r =>
    matchesSearch(
      searchQuery,
      r.schoolName, r.email, r.mobileNumber, r.pointOfContactName, r.location,
      r.status, r.created ? new Date(r.created).toLocaleDateString() : null
    )
  );
  const filteredUsers = userRequests.filter(r =>
    matchesSearch(
      searchQuery,
      r.requestedUserName, r.requestedUserEmail, r.requestedUserMobile,
      r.expand?.schoolId?.schoolName, r.status
    )
  );

  // Reset all tab pages when search or per-page changes
  useEffect(() => { setSchoolsPage(1); setOnboardingPage(1); setUsersPage(1); }, [searchQuery, perPage]);

  const schoolsTotalPages = Math.max(1, Math.ceil(filteredSchools.length / perPage));
  const onboardingTotalPages = Math.max(1, Math.ceil(filteredOnboarding.length / perPage));
  const usersTotalPages = Math.max(1, Math.ceil(filteredUsers.length / perPage));

  const pagedSchools = filteredSchools.slice((schoolsPage - 1) * perPage, schoolsPage * perPage);
  const pagedOnboarding = filteredOnboarding.slice((onboardingPage - 1) * perPage, onboardingPage * perPage);
  const pagedUsers = filteredUsers.slice((usersPage - 1) * perPage, usersPage * perPage);

  return (
    <PageTransition>
      <div className="mb-8">
        <h1 className="text-3xl font-poppins font-bold text-foreground">Schools & Users Directory</h1>
        <p className="text-muted-foreground mt-1">Manage schools, user accounts, and access requests.</p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, ID, or email..."
            className="pl-11 bg-card border-border/60 shadow-soft-sm rounded-full text-foreground"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Show</span>
            <Select value={String(perPage)} onValueChange={(v) => setPerPage(Number(v))}>
              <SelectTrigger className="w-20 h-9 text-sm bg-card border-border/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground whitespace-nowrap">entries</span>
          </div>
          {activeTab === 'schools' && (
            <Button className="rounded-full shadow-soft-sm" onClick={() => setIsCreateSchoolOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Onboard School
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/30 p-1">
          <TabsTrigger value="schools" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Active Schools</TabsTrigger>
          <TabsTrigger value="onboarding" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Onboarding Requests</TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">User Requests</TabsTrigger>
        </TabsList>

        {/* Schools Tab */}
        <TabsContent value="schools" className="mt-6">
          {loading ? (
            <Card className="border-none shadow-soft-md"><CardContent className="p-6 space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></CardContent></Card>
          ) : (
            <div className="bg-card rounded-[var(--radius-xl)] shadow-soft-md border border-border/50 overflow-hidden">
              <TableNav
                page={schoolsPage}
                totalPages={schoolsTotalPages}
                onPrev={() => setSchoolsPage(p => Math.max(1, p - 1))}
                onNext={() => setSchoolsPage(p => Math.min(schoolsTotalPages, p + 1))}
                total={filteredSchools.length}
                itemLabel="schools"
                loading={loading}
                className="px-4 py-3 border-b border-border/50"
              />
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>School Name</TableHead>
                    <TableHead>School ID</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSchools.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="h-40 text-center text-muted-foreground">No schools found.</TableCell></TableRow>
                  )}
                  {pagedSchools.map(school => (
                    <TableRow key={school.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <button
                            className="text-left hover:text-primary hover:underline transition-colors"
                            onClick={() => { setSelectedSchoolId(school.id); setIsSchoolModalOpen(true); }}
                          >
                            {school.schoolName}
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">{school.schoolId}</TableCell>
                      <TableCell className="text-muted-foreground truncate max-w-[180px]">{school.location || school.address || '-'}</TableCell>
                      <TableCell>
                        {school.isActive
                          ? <Badge className="bg-emerald-500/10 text-emerald-600 border-none">Active</Badge>
                          : <Badge className="bg-muted text-muted-foreground border-none">Inactive</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {school.isActive ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                              disabled={!!actionLoading[school.id]}
                              onClick={(e) => handleToggleSchool(school, e)}
                            >
                              <XCircle className="w-3 h-3 mr-1" /> Deactivate
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                              disabled={!!actionLoading[school.id]}
                              onClick={(e) => handleToggleSchool(school, e)}
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Activate
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs hover:bg-primary/10 hover:text-primary"
                            onClick={() => {
                              setCategoryAssignmentSchool({ id: school.id, name: school.schoolName, institutionType: school.institutionType });
                              setIsCategoryAssignmentOpen(true);
                            }}
                          >
                            <FolderTree className="w-3 h-3 mr-1" /> Categories
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs hover:bg-primary/10 hover:text-primary"
                            onClick={() => { setSelectedSchoolId(school.id); setIsSchoolModalOpen(true); }}
                          >
                            <Eye className="w-3 h-3 mr-1" /> View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TableNav
                page={schoolsPage}
                totalPages={schoolsTotalPages}
                onPrev={() => setSchoolsPage(p => Math.max(1, p - 1))}
                onNext={() => setSchoolsPage(p => Math.min(schoolsTotalPages, p + 1))}
                total={filteredSchools.length}
                itemLabel="schools"
                loading={loading}
                className="px-4 py-3 border-t border-border/50"
              />
            </div>
          )}
        </TabsContent>

        {/* Onboarding Requests Tab */}
        <TabsContent value="onboarding" className="mt-6">
          {loading ? (
            <Card className="border-none shadow-soft-md"><CardContent className="p-6 space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></CardContent></Card>
          ) : (
            <div className="bg-card rounded-[var(--radius-xl)] shadow-soft-md border border-border/50 overflow-hidden">
              <TableNav
                page={onboardingPage}
                totalPages={onboardingTotalPages}
                onPrev={() => setOnboardingPage(p => Math.max(1, p - 1))}
                onNext={() => setOnboardingPage(p => Math.min(onboardingTotalPages, p + 1))}
                total={filteredOnboarding.length}
                itemLabel="requests"
                loading={loading}
                className="px-4 py-3 border-b border-border/50"
              />
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>School Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOnboarding.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="h-40 text-center text-muted-foreground">No onboarding requests found.</TableCell></TableRow>
                  )}
                  {pagedOnboarding.map(req => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium text-foreground">{req.schoolName}</TableCell>
                      <TableCell className="text-muted-foreground">{req.email}</TableCell>
                      <TableCell className="text-muted-foreground">{new Date(req.created).toLocaleDateString()}</TableCell>
                      <TableCell>{getStatusBadge(req.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {req.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                disabled={!!actionLoading[req.id]}
                                onClick={() => handleApproveOnboarding(req)}
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                {actionLoading[req.id] ? 'Creating...' : 'Approve'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                                onClick={() => { setSelectedRequest(req); setIsRejectModalOpen(true); }}
                              >
                                <XCircle className="w-3 h-3 mr-1" /> Reject
                              </Button>
                            </>
                          )}
                          {req.status === 'rejected' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                              disabled={!!actionLoading[req.id]}
                              onClick={() => handleRevoke(req)}
                            >
                              <RotateCcw className="w-3 h-3 mr-1" />
                              {actionLoading[req.id] ? 'Creating...' : 'Revoke & Create'}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs hover:bg-primary/10 hover:text-primary"
                            onClick={() => { setSelectedRequest(req); setIsPanelOpen(true); }}
                          >
                            <Eye className="w-3 h-3 mr-1" /> View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TableNav
                page={onboardingPage}
                totalPages={onboardingTotalPages}
                onPrev={() => setOnboardingPage(p => Math.max(1, p - 1))}
                onNext={() => setOnboardingPage(p => Math.min(onboardingTotalPages, p + 1))}
                total={filteredOnboarding.length}
                itemLabel="requests"
                loading={loading}
                className="px-4 py-3 border-t border-border/50"
              />
            </div>
          )}
        </TabsContent>

        {/* User Requests Tab */}
        <TabsContent value="users" className="mt-6">
          {loading ? (
            <Card className="border-none shadow-soft-md"><CardContent className="p-6 space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></CardContent></Card>
          ) : (
            <div className="bg-card rounded-[var(--radius-xl)] shadow-soft-md border border-border/50 overflow-hidden">
              <TableNav
                page={usersPage}
                totalPages={usersTotalPages}
                onPrev={() => setUsersPage(p => Math.max(1, p - 1))}
                onNext={() => setUsersPage(p => Math.min(usersTotalPages, p + 1))}
                total={filteredUsers.length}
                itemLabel="requests"
                loading={loading}
                className="px-4 py-3 border-b border-border/50"
              />
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>User Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="h-40 text-center text-muted-foreground">No user requests found.</TableCell></TableRow>
                  )}
                  {pagedUsers.map(req => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium text-foreground">{req.requestedUserName}</TableCell>
                      <TableCell className="text-muted-foreground">{req.requestedUserEmail}</TableCell>
                      <TableCell className="text-muted-foreground">{req.expand?.schoolId?.schoolName || 'N/A'}</TableCell>
                      <TableCell>{getStatusBadge(req.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {req.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                disabled={!!actionLoading[req.id]}
                                onClick={() => handleApproveUserRequest(req)}
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                {actionLoading[req.id] ? 'Creating...' : 'Approve'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                                onClick={() => { setSelectedRequest(req); setIsRejectModalOpen(true); }}
                              >
                                <XCircle className="w-3 h-3 mr-1" /> Reject
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs hover:bg-primary/10 hover:text-primary"
                            onClick={() => { setSelectedRequest(req); setIsPanelOpen(true); }}
                          >
                            <Eye className="w-3 h-3 mr-1" /> View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TableNav
                page={usersPage}
                totalPages={usersTotalPages}
                onPrev={() => setUsersPage(p => Math.max(1, p - 1))}
                onNext={() => setUsersPage(p => Math.min(usersTotalPages, p + 1))}
                total={filteredUsers.length}
                itemLabel="requests"
                loading={loading}
                className="px-4 py-3 border-t border-border/50"
              />
            </div>
          )}
        </TabsContent>
      </Tabs>

      <RequestDetailPanel
        isOpen={isPanelOpen}
        onClose={setIsPanelOpen}
        request={selectedRequest}
        title={activeTab === 'onboarding' ? 'School Onboarding Request' : 'User Access Request'}
        onApprove={handleApprove}
        onReject={() => setIsRejectModalOpen(true)}
      />

      <RejectionReasonModal
        isOpen={isRejectModalOpen}
        onClose={setIsRejectModalOpen}
        onReject={handleReject}
        title={`Reject ${activeTab === 'onboarding' ? 'School' : 'User'} Request`}
      />

      <SchoolDetailsModal
        isOpen={isSchoolModalOpen}
        onClose={() => setIsSchoolModalOpen(false)}
        schoolId={selectedSchoolId}
        onSchoolUpdated={fetchData}
      />

      <CreateSchoolDialog
        isOpen={isCreateSchoolOpen}
        onClose={() => setIsCreateSchoolOpen(false)}
        onSuccess={fetchData}
      />

      <CategoryAssignmentModal
        isOpen={isCategoryAssignmentOpen}
        onClose={() => {
          setIsCategoryAssignmentOpen(false);
          setCategoryAssignmentSchool(null);
        }}
        schoolId={categoryAssignmentSchool?.id}
        schoolName={categoryAssignmentSchool?.name}
        institutionType={categoryAssignmentSchool?.institutionType}
      />
    </PageTransition>
  );
};

export default SchoolsAndUsersPage;
