
import React from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const FilterChip = ({ label, value, onRemove }) => {
  if (!value || value === 'all') return null;
  return (
    <Badge variant="secondary" className="px-2 py-1 text-xs font-medium bg-muted text-foreground flex items-center gap-1 border border-border/50 shadow-none">
      <span className="text-muted-foreground mr-1">{label}:</span> 
      <span className="capitalize">{value}</span>
      <button onClick={onRemove} className="ml-1 rounded-full p-0.5 hover:bg-background/80 transition-colors text-muted-foreground hover:text-foreground">
        <X className="w-3 h-3" />
      </button>
    </Badge>
  );
};

export default FilterChip;
