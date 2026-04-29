
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const TopPerformersList = ({ items, loading, renderItem }) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No data available</p>;
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/30 transition-colors">
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
};

export default TopPerformersList;
