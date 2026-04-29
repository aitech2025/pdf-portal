
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

const StatCard = ({ title, value, icon: Icon, colorClass }) => {
  return (
    <Card className="border-border/50 shadow-soft-sm bg-card hover:shadow-soft-md transition-base relative overflow-hidden">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${colorClass.split(' ')[0]}`}></div>
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <h4 className="text-2xl font-poppins font-bold text-foreground">{value}</h4>
        </div>
        <div className={`w-12 h-12 rounded-[var(--radius-md)] flex items-center justify-center ${colorClass}`}>
          <Icon className="w-6 h-6" />
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;
