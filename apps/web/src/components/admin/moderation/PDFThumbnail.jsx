
import React from 'react';
import { FileText } from 'lucide-react';

const PDFThumbnail = ({ url, title }) => {
  // In a real scenario, this might render a canvas thumbnail. 
  // We'll use a stylized fallback icon for performance in the list view.
  return (
    <div className="w-12 h-16 bg-muted/50 rounded-md border border-border/50 flex items-center justify-center shrink-0 overflow-hidden relative group">
      <FileText className="w-6 h-6 text-muted-foreground/60" />
      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="absolute bottom-0 w-full h-1/3 bg-gradient-to-t from-black/20 to-transparent" />
      <span className="absolute bottom-1 right-1 text-[8px] font-bold text-white bg-black/40 px-1 rounded-sm uppercase">PDF</span>
    </div>
  );
};

export default PDFThumbnail;
