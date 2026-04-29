import { apiFetch } from './client.js';

export const schoolsApi = {
  listSchools: (params) =>
    apiFetch('/api/schools', 'GET', null, params),
  getSchool: (id) =>
    apiFetch(`/api/schools/${id}`),
  createSchool: (data) =>
    apiFetch('/api/schools', 'POST', data),
  updateSchool: (id, data) =>
    apiFetch(`/api/schools/${id}`, 'PATCH', data),
  deleteSchool: (id) =>
    apiFetch(`/api/schools/${id}`, 'DELETE'),
  getSchoolStats: (id) =>
    apiFetch(`/api/schools/${id}/stats`),
  toggleSchoolUsers: (id, isActive) =>
    apiFetch(`/api/schools/${id}/toggle-users`, 'POST', { isActive }),
};
