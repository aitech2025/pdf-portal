import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Info } from 'lucide-react';
import CategoryAccessPanel from './CategoryAccessPanel.jsx';

const CategoryAssignmentModal = ({ isOpen, onClose, schoolId, schoolName }) => {
    const [assignedCount, setAssignedCount] = useState(0);

    const handleFinish = () => {
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-4 border-b border-border/50 bg-muted/10">
                    <DialogTitle className="text-xl font-poppins">Assign Category Access</DialogTitle>
                    <DialogDescription>
                        Configure which categories <strong>{schoolName}</strong> can access. You can modify this later.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[60vh] p-6">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-5 text-sm text-amber-700 dark:text-amber-300">
                        <Info className="w-4 h-4 shrink-0" />
                        Assign categories now or skip and configure later from the school details page.
                    </div>

                    {schoolId && (
                        <CategoryAccessPanel
                            schoolId={schoolId}
                            onCountChange={setAssignedCount}
                        />
                    )}
                </ScrollArea>

                <DialogFooter className="p-4 border-t border-border/50 bg-muted/10">
                    <Button type="button" onClick={handleFinish}>
                        Done ({assignedCount} categories assigned)
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CategoryAssignmentModal;
