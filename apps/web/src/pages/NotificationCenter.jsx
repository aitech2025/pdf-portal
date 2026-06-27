import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Check, Trash2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import PageTransition from '@/components/PageTransition.jsx';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/useNotifications.js';

const NotificationCenter = () => {
  const {
    notifications,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState('all');

  const allNotifs   = notifications;
  const unreadNotifs = notifications.filter((n) => !n.read);
  const readNotifs  = notifications.filter((n) => n.read);

  const unreadCount = unreadNotifs.length;

  const renderList = (items) => {
    if (loading) {
      return [1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />);
    }
    if (items.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">
              {notifications.length === 0 ? 'No messages yet.' : 'No messages in this tab.'}
            </p>
          </CardContent>
        </Card>
      );
    }
    return items.map((n) => (
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
              {!n.read && <Badge className="text-[10px] shrink-0">New</Badge>}
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{n.message}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {n.created ? new Date(n.created).toLocaleString() : ''}
              {n.notificationMethod && ` · ${n.notificationMethod}`}
            </p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            {!n.read && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => markAsRead(n.id)}
                title="Mark read"
              >
                <Check className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteNotification(n.id)}
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    ));
  };

  return (
    <PageTransition>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-poppins font-bold">Messages</h1>
          <p className="text-muted-foreground mt-1">Notifications and announcements from the platform</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchNotifications}
            disabled={loading}
            className="shadow-soft-sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button
            variant="outline"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
          >
            <Check className="w-4 h-4 mr-2" /> Mark all read
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({allNotifs.length})</TabsTrigger>
          <TabsTrigger value="unread">
            Unread
            {unreadCount > 0 && (
              <Badge className="ml-1.5 h-4 min-w-[16px] px-1 text-[10px] font-bold bg-destructive text-destructive-foreground">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="read">Read</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6 space-y-3">
          {renderList(allNotifs)}
        </TabsContent>

        <TabsContent value="unread" className="mt-6 space-y-3">
          {renderList(unreadNotifs)}
        </TabsContent>

        <TabsContent value="read" className="mt-6 space-y-3">
          {renderList(readNotifs)}
        </TabsContent>
      </Tabs>
    </PageTransition>
  );
};

export default NotificationCenter;
