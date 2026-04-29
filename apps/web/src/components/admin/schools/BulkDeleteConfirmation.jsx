
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
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const BulkDeleteConfirmation = ({ isOpen, onClose, selectedCount, onConfirm }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      const deletedCount = await onConfirm();
      toast.success(`Successfully deleted ${deletedCount} schools`);
      onClose();
    } catch (e) {
      toast.error('Failed to delete some or all schools');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !isDeleting && onClose()}>
      <AlertDialogContent className="sm:max-w-md border-destructive/20">
        <AlertDialogHeader>
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <AlertDialogTitle className="font-poppins text-xl text-destructive">Delete {selectedCount} Schools?</AlertDialogTitle>
          <AlertDialogDescription className="text-base text-foreground/80 mt-2">
            This action cannot be undone. This will permanently delete the selected schools and may orphan associated users and records.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6">
          <AlertDialogCancel disabled={isDeleting} className="border-border/50">Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => { e.preventDefault(); handleConfirm(); }} 
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Yes, delete permanently'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default BulkDeleteConfirmation;
