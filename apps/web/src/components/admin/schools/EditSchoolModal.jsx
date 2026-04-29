
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useSchoolManagementEnhanced } from '@/hooks/useSchoolManagementEnhanced.js';

const schoolSchema = z.object({
  schoolName: z.string().min(2, "School name is required"),
  schoolId: z.string().min(2, "School ID is required"),
  location: z.string().optional(),
  email: z.string().email("Invalid email format"),
  mobileNumber: z.string().optional(),
  principalName: z.string().optional(),
  isActive: z.boolean().default(true)
});

const EditSchoolModal = ({ isOpen, onClose, school, onSaved }) => {
  const { updateSchool } = useSchoolManagementEnhanced();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(schoolSchema),
    defaultValues: {
      schoolName: '',
      schoolId: '',
      location: '',
      email: '',
      mobileNumber: '',
      principalName: '',
      isActive: true
    }
  });

  useEffect(() => {
    if (isOpen && school) {
      form.reset({
        schoolName: school.schoolName || '',
        schoolId: school.schoolId || '',
        location: school.location || '',
        email: school.email || '',
        mobileNumber: school.mobileNumber || '',
        principalName: school.principalName || '',
        isActive: school.isActive !== false
      });
    }
  }, [isOpen, school, form]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      await updateSchool(school.id, data);
      onSaved && onSaved();
      onClose();
    } catch (error) {
      // Error handled in hook
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-poppins">Edit School</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="schoolName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Springfield High" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="schoolId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School Code/ID <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. SCH-001" {...field} />
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
                  <FormLabel>Contact Email <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="admin@school.edu" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="mobileNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 (555) 000-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="City, State" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="principalName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Principal / Head Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane Doe" {...field} />
                    </FormControl>
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
                        <SelectTrigger>
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

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !form.formState.isDirty}>
                {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditSchoolModal;
