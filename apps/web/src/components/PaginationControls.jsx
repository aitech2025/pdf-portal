import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Reusable Previous/Next pagination bar.
 * Rendered both above and below a list section so users can page without scrolling.
 */
const PaginationControls = ({
  page,
  totalPages,
  onPrev,
  onNext,
  total,
  itemLabel = 'items',
  loading = false,
  className = '',
}) => {
  if (totalPages <= 1) return null;
  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
        {typeof total === 'number' ? ` · ${total} ${itemLabel} total` : ''}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onPrev} disabled={page <= 1 || loading}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Previous
        </Button>
        <Button variant="outline" size="sm" onClick={onNext} disabled={page >= totalPages || loading}>
          Next <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};

export default PaginationControls;
