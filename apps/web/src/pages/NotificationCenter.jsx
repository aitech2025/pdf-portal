
import React, { useState, useEffect } from 'react';
import pb from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Check, Trash2, CheckCircle2, AlertCircle, UploadCloud, Users } from 'lucide-react';
import { toast } from 'sonner';
import PageTransition from '@/components/PageTransition.jsx';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const NotificationCenter = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  const fetchNotifications = async () => {
    try {
      const res = await pb.collection('notifications').getList(1, 50, {
        filter: `recipientId = "${currentUser.id}"`,
        sort: '-created',
        $autoCancel: false
      });
      setNotifications(res.items);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) fetchNotifications();

    pb.collection('notifications').subscribe('*', (e) => {
      if (e.record.recipientId === currentUser.id) {
        fetchNotifications();
      }
    });

    return () => pb.collection('notifications').unsubscribe('*');
  }, [currentUser]);

  const markAsRead = async (id) => {
    try {
      await pb.collection('notifications').update(id, { status: 'sent' }, { $autoCancel: false });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'sent' } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => n.status === 'pending');
    if (unread.length === 0) return;

    try {
      await Promise.all(unread.map(n => pb.collection('notifications').update(n.id, { status: 'sent' }, { $autoCancel: false })));
      setNotifications(prev => prev.map(n => ({ ...n, status: 'sent' })));
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error('Failed to mark all as read');
    }
  };

  const deleteNotification = async (id) => {
    try {
      await pb.collection('notifications').delete(id, { $autoCancel: false });
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Notification deleted');
    } catch (err) {
      toast.error('Failed to delete notification');
    }
  };

  const getIconForType = (type) => {
    if (type.includes('approval')) return <CheckCircle2 className="w-5 h-5 text-success" />;
    if (type.includes('request') || type.includes('onboarding')) return <Users className="w-5 h-5 text-primary" />;
    if (type.includes('rejection') || type.includes('deactivation')) return <AlertCircle className="w-5 h-5 text-destructive" />;
    return <Bell className="w-5 h-5 text-secondary" />;
  };

  const filteredNotifs = notifications.filter(n => {
    if (activeTab === 'unread') return n.status === 'pending';
    return true;
  });

  return (
    <PageTransition>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-poppins font-bold text-foreground">Notification Center</h1>
          <p className="text-muted-foreground mt-1">Stay updated on important platform activity.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={markAllAsRead} className="shadow-soft-sm bg-card">
            <Check className="w-4 h-4 mr-2" /> Mark All Read
          </Button>
          <Button variant="outline" className="shadow-soft-sm bg-card">
            <Bell className="w-4 h-4 mr-2" /> Preferences
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-4xl mx-auto">
        <TabsList className="mb-6">
          <TabsTrigger value="all">All Notifications</TabsTrigger>
          <TabsTrigger value="unread">
            Unread
            {notifications.filter(n => n.status === 'pending').length > 0 && (
              <Badge variant="destructive" className="ml-2 py-0 px-1.5 h-4 text-[10px]">
                {notifications.filter(n => n.status === 'pending').length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <Card className="shadow-soft-md border-border/50 bg-card overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full rounded-[var(--radius-md)]" />)}
              </div>
            ) : filteredNotifs.length === 0 ? (
              <div className="py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Bell className="w-8 h-8 text-muted-foreground opacity-50" />
                </div>
                <h3 className="text-lg font-poppins font-semibold text-foreground mb-1">No notifications</h3>
                <p className="text-muted-foreground text-sm">You don't have any notifications right now.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {filteredNotifs.map(notif => (
                  <div 
                    key={notif.id} 
                    className={cn(
                      "p-4 sm:p-6 flex items-start gap-4 transition-base hover:bg-muted/30 group",
                      notif.status === 'pending' ? "bg-primary/5" : ""
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                      notif.status === 'pending' ? "bg-background shadow-soft-sm" : "bg-muted"
                    )}>
                      {getIconForType(notif.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-1">
                        <h4 className={cn("text-base font-semibold", notif.status === 'pending' ? "text-foreground" : "text-muted-foreground")}>
                          {notif.subject}
                        </h4>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(notif.created).toLocaleDateString()}
                        </span>
                      </div>
                      <p className={cn("text-sm mb-3", notif.status === 'pending' ? "text-foreground/90" : "text-muted-foreground/80")}>
                        {notif.message}
                      </p>
                      
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {notif.status === 'pending' && (
                          <Button variant="ghost" size="sm" onClick={() => markAsRead(notif.id)} className="h-8 text-xs font-medium text-primary hover:bg-primary/10">
                            Mark as read
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => deleteNotification(notif.id)} className="h-8 text-xs font-medium text-destructive hover:bg-destructive/10">
                          Delete
                        </Button>
                      </div>
                    </div>
                    
                    {notif.status === 'pending' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-2"></div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </Tabs>
    </PageTransition>
  );
};

export default NotificationCenter;
