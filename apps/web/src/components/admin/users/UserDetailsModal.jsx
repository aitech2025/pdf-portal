
import React, { useState, useEffect } from 'react';
import pb from '@/lib/apiClient.js';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UserAvatar from './UserAvatar.jsx';
import { Calendar, Mail, Phone, Shield, ShieldCheck } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  role: z.string().min(1, 'Role is required'),
  isActive: z.boolean().default(true),
  schoolId: z.string().optional(),
});

const UserDetailsModal = ({ isOpen, onClose, user, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schools, setSchools] = useState([]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      role: '',
      isActive: true,
      schoolId: ''
    }
  });

  useEffect(() => {
    if (isOpen) {
      pb.collection('schools').getFullList({ sort: 'schoolName', $autoCancel: false })
        .then(res => setSchools(res))
        .catch(console.error);
    }
  }, [isOpen]);

  useEffect(() => {
    if (user && isOpen) {
      form.reset({
        name: user.name || '',
        role: user.role || 'teacher',
        isActive: user.isActive,
        schoolId: user.schoolId || 'none'
      });
    }
  }, [user, form, isOpen]);

  const onSubmit = async (values) => {
    setIsSubmitting(true);
    try {
      const data = {
        name: values.name,
        role: values.role,
        isActive: values.isActive,
        schoolId: values.schoolId === 'none' ? '' : values.schoolId
      };
      
      const record = await pb.collection('users').update(user.id, data, { $autoCancel: false });
      toast.success('User updated successfully');
      onSuccess(record);
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Failed to update user details');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && !isSubmitting) onClose();
    }}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 bg-muted/20 border-b border-border/50">
          <div className="flex items-center gap-4">
            <UserAvatar user={user} className="w-16 h-16 text-xl shadow-soft-sm" />
            <div>
              <DialogTitle className="text-2xl font-poppins">{user.displayName}</DialogTitle>
              <DialogDescription className="flex items-center gap-1.5 mt-1">
                <Mail className="w-3.5 h-3.5" /> {user.email}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b border-border/50 bg-background px-6 h-12">
            <TabsTrigger value="details" className="data-[state=active]:border-primary data-[state=active]:text-primary rounded-none border-b-2 border-transparent px-4">Profile Details</TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:border-primary data-[state=active]:text-primary rounded-none border-b-2 border-transparent px-4">Security</TabsTrigger>
          </TabsList>

          <ScrollArea className="max-h-[60vh]">
            <TabsContent value="details" className="p-6 m-0 border-none outline-none">
              <Form {...form}>
                <form id="edit-user-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <div className="grid grid-cols-2 gap-5">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel className="text-foreground">Full Name</FormLabel>
                        <FormControl>
                          <Input className="bg-background text-foreground placeholder:text-muted-foreground" {...field} disabled={isSubmitting} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="role" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                          <FormControl>
                            <SelectTrigger className="bg-background text-foreground">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="school">School</SelectItem>
                            <SelectItem value="teacher">Teacher</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="schoolId" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">School Assignment</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || 'none'} disabled={isSubmitting}>
                          <FormControl>
                            <SelectTrigger className="bg-background text-foreground">
                              <SelectValue placeholder="Select school" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No School Assigned</SelectItem>
                            {schools.map(school => (
                              <SelectItem key={school.id} value={school.id}>{school.schoolName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    
                    <FormField control={form.control} name="isActive" render={({ field }) => (
                      <FormItem className="col-span-2 mt-2">
                        <FormLabel className="text-foreground">Account Status</FormLabel>
                        <Select onValueChange={(val) => field.onChange(val === 'true')} value={field.value ? 'true' : 'false'} disabled={isSubmitting}>
                          <FormControl>
                            <SelectTrigger className="bg-background text-foreground">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="true">Active (Can log in)</SelectItem>
                            <SelectItem value="false">Inactive (Cannot log in)</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                  </div>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="security" className="p-6 m-0 border-none outline-none space-y-6">
              <div className="grid gap-4">
                <div className="flex items-center justify-between p-4 border border-border/50 rounded-lg bg-card">
                  <div className="flex gap-3">
                    <div className="bg-muted p-2 rounded-md h-10 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-foreground">Email Verification</p>
                      <p className="text-xs text-muted-foreground">{user.verified ? 'Email has been verified' : 'Email pending verification'}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="bg-background" disabled={user.verified || isSubmitting}>
                    {user.verified ? 'Verified' : 'Resend Link'}
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-4 border border-border/50 rounded-lg bg-card">
                  <div className="flex gap-3">
                    <div className="bg-muted p-2 rounded-md h-10 flex items-center justify-center shrink-0">
                      <Shield className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-foreground">Two-Factor Auth</p>
                      <p className="text-xs text-muted-foreground">{user.twoFactorEnabled ? 'Enabled' : 'Disabled'}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="bg-background">Manage</Button>
                </div>

                <div className="border-t border-border/50 pt-4 mt-2">
                  <h4 className="text-sm font-semibold mb-3">Login History</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2"><Calendar className="w-4 h-4" /> Created</span>
                      <span className="font-medium">{new Date(user.created).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2"><Calendar className="w-4 h-4" /> Last Login</span>
                      <span className="font-medium">{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="p-4 border-t border-border/50 bg-muted/10">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="bg-background">Cancel</Button>
          <Button type="submit" form="edit-user-form" disabled={isSubmitting} className="bg-primary text-primary-foreground shadow-soft-sm">
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserDetailsModal;
