
import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const FileUploadZone = ({ onFileSelect, accept = ".pdf", maxFiles = 10, multiple = true, disabled = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFiles = (files) => {
    const validFiles = files.filter(f => {
      if (accept === '.pdf' && f.type !== 'application/pdf') return false;
      return true;
    }).slice(0, maxFiles);
    
    if (validFiles.length > 0) {
      onFileSelect(validFiles);
    }
  };

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center p-8 md:p-12 border-2 border-dashed rounded-2xl transition-all duration-200 ease-in-out",
        isDragging ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/30",
        disabled && "opacity-50 cursor-not-allowed hover:bg-card"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept={accept}
        multiple={multiple}
        onChange={handleFileInput}
        disabled={disabled}
      />
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
        <UploadCloud className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-semibold mb-1 text-foreground">
        {isDragging ? "Drop files here" : "Click or drag files to upload"}
      </h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        Supports {accept} files. Max {maxFiles} files per batch.
      </p>
    </div>
  );
};

export default FileUploadZone;
