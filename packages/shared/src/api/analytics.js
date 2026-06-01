import { apiFetch } from './client.js';

export const analyticsApi = {
  getDashboard: () =>
    apiFetch('/api/analytics/dashboard'),
  getOverview: () =>
    apiFetch('/api/analytics/analytics/overview'),
};
