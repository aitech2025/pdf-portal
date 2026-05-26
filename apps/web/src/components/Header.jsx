import React from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useNavigate, Link } from 'react-router-dom';
import { Menu, Settings, LogOut, User, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

  const handleSignIn = () => navigate('/login');

  const initials =
    (currentUser?.name && currentUser.name.split(' ').map((w) => w[0]).slice(0, 2).join('')) ||
    currentUser?.email?.charAt(0) ||
    'U';

  return (
    <header
      className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-xl border-b border-border/60 supports-[backdrop-filter]:bg-background/60 pt-safe"
      role="banner"
    >
      <div className="flex h-14 md:h-16 items-center gap-3 px-3 md:px-6">
        {/* Mobile menu (drawer) */}
        <div className="flex items-center lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 -ml-2 text-muted-foreground hover:text-foreground active:scale-95"
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-80 max-w-[85vw] border-r border-border">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation Menu</SheetTitle>
              </SheetHeader>
              <Sidebar isMobile />
            </SheetContent>
          </Sheet>

          <Link to="/" className="ml-2 flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow-primary">
              <span className="text-white font-display font-bold text-sm">i</span>
            </div>
            <span className="font-display font-bold text-base tracking-tight hidden xs:inline-block">
              i-icon
            </span>
          </Link>
        </div>

        {/* Desktop global search */}
        <div className="hidden lg:flex items-center gap-2 flex-1 max-w-xl">
          <GlobalSearchBar />
        </div>

        {/* Right cluster — pinned to the far right via ml-auto */}
        <div className="ml-auto flex items-center justify-end gap-1 md:gap-2">
          {/* Mobile search trigger */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-10 w-10 text-muted-foreground hover:text-foreground"
            aria-label="Search"
            onClick={() => navigate('/search')}
          >
            <Search className="h-5 w-5" />
          </Button>

          <NotificationBell />
          <div className="hidden md:block">
            <DarkModeToggle />
          </div>
          <div className="w-px h-6 bg-border/60 mx-1 hidden md:block" />

          {currentUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 md:h-10 md:w-10 rounded-xl border border-border/60 shadow-soft-sm p-0 overflow-hidden hover:ring-2 hover:ring-primary/20 transition-base"
                  aria-label="Account menu"
                >
                  {currentUser.avatar?.startsWith?.('data:') ? (
                    <img src={currentUser.avatar} alt="" className="h-full w-full object-cover" />
                  ) : currentUser.avatar ? (
                    <img
                      src={`/uploads/${currentUser.avatar}`}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-primary/10 flex items-center justify-center text-primary font-display font-semibold text-xs md:text-sm">
                      {initials.toUpperCase()}
                    </div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-64 p-2 rounded-2xl border-border/60 shadow-soft-lg"
                align="end"
                forceMount
              >
                <DropdownMenuLabel className="font-normal p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-display font-semibold shrink-0">
                      {initials.toUpperCase()}
                    </div>
                    <div className="flex flex-col space-y-0.5 min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-none truncate">
                        {currentUser.name || 'User'}
                      </p>
                      <p className="text-xs text-muted-foreground leading-none truncate">
                        {currentUser.email}
                      </p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigate('/profile')}
                  className="cursor-pointer p-3 rounded-md transition-base hover:bg-muted"
                >
                  <User className="mr-3 h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">My Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/settings')}
                  className="cursor-pointer p-3 rounded-md transition-base hover:bg-muted"
                >
                  <Settings className="mr-3 h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="md:hidden" />
                <div className="md:hidden p-1 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground px-2">Theme</span>
                  <DarkModeToggle />
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive cursor-pointer p-3 rounded-md transition-base hover:bg-destructive/10"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  <span className="font-medium">Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={handleSignIn} size="sm" className="font-semibold">
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
