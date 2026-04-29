
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const StatusBadge = ({ status, className }) => {
  if (!status) return null;
  
  const normalizedStatus = status.toLowerCase();
  
  const variants = {
    pending: "bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border-amber-200",
    approved: "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border-emerald-200",
    active: "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border-emerald-200",
    rejected: "bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 border-rose-200",
    inactive: "bg-slate-500/10 text-slate-700 hover:bg-slate-500/20 border-slate-200",
    sent: "bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 border-blue-200",
    failed: "bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 border-rose-200",
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "capitalize shadow-none font-medium px-2.5 py-0.5", 
        variants[normalizedStatus] || "bg-muted text-muted-foreground",
        className
      )}
    >
      {status}
    </Badge>
  );
};

export default StatusBadge;
