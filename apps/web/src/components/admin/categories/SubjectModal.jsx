import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

const subjectSchema = z.object({
  subjectName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  subjectCode: z.string().max(20).optional().or(z.literal('')),
  description: z.string().max(500).optional().or(z.literal('')),
  isActive: z.boolean().default(true),
  displayOrder: z.coerce.number().int().min(0).optional().default(0)
});

const SubjectModal = ({ isOpen, onClose, onSave, subject = null }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!subject;

  const form = useForm({
    resolver: zodResolver(subjectSchema),
    defaultValues: { subjectName: '', subjectCode: '', description: '', isActive: true, displayOrder: 0 }
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(subject
        ? { subjectName: subject.subjectName || '', subjectCode: subject.subjectCode || '', description: subject.description || '', isActive: subject.isActive !== false, displayOrder: subject.displayOrder || 0 }
        : { subjectName: '', subjectCode: '', description: '', isActive: true, displayOrder: 0 }
      );
    }
  }, [isOpen, subject, form]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      await onSave(data);
      onClose();
    } catch {
      // toast handled upstream
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-poppins">{isEditing ? 'Edit Subject' : 'Add Subject'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField control={form.control} name="subjectName" render={({ field }) => (
              <FormItem>
                <FormLabel>Subject Name <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input placeholder="e.g. Mathematics, Science..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="subjectCode" render={({ field }) => (
              <FormItem>
                <FormLabel>Subject Code</FormLabel>
                <FormControl><Input placeholder="e.g. PHY, CHEM, MATH..." {...field} /></FormControl>
                <FormDescription className="text-[11px]">Optional unique code for this subject.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Textarea placeholder="Brief description..." className="resize-none h-16" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="displayOrder" render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Order</FormLabel>
                  <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                  <FormDescription className="text-[11px]">Lower = first</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="isActive" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-[var(--radius-md)] border border-border/50 p-3 bg-muted/20">
                <div>
                  <FormLabel className="text-sm">Active</FormLabel>
                  <FormDescription className="text-xs">Show this subject to school users</FormDescription>
                </div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
            )} />

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save Subject'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default SubjectModal;
