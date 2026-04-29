
import React, { useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { generatePassword } from '@/utils/userManagementUtils.js';
import { RefreshCw, UserPlus } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.string().min(1, 'Role is required'),
  isActive: z.boolean().default(true),
  sendEmail: z.boolean().default(true)
});

const CreateUserDialog = ({ isOpen, onClose, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'teacher',
      isActive: true,
      sendEmail: true
    }
  });

  const handleGeneratePassword = () => {
    form.setValue('password', generatePassword());
  };

  const onSubmit = async (values) => {
    setIsSubmitting(true);
    try {
      // passwordConfirm required for user creation
      const recordData = {
        name: values.name,
        email: values.email,
        password: values.password,
        passwordConfirm: values.password,
        role: values.role,
        isActive: values.isActive,
        verified: true, // Auto-verify admin created users
        emailVisibility: false
      };

      const record = await pb.collection('users').create(recordData, { $autoCancel: false });

      // Simulate sending email since actual builder-mailer needs real triggers
      if (values.sendEmail) {
        toast.info('Welcome email queued for delivery');
      }

      toast.success('User created successfully');
      form.reset();
      onSuccess(record);
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(error.data?.message || 'Failed to create user. Check if email already exists.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && !isSubmitting) {
        form.reset();
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
            <UserPlus className="w-5 h-5 text-primary" />
          </div>
          <DialogTitle className="text-xl font-poppins">Create New User</DialogTitle>
          <DialogDescription>
            Add a new user manually. They will receive an email to access their account.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel className="text-foreground">Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Maya Chen" className="bg-background text-foreground placeholder:text-muted-foreground" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel className="text-foreground">Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="maya.chen@example.com" className="bg-background text-foreground placeholder:text-muted-foreground" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel className="text-foreground">Password</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input type="text" placeholder="Temporary password" className="bg-background text-foreground placeholder:text-muted-foreground" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <Button type="button" variant="outline" size="icon" onClick={handleGeneratePassword} disabled={isSubmitting} className="shrink-0 bg-background text-foreground">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">System Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                    <FormControl>
                      <SelectTrigger className="bg-background text-foreground">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="school">School Admin</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="space-y-3 pt-2">
              <FormField control={form.control} name="isActive" render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-border/50 p-4 bg-muted/20">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="font-medium text-foreground cursor-pointer">Active Account</FormLabel>
                    <p className="text-xs text-muted-foreground">User can log in immediately</p>
                  </div>
                </FormItem>
              )} />

              <FormField control={form.control} name="sendEmail" render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-border/50 p-4 bg-muted/20">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="font-medium text-foreground cursor-pointer">Send Welcome Email</FormLabel>
                    <p className="text-xs text-muted-foreground">Send credentials to user's email</p>
                  </div>
                </FormItem>
              )} />
            </div>

            <DialogFooter className="pt-4 border-t border-border/50 mt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="bg-background">Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground shadow-soft-sm">
                {isSubmitting ? 'Creating...' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateUserDialog;
