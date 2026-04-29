
import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import StatusBadge from './StatusBadge.jsx';
import { CheckCircle2, XCircle } from 'lucide-react';

const RequestDetailPanel = ({ isOpen, onClose, request, onApprove, onReject, title }) => {
  if (!request) return null;

  // Filter out system fields for display
  const excludeFields = ['id', 'collectionId', 'collectionName', 'created', 'updated', 'status', 'expand'];
  
  const displayFields = Object.entries(request).filter(
    ([key]) => !excludeFields.includes(key) && request[key] !== '' && request[key] !== null
  );

  const formatKey = (key) => {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  const formatValue = (val) => {
    if (Array.isArray(val)) return val.join(', ');
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/)) {
      return new Date(val).toLocaleDateString();
    }
    return val;
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md flex flex-col h-full bg-card overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-2xl">{title || 'Request Details'}</SheetTitle>
            <StatusBadge status={request.status} />
          </div>
          <SheetDescription className="text-muted-foreground">
            Submitted on {new Date(request.created).toLocaleDateString()}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6">
          <div className="space-y-4 bg-muted/30 rounded-xl p-5 border border-border/50">
            {displayFields.map(([key, value]) => (
              <div key={key} className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {formatKey(key)}
                </span>
                <p className="text-sm font-medium text-foreground break-words">
                  {formatValue(value)}
                </p>
              </div>
            ))}
          </div>
          
          {request.rejectionReason && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
              <span className="text-xs font-semibold text-destructive uppercase tracking-wider block mb-1">
                Rejection Reason
              </span>
              <p className="text-sm text-destructive-foreground">
                {request.rejectionReason}
              </p>
            </div>
          )}
        </div>

        {request.status === 'pending' && (
          <div className="pt-6 mt-6 border-t border-border flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
              onClick={() => onReject(request)}
            >
              <XCircle className="w-4 h-4 mr-2" /> Reject
            </Button>
            <Button 
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => onApprove(request)}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default RequestDetailPanel;
