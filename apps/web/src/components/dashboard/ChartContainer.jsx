
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const ChartContainer = ({ title, description, loading, children, className }) => {
  return (
    <Card className={`shadow-soft-md border-border/50 bg-card ${className}`}>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="h-[300px] w-full">
        {loading ? (
          <Skeleton className="w-full h-full rounded-xl" />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
};

export default ChartContainer;
