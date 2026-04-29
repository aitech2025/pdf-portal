
import React, { useState, useEffect } from 'react';
import pb from '@/lib/apiClient';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const AdminUserRequestsPage = () => {
  const [requests, setRequests] = useState([]);

  const fetchRequests = async () => {
    try {
      const res = await pb.collection('userRequests').getList(1, 100, { expand: 'schoolId', sort: '-created', $autoCancel: false });
      setRequests(res.items);
    } catch (err) {
      toast.error('Failed to fetch requests');
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleApprove = async (req) => {
    try {
      const password = Math.random().toString(36).slice(-8);
      await pb.collection('users').create({
        email: req.requestedUserEmail,
        password,
        passwordConfirm: password,
        name: req.requestedUserName,
        role: req.role || 'teacher',
        schoolId: req.schoolId
      }, { $autoCancel: false });

      await pb.collection('userRequests').update(req.id, { status: 'approved' }, { $autoCancel: false });
      toast.success(`User created! Password: ${password}`);
      fetchRequests();
    } catch (err) {
      toast.error('Approval failed');
    }
  };

  const handleReject = async (req) => {
    try {
      await pb.collection('userRequests').update(req.id, { status: 'rejected' }, { $autoCancel: false });
      toast.success('Request rejected');
      fetchRequests();
    } catch (err) {
      toast.error('Rejection failed');
    }
  };

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">User Requests</h1>
      <div className="border rounded-xl bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>School</TableHead>
              <TableHead>Requested User</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map(req => (
              <TableRow key={req.id}>
                <TableCell>{req.expand?.schoolId?.schoolName || 'Unknown'}</TableCell>
                <TableCell>
                  <div className="font-medium">{req.requestedUserName}</div>
                  <div className="text-xs text-muted-foreground">{req.requestedUserEmail}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={req.status === 'approved' ? 'default' : req.status === 'rejected' ? 'destructive' : 'secondary'}>
                    {req.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {req.status === 'pending' && (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" onClick={() => handleApprove(req)}>Approve</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleReject(req)}>Reject</Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminUserRequestsPage;
