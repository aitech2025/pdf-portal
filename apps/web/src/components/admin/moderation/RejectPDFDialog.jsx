
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { XCircle } from 'lucide-react';
import { REJECTION_REASONS } from '@/utils/contentModerationUtils.js';

const RejectPDFDialog = ({ isOpen, onClose, pdf, onReject }) => {
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReject = async () => {
    if (!reason) return;
    setIsSubmitting(true);
    await onReject(pdf.id, 'rejected', reason, comment);
    setIsSubmitting(false);
    setReason('');
    setComment('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center mb-3">
            <XCircle className="w-6 h-6 text-rose-600" />
          </div>
          <DialogTitle className="text-xl font-poppins">Reject Document</DialogTitle>
          <DialogDescription>
            You are rejecting <strong>{pdf?.fileName}</strong>. The uploader will be notified with the selected reason.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Rejection Reason <span className="text-destructive">*</span></label>
            <Select value={reason} onValueChange={setReason} disabled={isSubmitting}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {REJECTION_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Additional Comments</label>
            <Textarea 
              value={comment} 
              onChange={(e) => setComment(e.target.value)} 
              placeholder="Provide specific details for the rejection..."
              className="bg-background min-h-[100px]"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="bg-background">Cancel</Button>
          <Button onClick={handleReject} disabled={isSubmitting || !reason} className="bg-rose-600 text-white hover:bg-rose-700 shadow-soft-sm">
            {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RejectPDFDialog;
