
import React, { useState, useEffect } from 'react';
import pb from '@/lib/apiClient';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';

const CategoriesManagement = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    categoryName: '',
    categoryType: '',
    description: '',
    isActive: true
  });

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const records = await pb.collection('categories').getList(1, 100, {
        sort: '-created',
        $autoCancel: false
      });
      setCategories(records.items);
    } catch (err) {
      toast.error('Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await pb.collection('categories').update(editingId, formData, { $autoCancel: false });
        toast.success('Category updated successfully');
      } else {
        await pb.collection('categories').create(formData, { $autoCancel: false });
        toast.success('Category created successfully');
      }
      setIsOpen(false);
      resetForm();
      fetchCategories();
    } catch (err) {
      toast.error(err.message || 'An error occurred');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await pb.collection('categories').delete(id, { $autoCancel: false });
        toast.success('Category deleted');
        fetchCategories();
      } catch (err) {
        toast.error('Failed to delete category');
      }
    }
  };

  const resetForm = () => {
    setFormData({ categoryName: '', categoryType: '', description: '', isActive: true });
    setEditingId(null);
  };

  const openEdit = (category) => {
    setFormData({
      categoryName: category.categoryName,
      categoryType: category.categoryType,
      description: category.description,
      isActive: category.isActive
    });
    setEditingId(category.id);
    setIsOpen(true);
  };

  const filteredCategories = categories.filter(c => 
    c.categoryName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">Manage top-level educational categories.</p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search categories..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if(!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> Add Category</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Category' : 'New Category'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Category Name</Label>
                  <Input 
                    required 
                    value={formData.categoryName}
                    onChange={e => setFormData({...formData, categoryName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category Type</Label>
                  <Select 
                    required 
                    value={formData.categoryType} 
                    onValueChange={v => setFormData({...formData, categoryType: v})}
                  >
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Grade 1-5">Grade 1-5</SelectItem>
                      <SelectItem value="Grade 6-10">Grade 6-10</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea 
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  />
                </div>
                <Button type="submit" className="w-full">{editingId ? 'Update' : 'Create'}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="border rounded-xl bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No categories found.</TableCell>
                </TableRow>
              ) : (
                filteredCategories.map(category => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.categoryName}</TableCell>
                    <TableCell>{category.categoryType}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground truncate max-w-xs">{category.description}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(category)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(category.id)}>
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
    </div>
  );
};

export default CategoriesManagement;
