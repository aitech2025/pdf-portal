
import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

const UserSearchAndFilter = ({ 
  searchQuery, 
  setSearchQuery, 
  roleFilter, 
  setRoleFilter, 
  statusFilter, 
  setStatusFilter,
  resultCount
}) => {
  const hasFilters = searchQuery || roleFilter !== 'all' || statusFilter !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setRoleFilter('all');
    setStatusFilter('all');
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-muted/10 p-3 rounded-[var(--radius-md)] border border-border/50">
      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Search users..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-background h-9"
        />
      </div>
      
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[130px] h-9 bg-background">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="school">School Admin</SelectItem>
            <SelectItem value="teacher">Teacher</SelectItem>
            <SelectItem value="student">Student</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-9 bg-background">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="icon" onClick={clearFilters} className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default UserSearchAndFilter;
