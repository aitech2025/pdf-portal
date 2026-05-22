import { apiFetch } from './client.js';

export const authApi = {
  login: (email, password) =>
    apiFetch('/api/auth/login', 'POST', { email, password }),
  refresh: (refreshToken) =>
    apiFetch('/api/auth/refresh', 'POST', { refreshToken }),
  logout: (refreshToken) =>
    apiFetch('/api/auth/logout', 'POST', refreshToken ? { refreshToken } : null),
  me: () =>
    apiFetch('/api/auth/me'),
  updateMe: (data) =>
    apiFetch('/api/auth/me', 'PATCH', data),
  changePassword: (oldPassword, newPassword) =>
    apiFetch('/api/auth/change-password', 'POST', { oldPassword, newPassword }),
  forgotPassword: (email) =>
    apiFetch('/api/auth/forgot-password', 'POST', { email }),
  resetPassword: (token, newPassword) =>
    apiFetch('/api/auth/reset-password', 'POST', { token, newPassword }),
  sendVerification: (email) =>
    apiFetch('/api/auth/send-verification', 'POST', { email }),
  verifyEmail: (token) =>
    apiFetch('/api/auth/verify-email', 'POST', { token }),
};
