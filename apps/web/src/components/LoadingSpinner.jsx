
import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ text = "Loading...", className = "" }) => {
  return (
    <div className={`flex flex-col items-center justify-center space-y-4 p-8 ${className}`}>
      <Loader2 className="w-10 h-10 text-primary animate-spin" />
      {text && <p className="text-muted-foreground text-sm font-medium animate-pulse">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
