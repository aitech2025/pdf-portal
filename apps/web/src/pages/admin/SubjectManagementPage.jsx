import React, { useState, useEffect, useCallback } from 'react';
import pb from '@/lib/apiClient';
import { toast } from 'sonner';
import { Plus, Search, Edit2, Trash2, ToggleLeft, ToggleRight, Loader2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import PageTransition from '@/components/PageTransition.jsx';
import { cn } from '@/lib/utils';

const getToken = () => {
  try { return pb.authStore.token || localStorage.getItem('authToken') || ''; } catch { return ''; }
};

const apiFetch = async (url, options = {}) => {
  const token = getToken();
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) }
  });
  if (!res.ok) { const err = await res.json().catch(() => ({ detail: res.statusText })); throw new Error(err.detail || 'Request failed'); }
  return res.status === 204 ? null : res.json();
};

const subjectSchema = z.object({
  subjectName: z.string().min(1, 'Subject name is required').max(100),
  subjectCode: z.string().max(20).optional().or(z.literal('')),
  description: z.string().max(500).optional().or(z.literal('')),
  displayOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true)
});

const SubjectFormDialog = ({ open, onClose, onSave, subjectItem = null }) => {
  const [submitting, setSubmitting] = useState(false);
  const isEditing = !!subjectItem;

  const form = useForm({
    resolver: zodResolver(subjectSchema),
    defaultValues: { subjectName: '', subjectCode: '', description: '', displayOrder: 0, isActive: true }
  });

  useEffect(() => {
    if (open) {
      form.reset(subjectItem
        ? { subjectName: subjectItem.subjectName || '', subjectCode: subjectItem.subjectCode || '', description: subjectItem.description || '', displayOrder: subjectItem.displayOrder || 0, isActive: subjectItem.isActive !== false }
        : { subjectName: '', subjectCode: '', description: '', displayOrder: 0, isActive: true }
      );
    }
  }, [open, subjectItem, form]);

  const onSubmit = async (data) => {
    setSubmitting(true);
    try { await onSave(data); onClose(); }
    catch { /* handled upstream */ }
    finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-poppins">{isEditing ? 'Edit Subject' : 'Add New Subject'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField control={form.control} name="subjectName" render={({ field }) => (
              <FormItem>
                <FormLabel>Subject Name <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input placeholder="e.g. Mathematics, Physics, English..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="subjectCode" render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject Code</FormLabel>
                  <FormControl><Input placeholder="e.g. MATH, PHY..." {...field} /></FormControl>
                  <FormDescription className="text-[11px]">Optional short code</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="displayOrder" render={({ field }) => (
                <FormItem>
                  <FormLabel>Sort Order</FormLabel>
                  <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                  <FormDescription className="text-[11px]">Lower = first</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Textarea placeholder="Optional description..." className="resize-none h-16" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="isActive" render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border border-border/50 p-3 bg-muted/20">
                <div>
                  <FormLabel className="text-sm font-medium">Active</FormLabel>
                  <FormDescription className="text-xs">Active subjects can be assigned to programs</FormDescription>
                </div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
            )} />

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save Subject'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

const SubjectManagementPage = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [deletingSubject, setDeletingSubject] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/masterSubjects');
      setSubjects(res?.items ?? []);
    } catch {
      toast.error('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSubjects(); }, [fetchSubjects]);

  const handleSave = async (data) => {
    try {
      if (editingSubject) {
        const updated = await apiFetch(`/api/masterSubjects/${editingSubject.id}`, { method: 'PATCH', body: JSON.stringify(data) });
        setSubjects(prev => prev.map(s => s.id === editingSubject.id ? updated : s));
        toast.success('Subject updated');
      } else {
        const created = await apiFetch('/api/masterSubjects', { method: 'POST', body: JSON.stringify(data) });
        setSubjects(prev => [...prev, created].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0) || a.subjectName.localeCompare(b.subjectName)));
        toast.success('Subject created');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save subject');
      throw err;
    }
  };

  const handleToggleActive = async (subj) => {
    try {
      const updated = await apiFetch(`/api/masterSubjects/${subj.id}`, { method: 'PATCH', body: JSON.stringify({ isActive: !subj.isActive }) });
      setSubjects(prev => prev.map(s => s.id === subj.id ? updated : s));
      toast.success(`Subject ${!subj.isActive ? 'activated' : 'deactivated'}`);
    } catch (err) {
      toast.error(err.message || 'Failed to update subject');
    }
  };

  const handleDelete = async () => {
    if (!deletingSubject) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/masterSubjects/${deletingSubject.id}`, { method: 'DELETE' });
      setSubjects(prev => prev.filter(s => s.id !== deletingSubject.id));
      toast.success('Subject deleted');
      setDeletingSubject(null);
    } catch (err) {
      toast.error(err.message || 'Failed to delete subject');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = subjects.filter(s => {
    const matchSearch = !search || s.subjectName?.toLowerCase().includes(search.toLowerCase()) || s.subjectCode?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' ? true : statusFilter === 'active' ? s.isActive !== false : s.isActive === false;
    return matchSearch && matchStatus;
  });

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-poppins font-bold text-foreground flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              Subject Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create and manage global subjects (e.g. Mathematics, Physics, English). These are assigned to programs via classes.
            </p>
          </div>
          <Button onClick={() => { setEditingSubject(null); setFormOpen(true); }} className="shrink-0">
            <Plus className="w-4 h-4 mr-2" /> Add Subject
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input placeholder="Search subjects..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-1.5">
            {['all', 'active', 'inactive'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors",
                  statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >{s}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border/50 rounded-xl">
            <BookOpen className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="font-semibold text-foreground">
              {subjects.length === 0 ? 'No subjects yet' : 'No subjects match your filters'}
            </p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {subjects.length === 0 ? 'Create your first subject to get started.' : 'Try a different search or filter.'}
            </p>
            {subjects.length === 0 && (
              <Button size="sm" onClick={() => { setEditingSubject(null); setFormOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" /> Add Subject
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(subj => (
              <Card key={subj.id} className={cn("border-border/50 transition-all", subj.isActive === false && "opacity-60")}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <Badge variant={subj.isActive !== false ? 'default' : 'secondary'} className="text-xs">
                      {subj.isActive !== false ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-foreground text-sm mb-0.5">{subj.subjectName}</h3>
                  {subj.subjectCode && <p className="text-xs text-muted-foreground mb-1 font-mono">{subj.subjectCode}</p>}
                  {subj.description && <p className="text-xs text-muted-foreground line-clamp-2">{subj.description}</p>}
                  <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/50">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs flex-1" onClick={() => { setEditingSubject(subj); setFormOpen(true); }}>
                      <Edit2 className="w-3 h-3 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      className={cn("h-7 px-2 text-xs", subj.isActive !== false ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50")}
                      onClick={() => handleToggleActive(subj)}
                    >
                      {subj.isActive !== false ? <ToggleLeft className="w-3 h-3" /> : <ToggleRight className="w-3 h-3" />}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeletingSubject(subj)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <SubjectFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingSubject(null); }}
        onSave={handleSave}
        subjectItem={editingSubject}
      />

      <AlertDialog open={!!deletingSubject} onOpenChange={(o) => !o && setDeletingSubject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subject</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingSubject?.subjectName}</strong>?
              This cannot be undone. If this subject is assigned to any program, deletion will be blocked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageTransition>
  );
};

export default SubjectManagementPage;
