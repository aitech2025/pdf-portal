
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { SCHOOL_STATUSES } from '@/utils/schoolManagementUtils.js';

const SchoolStatusBadge = ({ status }) => {
  let colorClass = 'bg-muted text-muted-foreground hover:bg-muted/80';
  
  if (status === SCHOOL_STATUSES.ACTIVE) {
    colorClass = 'bg-emerald-500/15 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/25 dark:text-emerald-400';
  } else if (status === SCHOOL_STATUSES.INACTIVE) {
    colorClass = 'bg-amber-500/15 text-amber-700 border-amber-500/20 hover:bg-amber-500/25 dark:text-amber-400';
  } else if (status === SCHOOL_STATUSES.DEACTIVATED) {
    colorClass = 'bg-rose-500/15 text-rose-700 border-rose-500/20 hover:bg-rose-500/25 dark:text-rose-400';
  } else if (status === SCHOOL_STATUSES.PENDING) {
    colorClass = 'bg-slate-500/15 text-slate-700 border-slate-500/20 hover:bg-slate-500/25 dark:text-slate-400';
  }

  return (
    <Badge variant="outline" className={`font-medium ${colorClass} transition-colors border shadow-none`}>
      {status}
    </Badge>
  );
};

export default SchoolStatusBadge;
