import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  Settings,
  BarChart3,
  FolderTree,
  UploadCloud,
  Database,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Layers,
  MessageSquare,
  UserCog,
  BookOpen,
  Bookmark,
  Bell,
  Video,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useSidebar } from './AppLayout.jsx';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const Sidebar = ({ isMobile = false }) => {
  const { currentUser, logout, isPlatform, canWrite } = useAuth();
  const sidebar = useSidebar();
  const collapsed = isMobile ? false : sidebar.collapsed;
  const setCollapsed = isMobile ? () => {} : sidebar.setCollapsed;
  const location = useLocation();
  const role = currentUser?.role;

  const platformLinks = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
    { name: 'Schools', path: '/admin/schools-and-users', icon: Building2 },
    { name: 'Users', path: '/admin/users', icon: Users },
    { name: 'Programs', path: '/admin/categories-management', icon: Layers },
    { name: 'Classes', path: '/admin/classes', icon: GraduationCap },
    { name: 'Subjects', path: '/admin/subjects', icon: BookOpen },
    { name: 'Video Repository', path: '/admin/video-lessons', icon: Video },
    { name: 'Content Library', path: '/admin/content-dashboard', icon: FileText },
    ...(canWrite
      ? [
          { name: 'Upload PDFs', path: '/admin/pdf-upload', icon: UploadCloud },
          { name: 'Bulk Create', path: '/admin/bulk-create', icon: UserCog },
          { name: 'Broadcast', path: '/admin/broadcast', icon: MessageSquare },
        ]
      : []),
    { name: 'Audit Logs', path: '/admin/audit-logs', icon: Database },
    ...(canWrite ? [{ name: 'Settings', path: '/admin/settings', icon: Settings }] : []),
  ];

  const schoolLinks = [
    { name: 'Dashboard', path: '/school/dashboard', icon: LayoutDashboard },
    { name: 'Content Library', path: '/school/portal/browse', icon: BookOpen },
    { name: 'Video Lessons', path: '/school/video-lessons', icon: Video },
    { name: 'Bookmarks', path: '/school/bookmarks', icon: Bookmark },
    { name: 'Messages', path: '/notifications', icon: Bell },
    { name: 'Analytics', path: '/school/analytics', icon: BarChart3 },
    ...(canWrite ? [{ name: 'Settings', path: '/school/settings', icon: Settings }] : []),
  ];

  const links = isPlatform ? platformLinks : schoolLinks;

  const roleLabel = {
    platform_admin: 'Platform Admin',
    platform_viewer: 'Platform Viewer',
    admin: 'Platform Admin',
    moderator: 'Moderator',
    school_admin: 'School Admin',
    school_viewer: 'School Viewer',
    school: 'School Admin',
    teacher: 'Teacher',
  }[role] || role;

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'bg-card/95 backdrop-blur border-r border-border/60 flex flex-col h-full transition-all duration-300 pt-safe',
          collapsed ? 'w-16' : 'w-64'
        )}
        aria-label="Sidebar"
      >
        {/* Brand */}
        <div
          className={cn(
            'flex items-center border-b border-border/40 shrink-0 h-16',
            collapsed ? 'justify-center px-2' : 'justify-between px-4'
          )}
        >
          {!collapsed ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow-primary shrink-0">
                <span className="text-white font-display font-bold text-base">i</span>
              </div>
              <div className="min-w-0">
                <p className="font-display font-bold text-[15px] tracking-tight text-foreground truncate leading-none">
                  i-icon academy
                </p>
                <p className="text-[10.5px] text-muted-foreground font-medium mt-1 truncate">EduShare Platform</p>
              </div>
            </div>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow-primary">
              <span className="text-white font-display font-bold text-base">i</span>
            </div>
          )}
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-7 w-7 text-muted-foreground hover:text-foreground shrink-0',
                collapsed && 'mt-0'
              )}
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
          )}
        </div>

        {/* Role badge */}
        {!collapsed && (
          <div className="px-4 py-3 border-b border-border/30">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground bg-muted/70 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              {roleLabel}
            </span>
          </div>
        )}

        {/* Nav */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 no-scrollbar">
          {!collapsed && (
            <div className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
              {isPlatform ? 'Administration' : 'School'}
            </div>
          )}

          {links.map((link) => {
            const Icon = link.icon;
            const isActive =
              location.pathname === link.path ||
              (link.path !== '/admin' &&
                link.path !== '/school/dashboard' &&
                location.pathname.startsWith(`${link.path}/`));

            const linkEl = (
              <NavLink
                key={link.path}
                to={link.path}
                className={cn(
                  'group relative flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-medium transition-base focus-ring',
                  collapsed ? 'justify-center' : '',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {isActive && !collapsed && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary" />
                )}
                <Icon
                  className={cn(
                    'w-5 h-5 shrink-0',
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground group-hover:text-foreground'
                  )}
                />
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
        <div className="p-2 border-t border-border/40 shrink-0 pb-safe">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-full h-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={logout}
                  aria-label="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Logout</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={logout}
            >
              <LogOut className="w-5 h-5 mr-3" /> Logout
            </Button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
};

export default Sidebar;
