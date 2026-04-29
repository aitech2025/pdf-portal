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
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Building, Info } from 'lucide-react';

const formSchema = z.object({
  schoolName: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email address'),
  pointOfContactName: z.string().min(2, 'Principal name is required'),
  mobileNumber: z.string().optional(),
  address: z.string().optional(),
  location: z.string().optional(),
  isActive: z.boolean().default(true),
  sendEmail: z.boolean().default(true),
});

const CreateSchoolDialog = ({ isOpen, onClose, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdSchoolId, setCreatedSchoolId] = useState(null);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      schoolName: '', email: '', pointOfContactName: '',
      mobileNumber: '', address: '', location: '',
      isActive: true, sendEmail: true,
    },
  });

  const onSubmit = async (values) => {
    setIsSubmitting(true);
    try {
      const record = await pb.collection('schools').create({
        schoolName: values.schoolName,
        email: values.email,
        pointOfContactName: values.pointOfContactName,
        mobileNumber: values.mobileNumber,
        address: values.address,
        location: values.location,
        isActive: values.isActive,
        sendEmail: values.sendEmail,
      });

      setCreatedSchoolId(record.schoolId);
      toast.success(`School created — ID: ${record.schoolId}`);
      if (record.generatedPassword) {
        toast.info(`Login password: ${record.generatedPassword}`, { duration: 10000 });
      }
      form.reset();
      onSuccess(record);
      onClose();
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to create school');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isSubmitting) { form.reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border/50 bg-muted/10">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
            <Building className="w-5 h-5 text-primary" />
          </div>
          <DialogTitle className="text-xl font-poppins">Register New School</DialogTitle>
          <DialogDescription>Add a new institution. School ID is auto-generated.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] p-6">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-5 text-sm text-blue-700 dark:text-blue-300">
            <Info className="w-4 h-4 shrink-0" />
            School ID is automatically generated and cannot be changed after creation.
          </div>

          <Form {...form}>
            <form id="create-school-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="schoolName" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>School Name</FormLabel>
                    <FormControl><Input placeholder="e.g. Lincoln High School" className="bg-background" {...field} disabled={isSubmitting} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin Email</FormLabel>
                    <FormControl><Input type="email" placeholder="admin@school.edu" className="bg-background" {...field} disabled={isSubmitting} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="pointOfContactName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Principal Name</FormLabel>
                    <FormControl><Input placeholder="Dr. Sarah Connor" className="bg-background" {...field} disabled={isSubmitting} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="mobileNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Phone</FormLabel>
                    <FormControl><Input placeholder="+1 (555) 000-0000" className="bg-background" {...field} disabled={isSubmitting} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="location" render={({ field }) => (
                  <FormItem>
                    <FormLabel>City & State</FormLabel>
                    <FormControl><Input placeholder="Seattle, WA" className="bg-background" {...field} disabled={isSubmitting} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Full Address</FormLabel>
                    <FormControl><Input placeholder="123 Education Blvd" className="bg-background" {...field} disabled={isSubmitting} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="space-y-3 pt-2 border-t border-border/50">
                <FormField control={form.control} name="isActive" render={({ field }) => (
                  <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border border-border/50 p-3 bg-card">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting} /></FormControl>
                    <div className="space-y-0.5 leading-none">
                      <FormLabel className="cursor-pointer">Active on creation</FormLabel>
                      <p className="text-xs text-muted-foreground">School will be immediately accessible</p>
                    </div>
                  </FormItem>
                )} />
                <FormField control={form.control} name="sendEmail" render={({ field }) => (
                  <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border border-border/50 p-3 bg-card">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting} /></FormControl>
                    <div className="space-y-0.5 leading-none">
                      <FormLabel className="cursor-pointer">Send welcome email & WhatsApp</FormLabel>
                      <p className="text-xs text-muted-foreground">Sends login credentials to the school admin</p>
                    </div>
                  </FormItem>
                )} />
              </div>
            </form>
          </Form>
        </ScrollArea>

        <DialogFooter className="p-4 border-t border-border/50 bg-muted/10">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="bg-background">Cancel</Button>
          <Button type="submit" form="create-school-form" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Register School'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateSchoolDialog;
