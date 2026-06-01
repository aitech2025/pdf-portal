import { apiFetch } from './client.js';

export const programsApi = {
  listPrograms: () => apiFetch('/api/programs'),
  createProgram: (data) => apiFetch('/api/programs', 'POST', data),
  updateProgram: (id, data) => apiFetch(`/api/programs/${id}`, 'PATCH', data),
  deleteProgram: (id) => apiFetch(`/api/programs/${id}`, 'DELETE'),
};
