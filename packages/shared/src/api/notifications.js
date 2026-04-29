import { apiFetch } from './client.js';

export const notificationsApi = {
  listNotifications: (params) =>
    apiFetch('/api/notifications', 'GET', null, params),
  markRead: (id) =>
    apiFetch(`/api/notifications/${id}`, 'PATCH', { read: true }),
  markAllRead: async () => {
    const res = await apiFetch('/api/notifications', 'GET', null, { per_page: 500 });
    const unread = (res.items || []).filter(n => !n.read);
    await Promise.all(unread.map(n => apiFetch(`/api/notifications/${n.id}`, 'PATCH', { read: true })));
    return { updated: unread.length };
  },
  deleteNotification: (id) =>
    apiFetch(`/api/notifications/${id}`, 'DELETE'),
};
