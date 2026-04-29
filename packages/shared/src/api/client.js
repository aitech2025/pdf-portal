/**
 * Shared API client — works in both browser (web) and React Native (mobile).
 * Mobile calls initApiClient(baseUrl) on app start.
 * Web sets baseUrl = '/api' (proxied by vite/nginx).
 */

let _config = {
  baseUrl: 'http://localhost:8001',
  getToken: () => null,
  setToken: async () => {},
  clearToken: async () => {},
};

export function configureClient(config) {
  _config = { ..._config, ...config };
}

export function getBaseUrl() {
  return _config.baseUrl;
}

export async function apiFetch(path, method = 'GET', body = null, params = null) {
  const token = _config.getToken();

  let url = `${_config.baseUrl}${path}`;
  if (params) {
    const qs = Object.entries(params)
      .filter(([, v]) => v != null && v !== undefined)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    if (qs) url += (url.includes('?') ? '&' : '?') + qs;
  }

  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';

  const res = await fetch(url, {
    method,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({ detail: res.statusText }));

  if (!res.ok) {
    const err = new Error(data.detail || data.message || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }

  // Cache token from login response
  if (data.token) {
    await _config.setToken(data.token);
  }

  return data;
}
