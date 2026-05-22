
import { useState, useEffect, useCallback } from 'react';
import client from '@/lib/apiClient';
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
      const res = await client.fetch('/notifications', 'GET', null, {
        page: 1,
        per_page: 500,
        filter: `recipientId = "${currentUser.id}"`,
        sort: '-created'
      });
      setNotifications(res.items || res);
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

    // Note: Real-time subscriptions would need WebSocket implementation
    // Removed pb.collection().subscribe() calls as they're PocketBase-specific
  }, [currentUser, fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      await client.fetch(`/notifications/${id}`, 'PATCH', { read: true });
    } catch (err) {
      console.error('Error marking as read:', err);
      // Revert on error
      fetchNotifications();
    }
  };

  const markAsUnread = async (id) => {
    try {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: false } : n));
      await client.fetch(`/notifications/${id}`, 'PATCH', { read: false });
    } catch (err) {
      console.error('Error marking as unread:', err);
      fetchNotifications();
    }
  };

  const deleteNotification = async (id) => {
    try {
      setNotifications(prev => prev.filter(n => n.id !== id));
      await client.fetch(`/notifications/${id}`, 'DELETE');
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
        client.fetch(`/notifications/${n.id}`, 'DELETE').catch(() => null)
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
        client.fetch(`/notifications/${id}`, 'PATCH', { read: true }).catch(() => null)
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
