
import React, { useState } from 'react';
import pb from '@/lib/apiClient';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

const AdminOnboardingForm = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    schoolName: '', address: '', location: '', email: '', mobileNumber: '',
    pointOfContactName: '', pointOfContactMobile: '', grades: []
  });

  const handleGradeChange = (grade) => {
    setFormData(prev => ({
      ...prev,
      grades: prev.grades.includes(grade) 
        ? prev.grades.filter(g => g !== grade)
        : [...prev.grades, grade]
    }));
  };

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({length: 8}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const schoolId = 'SCH-' + Date.now().toString().slice(-6) + Math.floor(1000 + Math.random() * 9000);
      const password = generatePassword();

      await pb.collection('schools').create({
        ...formData,
        schoolId,
        password,
        isActive: true
      }, { $autoCancel: false });

      toast.success(`School Created! ID: ${schoolId} | Pass: ${password}`, { duration: 10000 });
      setFormData({ schoolName: '', address: '', location: '', email: '', mobileNumber: '', pointOfContactName: '', pointOfContactMobile: '', grades: [] });
    } catch (err) {
      toast.error('Failed to create school');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Manual School Onboarding</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>School Name *</Label>
                <Input required value={formData.schoolName} onChange={e => setFormData({...formData, schoolName: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Email Address *</Label>
                <Input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Location *</Label>
                <Input required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Mobile Number *</Label>
                <Input required value={formData.mobileNumber} onChange={e => setFormData({...formData, mobileNumber: e.target.value})} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Full Address</Label>
                <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Grades</Label>
              <div className="flex gap-6">
                {['1-5', '6-10', '1-10'].map(grade => (
                  <div key={grade} className="flex items-center space-x-2">
                    <Checkbox id={`grade-${grade}`} checked={formData.grades.includes(grade)} onCheckedChange={() => handleGradeChange(grade)} />
                    <Label htmlFor={`grade-${grade}`} className="font-normal">{grade}</Label>
                  </div>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating...' : 'Create School'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOnboardingForm;
