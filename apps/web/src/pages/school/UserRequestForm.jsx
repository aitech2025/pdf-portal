
import React, { useState } from 'react';
import pb from '@/lib/apiClient';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const UserRequestForm = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ requestedUserName: '', requestedUserEmail: '', requestedUserMobile: '', role: 'teacher' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await pb.collection('userRequests').create({
        ...formData,
        schoolId: currentUser.schoolId,
        status: 'pending'
      }, { $autoCancel: false });
      
      toast.success('User request submitted. You will receive an update soon.');
      setFormData({ requestedUserName: '', requestedUserEmail: '', requestedUserMobile: '', role: 'teacher' });
    } catch (err) {
      toast.error('Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Request Additional User</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>User Name *</Label>
              <Input required value={formData.requestedUserName} onChange={e => setFormData({...formData, requestedUserName: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" required value={formData.requestedUserEmail} onChange={e => setFormData({...formData, requestedUserEmail: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Mobile Number</Label>
              <Input value={formData.requestedUserMobile} onChange={e => setFormData({...formData, requestedUserMobile: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>Submit Request</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserRequestForm;
