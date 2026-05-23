import React, { useState, useEffect } from 'react';
import pb from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Check, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
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
      const res = await pb.collection('notifications').getList(1, 100, {
        sort: '-created',
        $autoCancel: false
      });
      setNotifications(res.items || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) fetchNotifications();

    const unsub = pb.subscribe('notifications', () => {
      fetchNotifications();
    });

    return () => {
      pb.unsubscribe('notifications');
      if (typeof unsub?.then === 'function') unsub.then(() => {});
    };
  }, [currentUser]);

  const markAsRead = async (id) => {
    try {
      await pb.fetch(`/notifications/${id}`, 'PATCH', { read: true });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    try {
      await Promise.all(unread.map((n) => pb.fetch(`/notifications/${n.id}`, 'PATCH', { read: true })));
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  const deleteNotification = async (id) => {
    try {
      await pb.collection('notifications').delete(id, { $autoCancel: false });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success('Notification deleted');
    } catch {
      toast.error('Failed to delete notification');
    }
  };

  const filtered = notifications.filter((n) => {
    if (activeTab === 'unread') return !n.read;
    if (activeTab === 'read') return n.read;
    return true;
  });

  return (
    <PageTransition>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-poppins font-bold">Notifications</h1>
          <p className="text-muted-foreground mt-1">Messages and announcements from the platform</p>
        </div>
        <Button variant="outline" onClick={markAllAsRead} disabled={!notifications.some((n) => !n.read)}>
          <Check className="w-4 h-4 mr-2" /> Mark all read
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
          <TabsTrigger value="unread">Unread ({notifications.filter((n) => !n.read).length})</TabsTrigger>
          <TabsTrigger value="read">Read</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6 space-y-3">
          {loading ? (
            [1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-4 opacity-30" />
                No notifications in this tab.
              </CardContent>
            </Card>
          ) : (
            filtered.map((n) => (
              <Card key={n.id} className={cn(!n.read && 'border-primary/30 bg-primary/5')}>
                <CardContent className="p-4 flex gap-4">
                  <div className="shrink-0 mt-1">
                    {n.read ? (
                      <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold truncate">{n.subject}</p>
                      {!n.read && <Badge className="text-[10px]">New</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {n.created ? new Date(n.created).toLocaleString() : ''}
                      {n.notificationMethod && ` · ${n.notificationMethod}`}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {!n.read && (
                      <Button variant="ghost" size="icon" onClick={() => markAsRead(n.id)} title="Mark read">
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => deleteNotification(n.id)} title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </PageTransition>
  );
};

export default NotificationCenter;
