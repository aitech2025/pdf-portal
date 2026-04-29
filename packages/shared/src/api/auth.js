import { apiFetch } from './client.js';

export const authApi = {
  login: (email, password) =>
    apiFetch('/api/auth/login', 'POST', { email, password }),
  logout: () =>
    apiFetch('/api/auth/logout', 'POST'),
  me: () =>
    apiFetch('/api/auth/me'),
  updateMe: (data) =>
    apiFetch('/api/auth/me', 'PATCH', data),
  changePassword: (oldPassword, newPassword) =>
    apiFetch('/api/auth/change-password', 'POST', { oldPassword, newPassword }),
};
