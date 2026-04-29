
import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils.js';

const SchoolLogo = ({ school, className }) => {
  const getInitials = (name) => {
    if (!name) return <Building2 className="w-1/2 h-1/2 opacity-50" />;
    const parts = name.split(' ');
    if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const getLogoColor = (id) => {
    const colors = [
      'bg-blue-500/10 text-blue-700',
      'bg-indigo-500/10 text-indigo-700',
      'bg-violet-500/10 text-violet-700',
      'bg-sky-500/10 text-sky-700',
      'bg-cyan-500/10 text-cyan-700',
    ];
    if (!id) return colors[0];
    const charCode = id.charCodeAt(0) || 0;
    return colors[charCode % colors.length];
  };

  const colorClass = getLogoColor(school?.id);

  // Assuming schools don't have a direct logo field in schema, fallback to initials
  return (
    <Avatar className={cn("border border-border/50 rounded-[var(--radius-md)]", className)}>
      <AvatarImage src={null} alt={school?.schoolName || 'School'} className="object-cover" />
      <AvatarFallback className={cn("font-poppins font-medium rounded-[var(--radius-md)]", colorClass)}>
        {getInitials(school?.schoolName)}
      </AvatarFallback>
    </Avatar>
  );
};

export default SchoolLogo;
