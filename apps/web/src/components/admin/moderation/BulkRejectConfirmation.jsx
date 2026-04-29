
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { REJECTION_REASONS } from '@/utils/contentModerationUtils.js';

const BulkRejectConfirmation = ({ isOpen, onClose, count, onConfirm }) => {
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    if (!reason) return;
    setIsProcessing(true);
    try {
      const processed = await onConfirm(reason);
      toast.success(`Successfully rejected ${processed} documents`);
      setReason('');
      onClose();
    } catch (e) {
      toast.error('Bulk rejection failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isProcessing && !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center mb-3">
            <XCircle className="w-6 h-6 text-rose-600" />
          </div>
          <DialogTitle className="text-xl font-poppins">Reject {count} Documents?</DialogTitle>
          <DialogDescription>
            You are rejecting {count} documents. Please provide a common reason that applies to all selected items.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <label className="block text-sm font-medium text-foreground mb-2">Rejection Reason <span className="text-destructive">*</span></label>
          <Select value={reason} onValueChange={setReason} disabled={isProcessing}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select a reason..." />
            </SelectTrigger>
            <SelectContent>
              {REJECTION_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing} className="bg-background">Cancel</Button>
          <Button onClick={handleConfirm} disabled={isProcessing || !reason} className="bg-rose-600 text-white hover:bg-rose-700 shadow-soft-sm">
            {isProcessing ? 'Processing...' : `Reject ${count} Items`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkRejectConfirmation;
