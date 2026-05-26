import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Bell,
  Bookmark,
  BarChart3,
  Users,
  Building2,
  FileText,
  FolderTree,
  UserCog,
  Settings,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { cn } from '@/lib/utils';

/**
 * Mobile-only bottom navigation. Hidden ≥ lg breakpoint where the Sidebar is visible.
 * Renders ≤ 5 destinations to keep iOS-style ergonomics.
 */
const BottomNav = () => {
  const { currentUser, isPlatform } = useAuth();
  const location = useLocation();
  if (!currentUser) return null;

  const platformLinks = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Schools', path: '/admin/schools-and-users', icon: Building2 },
    { name: 'Library', path: '/admin/content-dashboard', icon: FileText },
    { name: 'Categories', path: '/admin/categories-management', icon: FolderTree },
    { name: 'More', path: '/admin/settings', icon: Settings },
  ];

  const schoolLinks = [
    { name: 'Home', path: '/school/dashboard', icon: LayoutDashboard },
    { name: 'Library', path: '/school/portal/browse', icon: BookOpen },
    { name: 'Saved', path: '/school/bookmarks', icon: Bookmark },
    { name: 'Messages', path: '/notifications', icon: Bell },
    { name: 'Stats', path: '/school/analytics', icon: BarChart3 },
  ];

  const links = isPlatform ? platformLinks : schoolLinks;

  const isActive = (path) => {
    if (path === '/admin' || path === '/school/dashboard') {
      return location.pathname === path;
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border/60 bg-card/90 backdrop-blur-xl pb-safe"
      aria-label="Primary"
    >
      <ul className="grid grid-cols-5 h-[var(--mobile-bottomnav-h)] px-1">
        {links.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.path);
          return (
            <li key={link.path} className="flex">
              <NavLink
                to={link.path}
                className={cn(
                  'group flex flex-col items-center justify-center gap-0.5 flex-1 mx-0.5 my-1.5 rounded-xl text-[10.5px] font-medium transition-base',
                  active
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 active:scale-95'
                )}
              >
                <Icon
                  className={cn(
                    'h-5 w-5 transition-transform',
                    active ? 'text-primary scale-110' : 'text-muted-foreground group-hover:text-foreground'
                  )}
                  aria-hidden="true"
                />
                <span className="truncate max-w-[58px]">{link.name}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default BottomNav;
