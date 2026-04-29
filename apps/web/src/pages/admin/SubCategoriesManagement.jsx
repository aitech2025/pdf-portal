
import React, { useState, useEffect } from 'react';
import pb from '@/lib/apiClient';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search, FolderTree } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import PageTransition from '@/components/PageTransition.jsx';
import PageHeader from '@/components/PageHeader.jsx';
import { Skeleton } from '@/components/ui/skeleton';

const SubCategoriesManagement = () => {
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    categoryId: '', subCategoryName: '', programName: '', objective: '', descriptive: '', isActive: true
  });

  useEffect(() => {
    const init = async () => {
      try {
        const cats = await pb.collection('categories').getList(1, 100, { sort: 'categoryName', $autoCancel: false });
        setCategories(cats.items);
        await fetchSubCategories('all');
      } catch (err) {
        toast.error('Failed to load initial data');
      }
    };
    init();
  }, []);

  const fetchSubCategories = async (catId) => {
    setLoading(true);
    try {
      const filter = catId !== 'all' ? `categoryId="${catId}"` : '';
      const records = await pb.collection('subCategories').getList(1, 200, {
        filter, expand: 'categoryId', sort: '-created', $autoCancel: false
      });
      setSubCategories(records.items);
    } catch (err) {
      toast.error('Failed to fetch sub-categories');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryFilterChange = (val) => {
    setSelectedCategoryId(val);
    fetchSubCategories(val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await pb.collection('subCategories').update(editingId, formData, { $autoCancel: false });
        toast.success('Sub-category updated');
      } else {
        await pb.collection('subCategories').create(formData, { $autoCancel: false });
        toast.success('Sub-category created');
      }
      setIsOpen(false);
      resetForm();
      fetchSubCategories(selectedCategoryId);
    } catch (err) {
      toast.error(err.message || 'An error occurred');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this sub-category? This action cannot be undone.')) {
      try {
        await pb.collection('subCategories').delete(id, { $autoCancel: false });
        toast.success('Sub-category deleted');
        fetchSubCategories(selectedCategoryId);
      } catch (err) {
        toast.error('Failed to delete');
      }
    }
  };

  const resetForm = () => {
    setFormData({ categoryId: '', subCategoryName: '', programName: '', objective: '', descriptive: '', isActive: true });
    setEditingId(null);
  };

  const openEdit = (sub) => {
    setFormData({
      categoryId: sub.categoryId, subCategoryName: sub.subCategoryName,
      programName: sub.programName, objective: sub.objective,
      descriptive: sub.descriptive, isActive: sub.isActive
    });
    setEditingId(sub.id);
    setIsOpen(true);
  };

  const filtered = subCategories.filter(s => s.subCategoryName.toLowerCase().includes(search.toLowerCase()));

  return (
    <PageTransition>
      <PageHeader 
        title="Sub-Categories" 
        description="Manage detailed program structures within main categories."
        breadcrumbs={[{ label: 'Content Management' }, { label: 'Sub-Categories' }]}
        actions={
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if(!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="shadow-sm"><Plus className="w-4 h-4 mr-2" /> Add Sub-Category</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Sub-Category' : 'New Sub-Category'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Parent Category *</Label>
                  <Select required value={formData.categoryId} onValueChange={v => setFormData({...formData, categoryId: v})}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.categoryName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Sub-Category Name *</Label>
                    <Input required value={formData.subCategoryName} onChange={e => setFormData({...formData, subCategoryName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Program Name *</Label>
                    <Input required value={formData.programName} onChange={e => setFormData({...formData, programName: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Objective</Label>
                  <Textarea rows={2} value={formData.objective} onChange={e => setFormData({...formData, objective: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Descriptive</Label>
                  <Textarea rows={2} value={formData.descriptive} onChange={e => setFormData({...formData, descriptive: e.target.value})} />
                </div>
                <DialogFooter className="pt-4">
                  <Button type="submit" className="w-full">{editingId ? 'Save Changes' : 'Create Sub-Category'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-card p-4 rounded-2xl border border-border/50 shadow-sm">
        <div className="w-full sm:w-64 space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Filter by Category</Label>
          <Select value={selectedCategoryId} onValueChange={handleCategoryFilterChange}>
            <SelectTrigger className="bg-background"><SelectValue placeholder="All Categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.categoryName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:flex-1 space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search sub-categories..." className="pl-9 bg-background" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
      ) : (
        <div className="border border-border/50 rounded-2xl bg-card overflow-hidden shadow-soft">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>Sub-Category</TableHead>
                <TableHead>Parent Category</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <FolderTree className="w-8 h-8 mb-2 opacity-20" />
                      <p>No sub-categories found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(sub => (
                  <TableRow key={sub.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">{sub.subCategoryName}</TableCell>
                    <TableCell className="text-muted-foreground">{sub.expand?.categoryId?.categoryName || 'Unknown'}</TableCell>
                    <TableCell>{sub.programName}</TableCell>
                    <TableCell>
                      <Badge variant={sub.isActive ? 'default' : 'secondary'} className={sub.isActive ? 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border-emerald-200' : ''}>
                        {sub.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(sub)} className="h-8 w-8 text-muted-foreground hover:text-primary">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(sub.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </PageTransition>
  );
};

export default SubCategoriesManagement;
