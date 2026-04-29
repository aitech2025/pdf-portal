
import React from 'react';
import { Progress } from '@/components/ui/progress';
import StatusIndicator from './StatusIndicator.jsx';

const SystemHealthItem = ({ label, value, status, type = 'text', progressValue }) => {
  return (
    <div className="flex flex-col gap-2 p-4 rounded-xl border border-border/50 bg-card hover:shadow-soft-sm transition-base">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <StatusIndicator status={status} label={status === 'success' ? 'Healthy' : status === 'warning' ? 'Warning' : 'Critical'} />
      </div>
      
      {type === 'progress' ? (
        <div className="space-y-1.5 mt-1">
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-foreground">{value}</span>
            <span className="text-muted-foreground">{progressValue}%</span>
          </div>
          <Progress value={progressValue} className="h-2" />
        </div>
      ) : (
        <div className="text-xl font-poppins font-semibold text-foreground mt-1">
          {value}
        </div>
      )}
    </div>
  );
};

export default SystemHealthItem;
