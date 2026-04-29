
import React, { useState, useEffect } from 'react';
import pb from '@/lib/apiClient.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const PDFDetailsModal = ({ isOpen, onClose, pdf, onSave }) => {
  const [formData, setFormData] = useState({});
  const [categories, setCategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      pb.collection('categories').getFullList({ $autoCancel: false }).then(setCategories).catch(console.error);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && pdf) {
      setFormData({
        fileName: pdf.fileName || '',
        categoryId: pdf.categoryId || '',
        isActive: pdf.isActive || false
      });
    }
  }, [isOpen, pdf]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await pb.collection('pdfs').update(pdf.id, formData, { $autoCancel: false });
      toast.success('PDF metadata updated');
      onSave();
      onClose();
    } catch (e) {
      toast.error('Failed to update PDF');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !submitting && !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-poppins text-xl">Edit PDF Metadata</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">File Name</label>
            <Input 
              value={formData.fileName || ''} 
              onChange={e => setFormData({...formData, fileName: e.target.value})}
              disabled={submitting}
              className="bg-background"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium mb-1.5 block">Category</label>
            <Select 
              value={formData.categoryId || 'none'} 
              onValueChange={v => setFormData({...formData, categoryId: v === 'none' ? '' : v})}
              disabled={submitting}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Uncategorized</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.categoryName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Visibility Status</label>
            <Select 
              value={formData.isActive ? 'true' : 'false'} 
              onValueChange={v => setFormData({...formData, isActive: v === 'true'})}
              disabled={submitting}
            >
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Approved (Visible)</SelectItem>
                <SelectItem value="false">Pending / Hidden</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50 text-sm">
            <div><span className="text-muted-foreground block mb-1">Uploader</span><span className="font-medium">{pdf?.uploaderName}</span></div>
            <div><span className="text-muted-foreground block mb-1">Upload Date</span><span className="font-medium">{new Date(pdf?.uploadedAt || pdf?.created).toLocaleDateString()}</span></div>
            <div><span className="text-muted-foreground block mb-1">File Size</span><span className="font-medium">{pdf?.fileSize ? (pdf.fileSize / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown'}</span></div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="shadow-soft-sm">Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PDFDetailsModal;
