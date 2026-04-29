
import React, { useState, useEffect } from 'react';
import { Bell, Check, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import pb from '@/lib/apiClient';
import { useNotifications } from '@/hooks/useNotifications.js';
import { useNotificationNavigation } from '@/hooks/useNotificationNavigation.js';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const NotificationBell = () => {
  const navigate = useNavigate();
  const { unreadCount, loading: countLoading } = useNotifications();
  const { handleNotificationClick } = useNotificationNavigation();
  const [isOpen, setIsOpen] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchRecent();
    }
  }, [isOpen]);

  const fetchRecent = async () => {
    setLoading(true);
    try {
      const res = await pb.collection('notifications').getList(1, 10, {
        sort: '-created',
        filter: `recipientId = "${pb.authStore.model?.id}" || recipientId = ""`,
        $autoCancel: false
      });
      setRecentNotifications(res.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const onNotificationClick = async (notif) => {
    setIsOpen(false);
    await handleNotificationClick(notif, navigate);
    fetchRecent();
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/50 transition-colors focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={`View Notifications (${unreadCount} unread)`}
        >
          <Bell className="h-5 w-5" />
          <AnimatePresence>
            {!countLoading && unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 border-2 border-background"
              >
                <span className="text-[10px] font-bold text-destructive-foreground leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 shadow-soft-xl border-border/50 rounded-xl overflow-hidden" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/20">
          <h4 className="font-semibold text-sm">Notifications</h4>
          <Button variant="ghost" size="sm" className="h-auto py-1 text-xs text-primary" onClick={() => navigate('/admin/notifications')}>
            View All
          </Button>
        </div>
        
        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted animate-pulse shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
                    <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <div className="w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center mb-3">
                <Check className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">You're all caught up!</p>
              <p className="text-xs text-muted-foreground mt-1">No new notifications.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {recentNotifications.map(notif => (
                <div 
                  key={notif.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onNotificationClick(notif)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNotificationClick(notif); } }}
                  className={cn(
                    "flex gap-3 px-4 py-3 border-b border-border/50 last:border-0 cursor-pointer transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none",
                    !notif.read && "bg-primary/5"
                  )}
                >
                  <div className="mt-0.5 relative shrink-0">
                    <div className={cn(
                      "w-2 h-2 rounded-full absolute -top-1 -right-1",
                      !notif.read ? "bg-primary" : "hidden"
                    )} />
                    <div className="w-8 h-8 rounded-full bg-background border flex items-center justify-center shadow-sm">
                      <Bell className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm truncate", !notif.read ? "font-semibold text-foreground" : "font-medium text-foreground/90")}>
                      {notif.subject}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDistanceToNow(new Date(notif.created), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
