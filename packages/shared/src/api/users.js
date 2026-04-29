import { apiFetch } from './client.js';

export const usersApi = {
  listUsers: (params) =>
    apiFetch('/api/users', 'GET', null, params),
  getUser: (id) =>
    apiFetch(`/api/users/${id}`),
  createUser: (data) =>
    apiFetch('/api/users', 'POST', data),
  updateUser: (id, data) =>
    apiFetch(`/api/users/${id}`, 'PATCH', data),
  deleteUser: (id) =>
    apiFetch(`/api/users/${id}`, 'DELETE'),
  resetUserPassword: (id, sendVia = 'manual') =>
    apiFetch(`/api/users/${id}/reset-password`, 'POST', { sendVia }),
};
