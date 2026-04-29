import React, { useState, useEffect } from 'react';
import pb from '@/lib/apiClient';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, Shield, UserPlus, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import PageTransition from '@/components/PageTransition.jsx';
import { Skeleton } from '@/components/ui/skeleton';
import ConfirmationModal from '@/components/ConfirmationModal.jsx';

const TeamManagementPage = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await pb.collection('users').getList(1, 100, {
        filter: `role="admin" || role="teacher" || role="moderator"`,
        sort: '-created',
        $autoCancel: false,
      });
      setMembers(res.items);
    } catch (err) {
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMembers(); }, []);

  const openEdit = (member) => {
    setEditMember(member);
    setEditName(member.name || '');
    setEditEmail(member.email || '');
    setEditMobile(member.mobile_number || member.mobileNumber || '');
    setEditRole(member.role || 'teacher');
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editMember) return;
    setEditSaving(true);
    try {
      await pb.collection('users').update(editMember.id, {
        name: editName,
        email: editEmail,
        mobile_number: editMobile,
        role: editRole,
      });
      toast.success('Team member updated');
      setEditModalOpen(false);
      fetchMembers();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update member');
    } finally {
      setEditSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!memberToDelete) return;
    try {
      await pb.collection('users').delete(memberToDelete);
      toast.success('Team member removed');
      fetchMembers();
    } catch (err) {
      toast.error('Failed to remove team member');
    }
  };

  const filtered = members.filter(m =>
    (m.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageTransition>
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-poppins font-bold text-foreground">Team Management</h1>
          <p className="text-muted-foreground mt-1">Manage administrators, teachers, and system access.</p>
        </div>
        <Button variant="default" className="shadow-soft-md">
          <UserPlus className="w-4 h-4 mr-2" /> Invite Member
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search team members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card shadow-soft-sm"
          />
        </div>
      </div>

      <Card className="shadow-soft-md border-border/50 bg-card overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-md" />)}
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-40 text-center">
                      <Shield className="w-10 h-10 mx-auto text-muted-foreground opacity-30 mb-2" />
                      <p className="text-muted-foreground">No team members found.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(member => (
                    <TableRow key={member.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0 font-bold text-primary text-sm">
                            {(member.name || member.email || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground text-sm">{member.name || 'Unnamed'}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                            {(member.mobile_number || member.mobileNumber) && (
                              <p className="text-xs text-muted-foreground">{member.mobile_number || member.mobileNumber}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.isActive !== false ? 'success' : 'destructive'}>
                          {member.isActive !== false ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(member.created).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            onClick={() => openEdit(member)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => { setMemberToDelete(member.id); setDeleteModalOpen(true); }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={(o) => !editSaving && setEditModalOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Email address" />
            </div>
            <div className="space-y-2">
              <Label>Mobile Number</Label>
              <Input value={editMobile} onChange={(e) => setEditMobile(e.target.value)} placeholder="+1 (555) 000-0000" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)} disabled={editSaving}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={editSaving}>
              {editSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Remove Team Member"
        description="Are you sure you want to remove this user? They will lose access immediately."
        confirmText="Remove"
        isDestructive={true}
      />
    </PageTransition>
  );
};

export default TeamManagementPage;
