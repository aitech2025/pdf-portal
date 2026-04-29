
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const MetricsCard = ({ title, value, icon: Icon, trend, trendLabel, colorClass = "text-primary", bgClass = "bg-primary/10" }) => {
  const isPositive = parseFloat(trend) >= 0;

  return (
    <Card className="border-none shadow-soft-sm hover:shadow-soft-md transition-base relative overflow-hidden group bg-card">
      <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-10 -mt-10 transition-base opacity-50 group-hover:opacity-80", bgClass)}></div>
      <CardContent className="p-6 relative z-10">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">{title}</p>
            <h3 className="text-4xl font-poppins font-bold text-foreground">{value}</h3>
          </div>
          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", bgClass, colorClass)}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
        {trend && (
          <div className={cn("mt-4 flex items-center text-sm font-medium", isPositive ? "text-success" : "text-destructive")}>
            {isPositive ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
            <span>{Math.abs(parseFloat(trend))}%</span>
            <span className="text-muted-foreground ml-2 font-normal">{trendLabel || 'vs last period'}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MetricsCard;
