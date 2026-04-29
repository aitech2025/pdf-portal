
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit2, Trash2, ShieldOff, ShieldCheck, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const UserListTable = ({ users, loading, onEdit, onDelete, onToggleStatus }) => {
  if (loading) {
    return (
      <div className="border border-border/50 rounded-[var(--radius-md)] overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4].map(i => (
              <TableRow key={i}>
                <TableCell><div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-48" /></div></TableCell>
                <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded-md ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 border border-border/50 border-dashed rounded-[var(--radius-md)] bg-muted/5">
        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
          <Users className="w-6 h-6 text-muted-foreground/50" />
        </div>
        <p className="text-sm font-medium text-foreground">No users found</p>
        <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filters.</p>
      </div>
    );
  }

  return (
    <div className="border border-border/50 rounded-[var(--radius-md)] overflow-hidden bg-card">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map(user => (
            <TableRow key={user.id} className="hover:bg-muted/30 group">
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium text-sm text-foreground">{user.name || 'Unnamed User'}</span>
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize text-[10px] font-semibold tracking-wider bg-background">
                  {user.role}
                </Badge>
              </TableCell>
              <TableCell>
                {user.isActive ? (
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-none hover:bg-emerald-500/20">Active</Badge>
                ) : (
                  <Badge variant="secondary" className="bg-muted text-muted-foreground border-none">Inactive</Badge>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {new Date(user.created).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 transition-opacity">
                      <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => onEdit(user)}>
                      <Edit2 className="w-4 h-4 mr-2" /> Edit User
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onToggleStatus(user)}>
                      {user.isActive ? (
                        <><ShieldOff className="w-4 h-4 mr-2 text-warning" /> Deactivate</>
                      ) : (
                        <><ShieldCheck className="w-4 h-4 mr-2 text-success" /> Activate</>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onDelete(user)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default UserListTable;
