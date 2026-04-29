
import React from 'react';
import pb from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useNavigate, Link } from 'react-router-dom';
import { Menu, Settings, LogOut, Zap, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import DarkModeToggle from './DarkModeToggle.jsx';
import Sidebar from './Sidebar.jsx';
import GlobalSearchBar from './GlobalSearchBar.jsx';
import NotificationBell from './NotificationBell.jsx';

const Header = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSignIn = () => {
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 flex h-20 w-full items-center justify-between px-6 bg-background/80 backdrop-blur-xl border-b border-border shadow-soft-sm transition-base">
      <div className="flex items-center lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="-ml-2 text-muted-foreground hover:text-foreground">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-80 border-r border-border">
            <SheetHeader className="sr-only"><SheetTitle>Navigation Menu</SheetTitle></SheetHeader>
            <Sidebar isMobile />
          </SheetContent>
        </Sheet>
        <Link to="/" className="ml-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded-[var(--radius-md)] bg-gradient-primary flex items-center justify-center shadow-soft-sm">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="font-poppins font-bold text-lg tracking-tight hidden sm:inline-block">EduPortal</span>
        </Link>
      </div>

      <div className="hidden lg:flex items-center gap-2 flex-1 max-w-xl mx-8">
        <GlobalSearchBar />
      </div>

      <div className="flex items-center justify-end space-x-2 sm:space-x-4 ml-auto">
        <NotificationBell />

        <DarkModeToggle />

        <div className="w-px h-6 bg-border mx-1 hidden sm:block"></div>

        {currentUser ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-[var(--radius-md)] border border-border shadow-soft-sm p-0 overflow-hidden hover:ring-2 hover:ring-primary/20 transition-base">
                {currentUser.avatar ? (
                  <img src={`/uploads/${currentUser.avatar}`} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-primary/10 flex items-center justify-center text-primary font-poppins font-medium">
                    {currentUser.name?.charAt(0) || currentUser.email?.charAt(0) || 'U'}
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 p-2 rounded-[var(--radius-lg)] border-border/60 shadow-soft-lg" align="end" forceMount>
              <DropdownMenuLabel className="font-normal p-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-[var(--radius-md)] bg-primary/10 flex items-center justify-center text-primary font-poppins font-medium shrink-0">
                    {currentUser.name?.charAt(0) || currentUser.email?.charAt(0) || 'U'}
                  </div>
                  <div className="flex flex-col space-y-0.5 min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-none truncate">{currentUser.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground leading-none truncate">{currentUser.email}</p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer p-3 rounded-md transition-base hover:bg-muted">
                <User className="mr-3 h-4 w-4 text-muted-foreground" />
                <span className="font-medium">My Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer p-3 rounded-md transition-base hover:bg-muted">
                <Settings className="mr-3 h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer p-3 rounded-md transition-base hover:bg-destructive/10">
                <LogOut className="mr-3 h-4 w-4" />
                <span className="font-medium">Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            onClick={handleSignIn}
            size="md"
            className="bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 shadow-soft-md transition-all duration-200 font-semibold px-6"
            aria-label="Sign in to your account"
          >
            Sign In
          </Button>
        )}
      </div>
    </header>
  );
};

export default Header;
