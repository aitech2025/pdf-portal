import { apiFetch } from './client.js';

export const requestsApi = {
  // Onboarding Requests (school registration)
  listOnboardingRequests: (params) =>
    apiFetch('/api/onboardingRequests', 'GET', null, params),
  createOnboardingRequest: (data) =>
    apiFetch('/api/onboardingRequests', 'POST', data),
  updateOnboardingRequest: (id, data) =>
    apiFetch(`/api/onboardingRequests/${id}`, 'PATCH', data),
  approveOnboardingRequest: (id) =>
    apiFetch(`/api/onboardingRequests/${id}`, 'PATCH', { status: 'approved' }),
  rejectOnboardingRequest: (id, reason) =>
    apiFetch(`/api/onboardingRequests/${id}`, 'PATCH', { status: 'rejected', rejectionReason: reason }),

  // User Requests (school requests a new user)
  listUserRequests: (params) =>
    apiFetch('/api/userRequests', 'GET', null, params),
  createUserRequest: (data) =>
    apiFetch('/api/userRequests', 'POST', data),
  updateUserRequest: (id, data) =>
    apiFetch(`/api/userRequests/${id}`, 'PATCH', data),
  approveUserRequest: (id) =>
    apiFetch(`/api/userRequests/${id}`, 'PATCH', { status: 'approved' }),
  rejectUserRequest: (id, reason) =>
    apiFetch(`/api/userRequests/${id}`, 'PATCH', { status: 'rejected', rejectionReason: reason }),
};
