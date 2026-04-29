
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { MODERATION_STATUSES } from '@/utils/contentModerationUtils.js';

const PDFStatusBadge = ({ status }) => {
  let colorClass = 'bg-muted text-muted-foreground border-border';
  
  if (status === MODERATION_STATUSES.APPROVED) {
    colorClass = 'bg-emerald-500/15 text-emerald-700 border-emerald-500/20 dark:text-emerald-400';
  } else if (status === MODERATION_STATUSES.REJECTED) {
    colorClass = 'bg-rose-500/15 text-rose-700 border-rose-500/20 dark:text-rose-400';
  } else if (status === MODERATION_STATUSES.PENDING) {
    colorClass = 'bg-blue-500/15 text-blue-700 border-blue-500/20 dark:text-blue-400';
  } else if (status === MODERATION_STATUSES.ARCHIVED) {
    colorClass = 'bg-slate-500/15 text-slate-700 border-slate-500/20 dark:text-slate-400';
  }

  return (
    <Badge variant="outline" className={`font-medium ${colorClass} shadow-none`}>
      {status}
    </Badge>
  );
};

export default PDFStatusBadge;
