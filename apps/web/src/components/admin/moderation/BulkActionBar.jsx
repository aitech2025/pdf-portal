
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Trash2, X } from 'lucide-react';

const BulkActionBar = ({ selectedCount, onClear, onApprove, onReject, onDelete }) => {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-foreground text-background px-6 py-3 rounded-full shadow-soft-xl"
        >
          <div className="flex items-center gap-2 border-r border-background/20 pr-3">
            <span className="bg-primary text-primary-foreground text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
              {selectedCount}
            </span>
            <span className="text-sm font-medium">Selected</span>
          </div>
          
          <Button variant="ghost" size="sm" className="text-background hover:bg-emerald-500/20 hover:text-emerald-400 h-8" onClick={onApprove}>
            <CheckCircle className="w-4 h-4 mr-2" /> Approve
          </Button>
          <Button variant="ghost" size="sm" className="text-background hover:bg-rose-500/20 hover:text-rose-400 h-8" onClick={onReject}>
            <XCircle className="w-4 h-4 mr-2" /> Reject
          </Button>
          <div className="w-px h-4 bg-background/20"></div>
          <Button variant="ghost" size="sm" className="text-background hover:bg-destructive/20 hover:text-destructive h-8" onClick={onDelete}>
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </Button>
          
          <Button variant="ghost" size="icon" className="text-background/60 hover:bg-background/10 hover:text-background h-8 w-8 ml-2 rounded-full border border-background/20" onClick={onClear}>
            <X className="w-4 h-4" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BulkActionBar;
