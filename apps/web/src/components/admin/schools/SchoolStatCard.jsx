
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

const SchoolStatCard = ({ title, value, icon: Icon, className }) => {
  return (
    <Card className={`border border-border/50 shadow-soft-sm bg-card overflow-hidden ${className}`}>
      <CardContent className="p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-[var(--radius-md)] bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-poppins font-bold text-foreground truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SchoolStatCard;
