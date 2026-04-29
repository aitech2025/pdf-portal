
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';

const ProgressIndicator = ({ value = 0, label, showPercentage = true }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 5 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="w-full space-y-2"
    >
      <div className="flex justify-between items-center text-sm font-medium">
        <span className="text-foreground">{label}</span>
        {showPercentage && <span className="text-muted-foreground">{Math.round(value)}%</span>}
      </div>
      <Progress value={value} className="h-2 w-full bg-secondary" />
    </motion.div>
  );
};

export default ProgressIndicator;
