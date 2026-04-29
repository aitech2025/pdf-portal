
import { useState, useEffect, useCallback } from 'react';
import pb from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { toast } from 'sonner';

export const useNotifications = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNotifications = useCallback(async () => {
    if (!currentUser) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const res = await pb.collection('notifications').getList(1, 500, {
        filter: `recipientId = "${currentUser.id}"`,
        sort: '-created',
        $autoCancel: false
      });
      setNotifications(res.items);
      setError(null);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchNotifications();

    if (currentUser) {
      // Subscribe to real-time updates
      pb.collection('notifications').subscribe('*', function (e) {
        if (e.record.recipientId !== currentUser.id) return;

        if (e.action === 'create') {
          setNotifications(prev => [e.record, ...prev]);
          toast.info(e.record.subject, { description: e.record.message });
        } else if (e.action === 'update') {
          setNotifications(prev => prev.map(n => n.id === e.record.id ? e.record : n));
        } else if (e.action === 'delete') {
          setNotifications(prev => prev.filter(n => n.id !== e.record.id));
        }
      });

      return () => {
        pb.collection('notifications').unsubscribe('*');
      };
    }
  }, [currentUser, fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      await pb.collection('notifications').update(id, { read: true }, { $autoCancel: false });
    } catch (err) {
      console.error('Error marking as read:', err);
      // Revert on error
      fetchNotifications();
    }
  };

  const markAsUnread = async (id) => {
    try {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: false } : n));
      await pb.collection('notifications').update(id, { read: false }, { $autoCancel: false });
    } catch (err) {
      console.error('Error marking as unread:', err);
      fetchNotifications();
    }
  };

  const deleteNotification = async (id) => {
    try {
      setNotifications(prev => prev.filter(n => n.id !== id));
      await pb.collection('notifications').delete(id, { $autoCancel: false });
      toast.success('Notification deleted');
    } catch (err) {
      console.error('Error deleting notification:', err);
      toast.error('Failed to delete notification');
      fetchNotifications();
    }
  };

  const clearAllNotifications = async () => {
    try {
      setLoading(true);
      // Delete in batches or one by one
      const deletePromises = notifications.map(n => 
        pb.collection('notifications').delete(n.id, { $autoCancel: false }).catch(() => null)
      );
      await Promise.all(deletePromises);
      setNotifications([]);
      toast.success('All notifications cleared');
    } catch (err) {
      console.error('Error clearing notifications:', err);
      toast.error('Failed to clear some notifications');
      fetchNotifications();
    } finally {
      setLoading(false);
    }
  };
  
  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      if (unreadIds.length === 0) return;
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      
      const updatePromises = unreadIds.map(id => 
        pb.collection('notifications').update(id, { read: true }, { $autoCancel: false }).catch(() => null)
      );
      await Promise.all(updatePromises);
      toast.success('All marked as read');
    } catch (err) {
      console.error('Error marking all as read:', err);
      fetchNotifications();
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAsUnread,
    deleteNotification,
    clearAllNotifications,
    markAllAsRead
  };
};
