
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Copy, Check, KeyRound } from 'lucide-react';
import { useSchoolUserManagement } from '@/hooks/useSchoolUserManagement.js';

const userSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Invalid email format"),
  role: z.enum(["teacher", "student", "admin", "school", "guest"], { required_error: "Role is required" }),
  isActive: z.boolean().default(true),
  password: z.string().optional()
});

const CreateUserModal = ({ isOpen, onClose, schoolId, onCreated }) => {
  const { createUser, generateSecurePassword } = useSchoolUserManagement();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [copied, setCopied] = useState(false);

  const form = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      role: 'teacher',
      isActive: true,
      password: ''
    }
  });

  const handleGeneratePassword = () => {
    form.setValue('password', generateSecurePassword());
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const result = await createUser(data, schoolId);
      setCreatedCredentials({ email: data.email, password: result.password });
      onCreated && onCreated();
    } catch (error) {
      // Error handled in hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (createdCredentials) {
      navigator.clipboard.writeText(`Email: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    form.reset();
    setCreatedCredentials(null);
    onClose();
  };

  if (createdCredentials) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-poppins text-success">User Created Successfully</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">Please save these credentials securely. The password will not be shown again.</p>
            <div className="bg-muted/50 p-4 rounded-[var(--radius-md)] border border-border/50 space-y-3 relative">
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</span>
                <p className="font-mono text-sm text-foreground">{createdCredentials.email}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Password</span>
                <p className="font-mono text-sm text-foreground">{createdCredentials.password}</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-2 right-2 h-8 w-8" 
                onClick={handleCopy}
              >
                {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleClose} className="w-full">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && handleClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-poppins">Create New User</DialogTitle>
          <DialogDescription>Add a new user and assign them to this school.</DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} className="text-foreground" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} className="text-foreground" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john@school.edu" {...field} className="text-foreground" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="text-foreground">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="school">School Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={(val) => field.onChange(val === 'true')} value={field.value ? 'true' : 'false'}>
                      <FormControl>
                        <SelectTrigger className="text-foreground">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="true">Active</SelectItem>
                        <SelectItem value="false">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password (Optional)</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input type="text" placeholder="Leave blank to auto-generate" {...field} className="font-mono text-foreground" />
                    </FormControl>
                    <Button type="button" variant="outline" onClick={handleGeneratePassword} title="Generate Secure Password" size="icon" className="shrink-0">
                      <KeyRound className="w-4 h-4" />
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateUserModal;
