
import React from 'react';
import { cn } from '@/lib/utils';

const StatusIndicator = ({ status, label }) => {
  const variants = {
    success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    warning: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20",
    danger: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/20",
    neutral: "bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/20",
  };

  const dots = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
    neutral: "bg-slate-500",
  };

  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", variants[status] || variants.neutral)}>
      <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", dots[status] || dots.neutral)}></span>
      {label}
    </span>
  );
};

export default StatusIndicator;
