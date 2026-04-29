
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications.js';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Bell, Check, Trash2, Search, MailOpen, Mail, AlertTriangle, 
  Info, CheckCircle2, ShieldAlert, XCircle, ArrowRight
} from 'lucide-react';
import PageTransition from '@/components/PageTransition.jsx';
import ConfirmationModal from '@/components/ConfirmationModal.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const getNotificationConfig = (type) => {
  const configs = {
    onboarding_submission: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Info' },
    onboarding_approval: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Success' },
    onboarding_rejection: { icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-500/10', label: 'Error' },
    user_request_submission: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Info' },
    user_request_approval: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Success' },
    user_request_rejection: { icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-500/10', label: 'Error' },
    password_reset: { icon: ShieldAlert, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Warning' },
    school_deactivation: { icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-500/10', label: 'Error' },
  };
  return configs[type] || { icon: Bell, color: 'text-primary', bg: 'bg-primary/10', label: 'Notification' };
};

const getNavigationPath = (type) => {
  switch (type) {
    case 'onboarding_submission':
    case 'onboarding_approval':
    case 'onboarding_rejection':
    case 'school_deactivation':
      return '/admin/schools-and-users';
    case 'user_request_submission':
    case 'user_request_approval':
    case 'user_request_rejection':
      return '/admin/users';
    default:
      return null;
  }
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { 
    notifications, loading, markAsRead, markAsUnread, 
    deleteNotification, clearAllNotifications, markAllAsRead 
  } = useNotifications();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState('all');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const filteredNotifications = useMemo(() => {
    return notifications
      .filter(n => {
        if (filterTab === 'unread') return !n.read;
        if (filterTab === 'read') return n.read;
        return true; // 'all'
      })
      .filter(n => 
        n.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.message.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [notifications, filterTab, searchTerm]);

  const handleNotificationClick = (notif) => {
    if (!notif.read) {
      markAsRead(notif.id);
    }
    const path = getNavigationPath(notif.type);
    if (path) {
      navigate(path);
    }
  };

  return (
    <PageTransition className="max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-poppins font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground mt-1">Stay updated with system activities and requests.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={markAllAsRead} className="shadow-soft-sm bg-card hover:bg-muted/50">
            <Check className="w-4 h-4 mr-2 text-primary" /> Mark all read
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setDeleteModalOpen(true)}
            className="shadow-soft-sm bg-card text-destructive hover:bg-destructive/10 hover:text-destructive border-transparent hover:border-destructive/30"
            disabled={notifications.length === 0}
          >
            <Trash2 className="w-4 h-4 mr-2" /> Clear all
          </Button>
        </div>
      </div>

      <Card className="shadow-soft-md border-border/50 bg-card overflow-hidden">
        <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/10">
          <Tabs value={filterTab} onValueChange={setFilterTab} className="w-full sm:w-auto">
            <TabsList className="bg-background border border-border/50 shadow-sm w-full sm:w-auto">
              <TabsTrigger value="all" className="flex-1 sm:flex-none px-4">All</TabsTrigger>
              <TabsTrigger value="unread" className="flex-1 sm:flex-none px-4">
                Unread {notifications.filter(n => !n.read).length > 0 && `(${notifications.filter(n => !n.read).length})`}
              </TabsTrigger>
              <TabsTrigger value="read" className="flex-1 sm:flex-none px-4">Read</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search notifications..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
        </div>

        <CardContent className="p-0 min-h-[400px]">
          {loading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex gap-4 items-start p-2">
                  <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-center p-6">
              <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">No notifications found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? "Try adjusting your search terms." : "You're all caught up! No new notifications."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              <AnimatePresence initial={false}>
                {filteredNotifications.map((notif) => {
                  const config = getNotificationConfig(notif.type);
                  const Icon = config.icon;
                  const hasLink = !!getNavigationPath(notif.type);

                  return (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={cn(
                        "group relative flex flex-col sm:flex-row gap-4 p-4 sm:p-5 transition-colors hover:bg-muted/30",
                        !notif.read ? "bg-primary/[0.02]" : ""
                      )}
                    >
                      {/* Unread indicator bar */}
                      {!notif.read && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                      )}

                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-1", config.bg, config.color)}>
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="flex-1 min-w-0 pr-10 sm:pr-24">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h4 className={cn(
                            "text-base font-semibold truncate",
                            !notif.read ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {notif.subject}
                          </h4>
                          <Badge variant="outline" className={cn("text-[10px] uppercase font-bold border-none", config.bg, config.color)}>
                            {config.label}
                          </Badge>
                        </div>
                        <p className={cn(
                          "text-sm mb-2",
                          !notif.read ? "text-foreground/90" : "text-muted-foreground"
                        )}>
                          {notif.message}
                        </p>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <span>{formatDistanceToNow(new Date(notif.created), { addSuffix: true })}</span>
                          {hasLink && (
                            <>
                              <span className="mx-2">•</span>
                              <button 
                                onClick={() => handleNotificationClick(notif)}
                                className="text-primary hover:underline inline-flex items-center"
                              >
                                View details <ArrowRight className="w-3 h-3 ml-1" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="absolute right-4 top-4 sm:top-1/2 sm:-translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => notif.read ? markAsUnread(notif.id) : markAsRead(notif.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          title={notif.read ? "Mark as unread" : "Mark as read"}
                        >
                          {notif.read ? <Mail className="w-4 h-4" /> : <MailOpen className="w-4 h-4" />}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => deleteNotification(notif.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Delete notification"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmationModal 
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={() => {
          clearAllNotifications();
          setDeleteModalOpen(false);
        }}
        title="Clear All Notifications"
        description="Are you sure you want to permanently delete all your notifications? This action cannot be undone."
        confirmText="Clear All"
        isDestructive={true}
      />
    </PageTransition>
  );
};

export default NotificationsPage;
