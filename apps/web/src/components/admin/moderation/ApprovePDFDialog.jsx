
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle } from 'lucide-react';

const ApprovePDFDialog = ({ isOpen, onClose, pdf, onApprove }) => {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApprove = async () => {
    setIsSubmitting(true);
    await onApprove(pdf.id, 'approved', '', comment);
    setIsSubmitting(false);
    setComment('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
            <CheckCircle className="w-6 h-6 text-emerald-600" />
          </div>
          <DialogTitle className="text-xl font-poppins">Approve Document</DialogTitle>
          <DialogDescription>
            You are about to approve <strong>{pdf?.fileName}</strong>. This will make it publicly accessible.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <label className="block text-sm font-medium text-foreground mb-2">Internal Note (Optional)</label>
          <Textarea 
            value={comment} 
            onChange={(e) => setComment(e.target.value)} 
            placeholder="Add a note or context for this approval..."
            className="bg-background min-h-[100px]"
            disabled={isSubmitting}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="bg-background">Cancel</Button>
          <Button onClick={handleApprove} disabled={isSubmitting} className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-soft-sm">
            {isSubmitting ? 'Approving...' : 'Confirm Approval'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ApprovePDFDialog;
