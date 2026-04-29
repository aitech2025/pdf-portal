
import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import pb from '@/lib/apiClient.js';
import { cn } from '@/lib/utils.js';

const UserAvatar = ({ user, className }) => {
  const getInitials = (name, email) => {
    if (name) {
      const parts = name.split(' ');
      if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
      return name.substring(0, 2).toUpperCase();
    }
    if (email) return email.substring(0, 2).toUpperCase();
    return 'U';
  };

  const getAvatarColor = (id) => {
    const colors = [
      'bg-blue-500/10 text-blue-700',
      'bg-indigo-500/10 text-indigo-700',
      'bg-violet-500/10 text-violet-700',
      'bg-fuchsia-500/10 text-fuchsia-700',
      'bg-pink-500/10 text-pink-700',
      'bg-rose-500/10 text-rose-700',
      'bg-orange-500/10 text-orange-700',
    ];
    if (!id) return colors[0];
    const charCode = id.charCodeAt(0) || 0;
    return colors[charCode % colors.length];
  };

  const avatarUrl = user?.avatar ?`/uploads/${user.avatar}` : null;
  const colorClass = getAvatarColor(user?.id);

  return (
    <Avatar className={cn("border border-border/50", className)}>
      <AvatarImage src={avatarUrl} alt={user?.name || 'User'} className="object-cover" />
      <AvatarFallback className={cn("font-poppins font-medium", colorClass)}>
        {getInitials(user?.name, user?.email)}
      </AvatarFallback>
    </Avatar>
  );
};

export default UserAvatar;
