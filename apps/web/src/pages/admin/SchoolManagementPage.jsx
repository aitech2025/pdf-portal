
import React, { useState, useEffect } from 'react';
import client from '@/lib/apiClient';
import { toast } from 'sonner';
import { Search, ShieldAlert, KeyRound, Eye, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';

const SchoolManagementPage = () => {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Deactivation state
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [deactivationReason, setDeactivationReason] = useState('');

  const fetchSchools = async () => {
    try {
      setLoading(true);
      const response = await client.fetch('/schools', 'GET', null, {
        page: 1,
        per_page: 100,
        sort: '-created'
      });
      setSchools(response.items || response);
    } catch (err) {
      toast.error('Failed to fetch schools');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const handleToggleStatus = async (school) => {
    if (school.isActive) {
      setSelectedSchool(school);
      setDeactivationReason('');
      setIsDeactivateOpen(true);
    } else {
      try {
        await client.fetch(`/schools/${school.id}`, 'PATCH', { isActive: true, deactivationMessage: '' });
        toast.success(`${school.schoolName} activated successfully.`);
        fetchSchools();
      } catch (err) {
        toast.error('Failed to activate school');
      }
    }
  };

  const confirmDeactivation = async () => {
    if (!selectedSchool) return;
    try {
      await client.fetch(`/schools/${selectedSchool.id}`, 'PATCH', {
        isActive: false,
        deactivationMessage: deactivationReason
      });
      toast.success(`${selectedSchool.schoolName} deactivated.`);
      setIsDeactivateOpen(false);
      fetchSchools();
    } catch (err) {
      toast.error('Failed to deactivate school');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('WARNING: Deleting a school will permanently remove it. Continue?')) {
      try {
        await client.fetch(`/schools/${id}`, 'DELETE');
        toast.success('School deleted');
        fetchSchools();
      } catch (err) {
        toast.error('Failed to delete school');
      }
    }
  };

  const handleResetPassword = async (school) => {
    const newPassword = prompt(`Enter new password for ${school.email}:`, 'NewPassword123!');
    if (!newPassword || newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    try {
      // Find the auth user linked to this school email
      const response = await client.fetch('/users', 'GET', null, { page: 1, per_page: 1, filter: `email="${school.email}"` });
      const users = response.items || response;
      if (users.length === 0) {
        toast.error("Linked user account not found.");
        return;
      }

      const userId = users[0].id;
      await client.fetch(`/users/${userId}`, 'PATCH', {
        password: newPassword,
        passwordConfirm: newPassword
      });

      // Also update reference in schools collection
      await client.fetch(`/schools/${school.id}`, 'PATCH', { password: newPassword });

      toast.success(`Password reset for ${school.email}. New password: ${newPassword}`);
    } catch (err) {
      toast.error('Failed to reset password. ' + err.message);
    }
  };

  const filteredSchools = schools.filter(s =>
    s.schoolName.toLowerCase().includes(search.toLowerCase()) ||
    (s.location && s.location.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">School Directory</h1>
          <p className="text-muted-foreground">Manage enrolled institutions and their access.</p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search schools or locations..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Dialog open={isDeactivateOpen} onOpenChange={setIsDeactivateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate School</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to deactivate <strong>{selectedSchool?.schoolName}</strong>? They will immediately lose access to the portal.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason (Optional)</label>
              <Textarea
                placeholder="E.g., Subscription expired..."
                value={deactivationReason}
                onChange={(e) => setDeactivationReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDeactivateOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDeactivation}>Deactivate</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="border rounded-xl bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Grades</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSchools.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No schools found.</TableCell>
                </TableRow>
              ) : (
                filteredSchools.map(school => (
                  <TableRow key={school.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">{school.schoolName}</div>
                      <div className="text-xs text-muted-foreground">{school.location}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{school.email}</div>
                      <div className="text-xs text-muted-foreground">{school.mobileNumber}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {school.grades?.map(g => (
                          <Badge key={g} variant="secondary" className="text-xs">{g}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {school.isActive ? (
                        <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-200">Active</Badge>
                      ) : (
                        <Badge variant="destructive" className="bg-red-500/10 text-red-700 hover:bg-red-500/20 border-red-200">Deactivated</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" title={school.isActive ? "Deactivate" : "Activate"} onClick={() => handleToggleStatus(school)}>
                          {school.isActive ? <XCircle className="w-4 h-4 text-muted-foreground hover:text-destructive" /> : <CheckCircle2 className="w-4 h-4 text-muted-foreground hover:text-green-600" />}
                        </Button>
                        <Button variant="ghost" size="icon" title="Reset Password" onClick={() => handleResetPassword(school)}>
                          <KeyRound className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(school.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default SchoolManagementPage;
