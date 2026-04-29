import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, FileText,
  Settings, ShieldAlert, BarChart3, FolderTree,
  UploadCloud, Database, LogOut, ChevronLeft, ChevronRight,
  UserCog
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useSidebar } from './AppLayout.jsx';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const Sidebar = () => {
  const { currentUser, logout, isPlatform, canWrite } = useAuth();
  const { collapsed, setCollapsed } = useSidebar();
  const location = useLocation();
  const role = currentUser?.role;

  const platformLinks = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
    { name: 'Schools', path: '/admin/schools-and-users', icon: Building2 },
    { name: 'Users', path: '/admin/users', icon: Users },
    { name: 'Categories', path: '/admin/categories-management', icon: FolderTree },
    { name: 'Content Library', path: '/admin/content-dashboard', icon: FileText },
    ...(canWrite ? [
      { name: 'Upload PDFs', path: '/admin/pdf-upload', icon: UploadCloud },
      { name: 'Bulk Create', path: '/admin/bulk-create', icon: UserCog },
    ] : []),
    { name: 'Audit Logs', path: '/admin/audit-logs', icon: Database },
    ...(canWrite ? [{ name: 'Settings', path: '/admin/settings', icon: Settings }] : []),
  ];

  const schoolLinks = [
    { name: 'Dashboard', path: '/school/dashboard', icon: LayoutDashboard },
    { name: 'Portal', path: '/school/portal', icon: FileText },
    ...(canWrite ? [{ name: 'User Requests', path: '/school/user-requests', icon: Users }] : []),
    { name: 'Analytics', path: '/school/analytics', icon: BarChart3 },
    ...(canWrite ? [{ name: 'Settings', path: '/school/settings', icon: Settings }] : []),
  ];

  const links = isPlatform ? platformLinks : schoolLinks;

  const roleLabel = {
    platform_admin: 'Platform Admin', platform_viewer: 'Platform Viewer',
    admin: 'Platform Admin', moderator: 'Moderator',
    school_admin: 'School Admin', school_viewer: 'School Viewer',
    school: 'School Admin', teacher: 'Teacher',
  }[role] || role;

  return (
    <TooltipProvider delayDuration={0}>
      <aside className={cn(
        "bg-card border-r border-border/50 flex flex-col h-full transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}>
        {/* Logo + collapse toggle */}
        <div className={cn(
          "flex items-center border-b border-border/50 shrink-0 h-16",
          collapsed ? "justify-center px-2" : "justify-between px-4"
        )}>
          {!collapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
                <span className="text-primary-foreground font-bold text-sm">E</span>
              </div>
              <span className="font-poppins font-bold text-base tracking-tight text-foreground truncate">EduPortal</span>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">E</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7 text-muted-foreground hover:text-foreground shrink-0", collapsed && "mt-0")}
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        {/* Role badge */}
        {!collapsed && (
          <div className="px-4 py-2 border-b border-border/30">
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {roleLabel}
            </span>
          </div>
        )}

        {/* Nav links */}
        <div className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5 custom-scrollbar">
          {!collapsed && (
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
              {isPlatform ? 'Administration' : 'School'}
            </div>
          )}

          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path ||
              (link.path !== '/admin' && link.path !== '/school/dashboard' && location.pathname.startsWith(link.path));

            const linkEl = (
              <NavLink
                key={link.path}
                to={link.path}
                className={cn(
                  "flex items-center gap-3 px-2 py-2.5 rounded-md text-sm font-medium transition-all duration-150 group",
                  collapsed ? "justify-center" : "",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className={cn("w-5 h-5 shrink-0", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                {!collapsed && <span className="truncate">{link.name}</span>}
              </NavLink>
            );

            if (collapsed) {
              return (
                <Tooltip key={link.path}>
                  <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
                  <TooltipContent side="right">{link.name}</TooltipContent>
                </Tooltip>
              );
            }
            return linkEl;
          })}
        </div>

        {/* Logout */}
        <div className="p-2 border-t border-border/50 shrink-0">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="w-full h-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={logout}>
                  <LogOut className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Logout</TooltipContent>
            </Tooltip>
          ) : (
            <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={logout}>
              <LogOut className="w-5 h-5 mr-3" /> Logout
            </Button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
};

export default Sidebar;
