import React, { useState, useEffect, useCallback } from 'react';
import pb from '@/lib/apiClient';
import { toast } from 'sonner';
import {
  Plus, Search, Edit2, Trash2, ToggleLeft, ToggleRight, Loader2, GraduationCap,
  LayoutList, LayoutGrid
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

const classSchema = z.object({
  className: z.string().min(1, 'Class name is required').max(100),
  classCode: z.string().max(20).optional().or(z.literal('')),
  description: z.string().max(500).optional().or(z.literal('')),
  displayOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true)
});

const ClassFormDialog = ({ open, onClose, onSave, classItem = null }) => {
  const [submitting, setSubmitting] = useState(false);
  const isEditing = !!classItem;

  const form = useForm({
    resolver: zodResolver(classSchema),
    defaultValues: { className: '', classCode: '', description: '', displayOrder: 0, isActive: true }
  });

  useEffect(() => {
    if (open) {
      form.reset(classItem
        ? { className: classItem.className || '', classCode: classItem.classCode || '', description: classItem.description || '', displayOrder: classItem.displayOrder || 0, isActive: classItem.isActive !== false }
        : { className: '', classCode: '', description: '', displayOrder: 0, isActive: true }
      );
    }
  }, [open, classItem, form]);

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
          <DialogTitle className="font-poppins">{isEditing ? 'Edit Class' : 'Add New Class'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField control={form.control} name="className" render={({ field }) => (
              <FormItem>
                <FormLabel>Class Name <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input placeholder="e.g. Class 1, Class 10, Intermediate 1..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="classCode" render={({ field }) => (
                <FormItem>
                  <FormLabel>Class Code</FormLabel>
                  <FormControl><Input placeholder="e.g. CLS1, INT1..." {...field} /></FormControl>
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
                  <FormDescription className="text-xs">Active classes can be assigned to programs</FormDescription>
                </div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
            )} />

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save Class'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

const ClassManagementPage = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const [formOpen, setFormOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [deletingClass, setDeletingClass] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchClasses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/masterClasses');
      setClasses(res?.items ?? []);
    } catch (err) {
      toast.error('Failed to load classes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClasses(); }, [fetchClasses]);

  const handleSave = async (data) => {
    try {
      if (editingClass) {
        const updated = await apiFetch(`/api/masterClasses/${editingClass.id}`, { method: 'PATCH', body: JSON.stringify(data) });
        setClasses(prev => prev.map(c => c.id === editingClass.id ? updated : c));
        toast.success('Class updated');
      } else {
        const created = await apiFetch('/api/masterClasses', { method: 'POST', body: JSON.stringify(data) });
        setClasses(prev => [...prev, created].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0) || a.className.localeCompare(b.className)));
        toast.success('Class created');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save class');
      throw err;
    }
  };

  const handleToggleActive = async (cls) => {
    try {
      const updated = await apiFetch(`/api/masterClasses/${cls.id}`, { method: 'PATCH', body: JSON.stringify({ isActive: !cls.isActive }) });
      setClasses(prev => prev.map(c => c.id === cls.id ? updated : c));
      toast.success(`Class ${!cls.isActive ? 'activated' : 'deactivated'}`);
    } catch (err) {
      toast.error(err.message || 'Failed to update class');
    }
  };

  const handleDelete = async () => {
    if (!deletingClass) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/masterClasses/${deletingClass.id}`, { method: 'DELETE' });
      setClasses(prev => prev.filter(c => c.id !== deletingClass.id));
      toast.success('Class deleted');
      setDeletingClass(null);
    } catch (err) {
      toast.error(err.message || 'Failed to delete class');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = classes.filter(c => {
    const matchSearch = !search || c.className?.toLowerCase().includes(search.toLowerCase()) || c.classCode?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' ? true : statusFilter === 'active' ? c.isActive !== false : c.isActive === false;
    return matchSearch && matchStatus;
  });

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-poppins font-bold text-foreground flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-primary" />
              </div>
              Class Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create and manage global classes (e.g. Class 1, Class 10, Intermediate 1). These are assigned to programs.
            </p>
          </div>
          <Button onClick={() => { setEditingClass(null); setFormOpen(true); }} className="shrink-0">
            <Plus className="w-4 h-4 mr-2" /> Add Class
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input placeholder="Search classes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-1.5 items-center">
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
            <div className="ml-2 flex items-center gap-0.5 border border-border/50 rounded-md p-0.5 bg-muted/30">
              <button
                onClick={() => setViewMode('list')}
                title="List view"
                className={cn("p-1.5 rounded transition-colors", viewMode === 'list' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                title="Grid view"
                className={cn("p-1.5 rounded transition-colors", viewMode === 'grid' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          viewMode === 'list' ? (
            <div className="border rounded-xl overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-none border-b" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
            </div>
          )
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border/50 rounded-xl">
            <GraduationCap className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="font-semibold text-foreground">
              {classes.length === 0 ? 'No classes yet' : 'No classes match your filters'}
            </p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {classes.length === 0 ? 'Create your first class to get started.' : 'Try a different search or filter.'}
            </p>
            {classes.length === 0 && (
              <Button size="sm" onClick={() => { setEditingClass(null); setFormOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" /> Add Class
              </Button>
            )}
          </div>
        ) : viewMode === 'list' ? (
          <div className="border border-border/50 rounded-xl overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-8 text-center text-xs">#</TableHead>
                  <TableHead>Class Name</TableHead>
                  <TableHead className="w-28">Code</TableHead>
                  <TableHead className="hidden md:table-cell">Description</TableHead>
                  <TableHead className="w-20 text-center">Order</TableHead>
                  <TableHead className="w-24 text-center">Status</TableHead>
                  <TableHead className="w-28 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((cls, idx) => (
                  <TableRow key={cls.id} className={cn("transition-colors", cls.isActive === false && "opacity-60")}>
                    <TableCell className="text-center text-xs text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                          <GraduationCap className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <span className="font-medium text-sm text-foreground">{cls.className}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {cls.classCode
                        ? <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{cls.classCode}</span>
                        : <span className="text-muted-foreground text-xs">—</span>
                      }
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-xs text-muted-foreground line-clamp-1">{cls.description || '—'}</span>
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">{cls.displayOrder ?? 0}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={cls.isActive !== false ? 'default' : 'secondary'} className="text-xs">
                        {cls.isActive !== false ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => { setEditingClass(cls); setFormOpen(true); }}>
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          className={cn("h-7 px-2 text-xs", cls.isActive !== false ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50")}
                          onClick={() => handleToggleActive(cls)}
                          title={cls.isActive !== false ? 'Deactivate' : 'Activate'}
                        >
                          {cls.isActive !== false ? <ToggleLeft className="w-3.5 h-3.5" /> : <ToggleRight className="w-3.5 h-3.5" />}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeletingClass(cls)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(cls => (
              <Card key={cls.id} className={cn("border-border/50 transition-all", cls.isActive === false && "opacity-60")}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-5 h-5 text-primary" />
                    </div>
                    <Badge variant={cls.isActive !== false ? 'default' : 'secondary'} className="text-xs">
                      {cls.isActive !== false ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-foreground text-sm mb-0.5">{cls.className}</h3>
                  {cls.classCode && <p className="text-xs text-muted-foreground mb-1 font-mono">{cls.classCode}</p>}
                  {cls.description && <p className="text-xs text-muted-foreground line-clamp-2">{cls.description}</p>}
                  <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/50">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs flex-1" onClick={() => { setEditingClass(cls); setFormOpen(true); }}>
                      <Edit2 className="w-3 h-3 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      className={cn("h-7 px-2 text-xs", cls.isActive !== false ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50")}
                      onClick={() => handleToggleActive(cls)}
                    >
                      {cls.isActive !== false ? <ToggleLeft className="w-3 h-3" /> : <ToggleRight className="w-3 h-3" />}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeletingClass(cls)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ClassFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingClass(null); }}
        onSave={handleSave}
        classItem={editingClass}
      />

      <AlertDialog open={!!deletingClass} onOpenChange={(o) => !o && setDeletingClass(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Class</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingClass?.className}</strong>?
              This cannot be undone. If this class is assigned to any program, deletion will be blocked.
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

export default ClassManagementPage;
