
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
      toast.success(`Successfully deleted ${deletedCount} users`);
      onClose();
    } catch (e) {
      toast.error('Failed to delete some or all users');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !isDeleting && onClose()}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <AlertDialogTitle className="font-poppins text-xl">Delete {selectedCount} Users?</AlertDialogTitle>
          <AlertDialogDescription className="text-base text-foreground/80 mt-2">
            This action cannot be undone. This will permanently delete the selected user accounts and remove their data from the servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6">
          <AlertDialogCancel disabled={isDeleting} className="border-border/50">Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => { e.preventDefault(); handleConfirm(); }} 
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Yes, delete users'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default BulkDeleteConfirmation;
