
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Shield, GraduationCap, Building } from 'lucide-react';
import { USER_ROLES } from '@/utils/userManagementUtils.js';

const UserRoleBadge = ({ role }) => {
  if (role === USER_ROLES.ADMIN) {
    return (
      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 shadow-none font-medium flex items-center gap-1.5 w-fit">
        <Shield className="w-3 h-3" /> Admin
      </Badge>
    );
  }
  
  if (role === USER_ROLES.SCHOOL) {
    return (
      <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20 hover:bg-accent/20 shadow-none font-medium flex items-center gap-1.5 w-fit">
        <Building className="w-3 h-3" /> School
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className="bg-secondary/20 text-secondary-foreground border-secondary/30 hover:bg-secondary/30 shadow-none font-medium flex items-center gap-1.5 w-fit">
      <GraduationCap className="w-3 h-3" /> {role || 'Teacher'}
    </Badge>
  );
};

export default UserRoleBadge;
