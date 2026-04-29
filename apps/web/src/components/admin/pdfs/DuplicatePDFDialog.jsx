
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, CopyPlus, FilePlus } from 'lucide-react';

const DuplicatePDFDialog = ({ isOpen, onClose, existingPdf, file, onNewVersion, onNewPDF }) => {
  if (!existingPdf || !file) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 text-warning mb-2">
            <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-xl text-foreground font-poppins">Duplicate Found</DialogTitle>
          </div>
          <DialogDescription className="text-base mt-2">
            A PDF with the name <span className="font-semibold text-foreground">"{file.name}"</span> already exists in this category. What would you like to do?
          </DialogDescription>
        </DialogHeader>
        
        <div className="my-4 p-4 rounded-[var(--radius-md)] bg-muted/30 border border-border/50 text-sm">
          <p className="flex justify-between mb-2">
            <span className="text-muted-foreground">Existing ID:</span>
            <span className="font-medium text-foreground">{existingPdf.pdfId || 'N/A'}</span>
          </p>
          <p className="flex justify-between mb-2">
            <span className="text-muted-foreground">Current Version:</span>
            <span className="font-medium text-foreground">v{existingPdf.currentVersion || 1}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-muted-foreground">Uploaded:</span>
            <span className="font-medium text-foreground">{new Date(existingPdf.created).toLocaleDateString()}</span>
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-2 sm:justify-between">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button 
              variant="secondary" 
              onClick={() => onNewPDF()}
              className="w-full sm:w-auto bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              <FilePlus className="w-4 h-4 mr-2" /> Upload as New
            </Button>
            <Button 
              variant="default" 
              onClick={() => onNewVersion(existingPdf.id)}
              className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <CopyPlus className="w-4 h-4 mr-2" /> Create v{(existingPdf.versionCount || 1) + 1}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DuplicatePDFDialog;
