
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const BulkApproveConfirmation = ({ isOpen, onClose, count, onConfirm }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      const processed = await onConfirm();
      toast.success(`Successfully approved ${processed} documents`);
      onClose();
    } catch (e) {
      toast.error('Bulk approval failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isProcessing && !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
            <CheckCircle className="w-6 h-6 text-emerald-600" />
          </div>
          <DialogTitle className="text-xl font-poppins">Approve {count} Documents?</DialogTitle>
          <DialogDescription>
            You are about to approve {count} selected documents simultaneously. This will make them publicly accessible and notify their uploaders.
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={isProcessing} className="bg-background">Cancel</Button>
          <Button onClick={handleConfirm} disabled={isProcessing} className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-soft-sm">
            {isProcessing ? 'Processing...' : `Approve ${count} Items`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkApproveConfirmation;
