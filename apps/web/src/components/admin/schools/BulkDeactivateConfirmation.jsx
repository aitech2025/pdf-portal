
import React, { useState } from 'react';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Building2 } from 'lucide-react';
import { toast } from 'sonner';

const BulkDeactivateConfirmation = ({ isOpen, onClose, selectedCount, onConfirm }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      const count = await onConfirm();
      toast.success(`Successfully deactivated ${count} schools`);
      onClose();
    } catch (e) {
      toast.error('Failed to deactivate some or all schools');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !isProcessing && onClose()}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center mb-4">
            <Building2 className="w-6 h-6 text-rose-600" />
          </div>
          <AlertDialogTitle className="font-poppins text-xl">Deactivate {selectedCount} Schools?</AlertDialogTitle>
          <AlertDialogDescription className="text-base text-foreground/80 mt-2">
            Deactivating these schools will prevent their users from logging in and accessing any associated content. You can reactivate them later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6">
          <AlertDialogCancel disabled={isProcessing} className="border-border/50">Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => { e.preventDefault(); handleConfirm(); }} 
            disabled={isProcessing}
            className="bg-rose-600 text-white hover:bg-rose-700"
          >
            {isProcessing ? 'Processing...' : 'Yes, deactivate schools'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default BulkDeactivateConfirmation;
