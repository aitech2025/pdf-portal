
import React, { useState, useEffect } from 'react';
import pb from '@/lib/apiClient.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Edit2, Plus, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

const CategoryManagementModal = ({ isOpen, onClose }) => {
  const [categories, setCategories] = useState([]);
  const [newCat, setNewCat] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchCats = async () => {
    setLoading(true);
    try {
      const res = await pb.collection('categories').getFullList({ sort: 'created', $autoCancel: false });
      setCategories(res);
    } catch (e) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchCats();
  }, [isOpen]);

  const handleAdd = async () => {
    if (!newCat.trim()) return;
    try {
      await pb.collection('categories').create({ categoryName: newCat, categoryType: 'Grade 1-5' }, { $autoCancel: false });
      setNewCat('');
      fetchCats();
      toast.success('Category added');
    } catch (e) {
      toast.error('Failed to add');
    }
  };

  const handleDelete = async (id) => {
    try {
      await pb.collection('categories').delete(id, { $autoCancel: false });
      fetchCats();
      toast.success('Category deleted');
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-poppins text-xl">Manage Categories</DialogTitle>
          <DialogDescription>Add, edit or organize content categories.</DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 py-4">
          <Input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="New category name..." className="bg-background" />
          <Button onClick={handleAdd} className="shadow-soft-sm"><Plus className="w-4 h-4 mr-2" /> Add</Button>
        </div>

        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {loading ? <p className="text-center text-sm text-muted-foreground">Loading...</p> : categories.map(cat => (
            <div key={cat.id} className="flex items-center justify-between p-3 border border-border/50 rounded-md bg-card hover:bg-muted/30">
              <div className="flex items-center gap-3">
                <GripVertical className="w-4 h-4 text-muted-foreground/50 cursor-grab" />
                <span className="font-medium text-sm">{cat.categoryName}</span>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(cat.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryManagementModal;
