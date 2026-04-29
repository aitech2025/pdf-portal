
import React, { useState, useEffect } from 'react';
import pb from '@/lib/apiClient';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useNotifications } from '@/hooks/useNotifications';

const OnboardingRequestsPage = () => {
  const { notifyOnboardingApproval, notifyOnboardingRejection } = useNotifications();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejectOpen, setIsRejectOpen] = useState(false);

  const fetchRequests = async () => {
    try {
      const res = await pb.collection('onboardingRequests').getList(1, 100, { sort: '-submittedAt', $autoCancel: false });
      setRequests(res.items);
    } catch (err) {
      toast.error('Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleApprove = async (req) => {
    if (!window.confirm(`Approve ${req.schoolName}?`)) return;
    try {
      const schoolId = 'SCH-' + Date.now().toString().slice(-6) + Math.floor(1000 + Math.random() * 9000);
      const password = Math.random().toString(36).slice(-8);

      await pb.collection('schools').create({
        schoolName: req.schoolName, email: req.email, location: req.location,
        mobileNumber: req.mobileNumber, address: req.address, grades: req.grades,
        schoolId, password, isActive: true
      }, { $autoCancel: false });

      await pb.collection('onboardingRequests').update(req.id, { status: 'approved', approvedAt: new Date().toISOString() }, { $autoCancel: false });
      
      // Notify (assuming we have a way to link to a user, or just send email via hook)
      // The hook will trigger email automatically if set up in PB, but we also create notification record
      toast.success(`Approved! ID: ${schoolId}, Pass: ${password}`);
      fetchRequests();
    } catch (err) {
      toast.error('Approval failed');
    }
  };

  const handleReject = async () => {
    try {
      await pb.collection('onboardingRequests').update(selectedReq.id, { status: 'rejected', rejectionReason: rejectReason }, { $autoCancel: false });
      toast.success('Request rejected');
      setIsRejectOpen(false);
      fetchRequests();
    } catch (err) {
      toast.error('Rejection failed');
    }
  };

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Onboarding Requests</h1>
      
      <div className="border rounded-xl bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>School</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map(req => (
              <TableRow key={req.id}>
                <TableCell>
                  <div className="font-medium">{req.schoolName}</div>
                  <div className="text-xs text-muted-foreground">{req.location}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{req.email}</div>
                  <div className="text-xs text-muted-foreground">{req.mobileNumber}</div>
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
                      <Button size="sm" variant="destructive" onClick={() => { setSelectedReq(req); setIsRejectOpen(true); }}>Reject</Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Request</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <Textarea placeholder="Reason for rejection..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
            <Button variant="destructive" className="w-full" onClick={handleReject}>Confirm Rejection</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OnboardingRequestsPage;
