
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { formatNumber, getTrendColor } from '@/utils/analyticsUtils';
import { cn } from '@/lib/utils';

export const MetricsCard = ({ title, value, growth, icon: Icon, loading, reverseTrend = false }) => {
  if (loading) {
    return (
      <Card className="shadow-soft-sm border-border/50">
        <CardContent className="p-6">
          <Skeleton className="h-4 w-24 mb-4" />
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-16" />
        </CardContent>
      </Card>
    );
  }

  const trendColor = getTrendColor(growth, reverseTrend);
  const TrendIcon = growth > 0 ? ArrowUpRight : growth < 0 ? ArrowDownRight : Minus;

  return (
    <Card className="shadow-soft-sm border-border/50 hover:shadow-soft-md transition-all duration-300 group">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {Icon && (
            <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:scale-110 transition-transform">
              <Icon className="w-4 h-4" />
            </div>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl font-poppins font-bold text-foreground">
            {typeof value === 'number' ? formatNumber(value) : value}
          </h3>
          <span className={cn("flex items-center text-xs font-medium", trendColor)}>
            <TrendIcon className="w-3 h-3 mr-0.5" />
            {Math.abs(growth)}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export const ChartContainer = ({ title, description, children, loading, className }) => {
  return (
    <Card className={cn("shadow-soft-sm border-border/50", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-poppins">{title}</CardTitle>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] w-full flex items-center justify-center">
            <Skeleton className="h-full w-full rounded-xl" />
          </div>
        ) : (
          <div className="h-[300px] w-full mt-4">
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
