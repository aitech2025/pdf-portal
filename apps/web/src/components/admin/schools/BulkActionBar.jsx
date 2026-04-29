
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Trash2, Building, Building2, Mail, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const BulkActionBar = ({ selectedCount, onClear, onBulkDelete, onBulkActivate, onBulkDeactivate }) => {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-foreground text-background px-6 py-3 rounded-full shadow-soft-xl"
        >
          <div className="flex items-center gap-2 border-r border-background/20 pr-4">
            <div className="bg-primary text-primary-foreground text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
              {selectedCount}
            </div>
            <span className="text-sm font-medium">Selected</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-background hover:bg-background/20 hover:text-background h-8" onClick={onBulkActivate}>
              <Building className="w-4 h-4 mr-2" /> Activate
            </Button>
            <Button variant="ghost" size="sm" className="text-background hover:bg-background/20 hover:text-background h-8" onClick={onBulkDeactivate}>
              <Building2 className="w-4 h-4 mr-2" /> Deactivate
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-background hover:bg-background/20 hover:text-background h-8 w-8">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="cursor-pointer">
                  <Mail className="w-4 h-4 mr-2 text-muted-foreground" /> Send Email
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={onBulkDelete}>
                  <Trash2 className="w-4 h-4 mr-2" /> Delete Selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <Button variant="ghost" size="sm" className="text-background/60 hover:bg-background/10 hover:text-background h-8 ml-2 border border-background/20 rounded-full" onClick={onClear}>
            Cancel
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BulkActionBar;
