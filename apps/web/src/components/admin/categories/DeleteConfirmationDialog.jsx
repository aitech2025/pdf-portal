
import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Loader2 } from 'lucide-react';

const DeleteConfirmationDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  itemName, 
  itemType, 
  childCount = 0, 
  loading = false 
}) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !loading && onClose()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 text-destructive mb-2">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <AlertDialogTitle className="text-xl">Delete {itemType}?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base mt-4 text-foreground/80">
            This action cannot be undone. Are you sure you want to permanently delete <span className="font-semibold text-foreground">"{itemName}"</span>?
          </AlertDialogDescription>
          
          {childCount > 0 && (
            <div className="mt-4 p-3 bg-destructive/5 border border-destructive/20 rounded-[var(--radius-md)] text-sm text-destructive-foreground font-medium">
              Warning: This {itemType.toLowerCase()} contains {childCount} associated {itemType === 'Category' ? 'sub-categories' : 'PDFs'}. 
              Deleting it may break existing references or cascade delete these items.
            </div>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6">
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting...</>
            ) : (
              'Yes, Delete'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteConfirmationDialog;
