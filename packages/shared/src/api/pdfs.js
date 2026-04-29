import { apiFetch } from './client.js';

export const pdfsApi = {
  listPdfs: (params) =>
    apiFetch('/api/pdfs', 'GET', null, params),
  getPdf: (id) =>
    apiFetch(`/api/pdfs/${id}`),
  updatePdf: (id, data) =>
    apiFetch(`/api/pdfs/${id}`, 'PATCH', data),
  deletePdf: (id) =>
    apiFetch(`/api/pdfs/${id}`, 'DELETE'),
  approvePdf: (id) =>
    apiFetch(`/api/pdfs/${id}`, 'PATCH', { status: 'approved', isActive: true }),
  rejectPdf: (id, reason) =>
    apiFetch(`/api/pdfs/${id}`, 'PATCH', { status: 'rejected', rejectionReason: reason }),
};
