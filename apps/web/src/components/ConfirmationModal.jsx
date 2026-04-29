
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
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from 'lucide-react';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, description, confirmText = "Confirm", isDestructive = false }) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="sm:max-w-md border-border/50 shadow-soft">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            {isDestructive && (
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
            )}
            <AlertDialogTitle className="text-xl">{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2 text-base">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6">
          <AlertDialogCancel onClick={() => onClose(false)}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={() => {
              onConfirm();
              onClose(false);
            }}
            className={isDestructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmationModal;
