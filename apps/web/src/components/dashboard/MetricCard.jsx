
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useNavigationTiles } from '@/hooks/useNavigationTiles.js';

const MetricCard = ({ title, value, trend, icon: Icon, gradientClass, tileId, onClick }) => {
  const isPositive = trend >= 0;
  const { getTileAriaLabel } = useNavigationTiles();

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (onClick) onClick();
    }
  };

  const Component = onClick ? motion.div : 'div';

  return (
    <Component
      role={onClick ? "button" : "region"}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      aria-label={onClick ? getTileAriaLabel(tileId) : undefined}
      whileHover={onClick ? { scale: 1.02, y: -2 } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-xl)] border border-border/50 bg-card transition-all duration-200",
        onClick && "cursor-pointer hover:shadow-lg hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      )}
    >
      <div className={cn("absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none", gradientClass)}></div>
      <CardContent className="p-6 relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-soft-sm", gradientClass)}>
            <Icon className="w-6 h-6" />
          </div>
          {trend !== undefined && (
            <div className={cn(
              "flex items-center text-sm font-medium px-2.5 py-1 rounded-full",
              isPositive ? "text-emerald-600 bg-emerald-500/10" : "text-rose-600 bg-rose-500/10"
            )}>
              {isPositive ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        <div>
          <h3 className="text-3xl font-poppins font-bold text-foreground mb-1 tracking-tight">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </h3>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Component>
  );
};

export default MetricCard;
