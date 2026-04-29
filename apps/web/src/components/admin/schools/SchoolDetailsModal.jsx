
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { School, MapPin, Mail, Phone, User, Calendar, FileText, Edit2, Trash2, Plus, Save, X } from 'lucide-react';
import { useSchoolUserManagement } from '@/hooks/useSchoolUserManagement.js';
import UserSearchAndFilter from './UserSearchAndFilter.jsx';
import UserListTable from './UserListTable.jsx';
import CreateUserModal from './CreateUserModal.jsx';
import EditUserModal from './EditUserModal.jsx';
import DeleteConfirmationDialog from './DeleteConfirmationDialog.jsx';
import pb from '@/lib/apiClient';

const SchoolDetailsModal = ({ isOpen, onClose, schoolId, onSchoolUpdated }) => {
  const {
    updateSchool, getSchoolUsers, deleteUser
  } = useSchoolUserManagement();

  const [school, setSchool] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  // User Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null); // { type: 'School'|'User', item: obj }

  const fetchData = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const [schoolData, usersData] = await Promise.all([
        pb.collection('schools').getOne(schoolId, { $autoCancel: false }),
        getSchoolUsers(schoolId)
      ]);
      setSchool(schoolData);
      setEditForm(schoolData);
      setUsers(usersData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && schoolId) {
      fetchData();
      setActiveTab('overview');
      setIsEditing(false);
    }
  }, [isOpen, schoolId]);

  const handleEditChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveSchool = async () => {
    try {
      await updateSchool(school.id, editForm);
      setIsEditing(false);
      fetchData();
      if (onSchoolUpdated) onSchoolUpdated();
    } catch (err) {
      // Error handled in hook
    }
  };

  const handleUserStatusToggle = async (user) => {
    try {
      await pb.collection('users').update(user.id, { isActive: !user.isActive }, { $autoCancel: false });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchSearch = !searchQuery ||
      (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && u.isActive) ||
      (statusFilter === 'inactive' && !u.isActive);
    return matchSearch && matchRole && matchStatus;
  });

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background">
          {loading || !school ? (
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <Skeleton className="w-16 h-16 rounded-xl" />
                <div className="space-y-2"><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-32" /></div>
              </div>
              <Skeleton className="h-[400px] w-full rounded-xl" />
            </div>
          ) : (
            <>
              <DialogHeader className="p-6 border-b border-border/50 bg-muted/5 shrink-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
                      <School className="w-7 h-7" />
                    </div>
                    <div>
                      <DialogTitle className="text-2xl font-poppins flex items-center gap-3">
                        {isEditing ? (
                          <Input
                            value={editForm.schoolName || ''}
                            onChange={(e) => handleEditChange('schoolName', e.target.value)}
                            className="h-8 w-64 font-poppins text-lg"
                          />
                        ) : (
                          school.schoolName
                        )}
                        {!isEditing && (
                          school.isActive ? (
                            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-none text-xs">Active</Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-muted text-muted-foreground border-none text-xs">Inactive</Badge>
                          )
                        )}
                      </DialogTitle>
                      {isEditing ? (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">ID:</span>
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{school.schoolId}</span>
                          <span className="text-xs text-muted-foreground">(auto-generated, read-only)</span>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-1 font-mono">{school.schoolId}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} className="h-8">
                          <X className="w-4 h-4 mr-2" /> Cancel
                        </Button>
                        <Button size="sm" onClick={handleSaveSchool} className="h-8">
                          <Save className="w-4 h-4 mr-2" /> Save
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="h-8">
                          <Edit2 className="w-4 h-4 mr-2" /> Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => { setDeletingItem({ type: 'School', item: school }); setDeleteDialogOpen(true); }} className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10 border-transparent hover:border-destructive/30">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-hidden flex flex-col">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full">
                  <div className="px-6 pt-2 border-b border-border/50 shrink-0">
                    <TabsList className="bg-transparent h-auto p-0">
                      <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 pb-3 pt-2">Overview</TabsTrigger>
                      <TabsTrigger value="users" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 pb-3 pt-2">
                        Users <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0 h-4">{users.length}</Badge>
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <TabsContent value="overview" className="m-0 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Contact Information</h3>
                          <div className="bg-card border border-border/50 rounded-[var(--radius-md)] p-4 space-y-4">
                            <div className="flex items-start gap-3">
                              <MapPin className="w-4 h-4 text-muted-foreground mt-2" />
                              <div className="flex-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Location / Address</p>
                                {isEditing ? (
                                  <Input value={editForm.location || editForm.address || ''} onChange={e => handleEditChange('location', e.target.value)} className="mt-1 h-8 text-foreground" />
                                ) : (
                                  <p className="text-sm text-foreground mt-0.5">{school.location || school.address || 'Not specified'}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <Mail className="w-4 h-4 text-muted-foreground mt-2" />
                              <div className="flex-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Email</p>
                                {isEditing ? (
                                  <Input type="email" value={editForm.email || ''} onChange={e => handleEditChange('email', e.target.value)} className="mt-1 h-8 text-foreground" />
                                ) : (
                                  <p className="text-sm text-foreground mt-0.5">{school.email}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <Phone className="w-4 h-4 text-muted-foreground mt-2" />
                              <div className="flex-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Phone</p>
                                {isEditing ? (
                                  <Input value={editForm.mobileNumber || ''} onChange={e => handleEditChange('mobileNumber', e.target.value)} className="mt-1 h-8 text-foreground" />
                                ) : (
                                  <p className="text-sm text-foreground mt-0.5">{school.mobileNumber || 'Not specified'}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <User className="w-4 h-4 text-muted-foreground mt-2" />
                              <div className="flex-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Principal / Contact</p>
                                {isEditing ? (
                                  <Input value={editForm.principalName || editForm.pointOfContactName || ''} onChange={e => handleEditChange('principalName', e.target.value)} className="mt-1 h-8 text-foreground" />
                                ) : (
                                  <p className="text-sm text-foreground mt-0.5">{school.principalName || school.pointOfContactName || 'Not specified'}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">System Details</h3>
                          <div className="bg-card border border-border/50 rounded-[var(--radius-md)] p-4 space-y-4">
                            <div className="flex items-start gap-3">
                              <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                              <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase">Registered On</p>
                                <p className="text-sm text-foreground mt-0.5">{new Date(school.created).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                              <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase">Last Updated</p>
                                <p className="text-sm text-foreground mt-0.5">{new Date(school.updated).toLocaleDateString()}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="users" className="m-0 space-y-4 flex flex-col h-full">
                      <div className="flex items-center justify-between gap-4">
                        <UserSearchAndFilter
                          searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                          roleFilter={roleFilter} setRoleFilter={setRoleFilter}
                          statusFilter={statusFilter} setStatusFilter={setStatusFilter}
                          resultCount={filteredUsers.length}
                        />
                        <Button onClick={() => setCreateUserOpen(true)} className="shrink-0 shadow-sm">
                          <Plus className="w-4 h-4 mr-2" /> Create User
                        </Button>
                      </div>

                      <div className="flex-1 min-h-0 border rounded-md">
                        <UserListTable
                          users={filteredUsers}
                          loading={loading}
                          onEdit={(u) => { setSelectedUser(u); setEditUserOpen(true); }}
                          onDelete={(u) => { setDeletingItem({ type: 'User', item: u }); setDeleteDialogOpen(true); }}
                          onToggleStatus={handleUserStatusToggle}
                        />
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <CreateUserModal
        isOpen={createUserOpen}
        onClose={() => setCreateUserOpen(false)}
        schoolId={schoolId}
        onCreated={fetchData}
      />

      <EditUserModal
        isOpen={editUserOpen}
        onClose={() => { setEditUserOpen(false); setSelectedUser(null); }}
        user={selectedUser}
        onSaved={fetchData}
      />

      {deletingItem && (
        <DeleteConfirmationDialog
          isOpen={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          onConfirm={async () => {
            setDeleteDialogOpen(false);
            if (deletingItem.type === 'School') {
              // Delete school logic if needed, or close and notify parent
              try {
                await pb.collection('schools').delete(deletingItem.item.id, { $autoCancel: false });
                onClose();
                if (onSchoolUpdated) onSchoolUpdated();
              } catch (e) { }
            } else {
              await deleteUser(deletingItem.item.id);
              fetchData();
            }
          }}
          itemName={deletingItem.type === 'School' ? deletingItem.item.schoolName : deletingItem.item.name}
          itemType={deletingItem.type}
          childCount={deletingItem.type === 'School' ? users.length : 0}
        />
      )}
    </>
  );
};

export default SchoolDetailsModal;
