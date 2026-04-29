
import React, { useState, useEffect } from 'react';
import pb from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const UserRequestsPage = () => {
  const { currentUser } = useAuth();
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    const fetchRequests = async () => {
      if (!currentUser?.schoolId) return;
      try {
        const res = await pb.collection('userRequests').getList(1, 100, {
          filter: `schoolId="${currentUser.schoolId}"`,
          sort: '-created',
          $autoCancel: false
        });
        setRequests(res.items);
      } catch (err) {
        console.error(err);
      }
    };
    fetchRequests();
  }, [currentUser]);

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My User Requests</h1>
        <Link to="/school/user-requests/new">
          <Button>New Request</Button>
        </Link>
      </div>
      
      <div className="border rounded-xl bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center py-8">No requests found.</TableCell></TableRow>
            ) : (
              requests.map(req => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium">{req.requestedUserName}</TableCell>
                  <TableCell>{req.requestedUserEmail}</TableCell>
                  <TableCell>
                    <Badge variant={req.status === 'approved' ? 'default' : req.status === 'rejected' ? 'destructive' : 'secondary'}>
                      {req.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default UserRequestsPage;
