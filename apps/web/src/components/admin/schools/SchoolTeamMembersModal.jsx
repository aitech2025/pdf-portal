
import React, { useState, useEffect } from 'react';
import pb from '@/lib/apiClient.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Shield } from 'lucide-react';
import UserAvatar from '@/components/admin/users/UserAvatar.jsx';
import UserRoleBadge from '@/components/admin/users/UserRoleBadge.jsx';

const SchoolTeamMembersModal = ({ isOpen, onClose, school }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && school?.id) {
      setLoading(true);
      pb.collection('users').getList(1, 50, {
        filter: `schoolId = "${school.id}"`,
        sort: '-created',
        $autoCancel: false
      })
      .then(res => setMembers(res.items))
      .catch(err => console.error("Error fetching team", err))
      .finally(() => setLoading(false));
    }
  }, [isOpen, school]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl h-[70vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border/50 shrink-0 bg-muted/10">
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-xl font-poppins font-semibold">School Team</DialogTitle>
              <DialogDescription className="mt-1">
                Manage users associated with {school?.schoolName}
              </DialogDescription>
            </div>
            <Button size="sm" className="shadow-soft-sm">
              <Plus className="w-4 h-4 mr-2" /> Add Member
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden bg-background">
          <ScrollArea className="h-full">
            <div className="p-4">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 w-full rounded-md" />)}
                </div>
              ) : members.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Shield className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No team members</p>
                  <p className="text-xs text-muted-foreground">This school doesn't have any users yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-card sticky top-0 z-10 shadow-sm border-b border-border/50">
                    <TableRow className="hover:bg-transparent">
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <UserAvatar user={member} className="w-8 h-8" />
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{member.name || 'Unnamed'}</span>
                              <span className="text-xs text-muted-foreground">{member.email}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <UserRoleBadge role={member.role} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(member.created).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SchoolTeamMembersModal;
