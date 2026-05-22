/**
 * Shared API client — works in both browser (web) and React Native (mobile).
 * Mobile calls initApiClient(baseUrl) on app start.
 * Web sets baseUrl = '/api' (proxied by vite/nginx).
 */

let _config = {
  baseUrl: 'http://localhost:8000',
  getToken: () => null,
  getRefreshToken: () => null,
  setToken: async () => { },
  setRefreshToken: async () => { },
  clearToken: async () => { },
  clearRefreshToken: async () => { },
};

export function configureClient(config) {
  _config = { ..._config, ...config };
}

export function getBaseUrl() {
  return _config.baseUrl;
}

export async function apiFetch(path, method = 'GET', body = null, params = null) {
  const request = async (token) => {
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

    if (data.token) await _config.setToken(data.token);
    if (data.refreshToken) await _config.setRefreshToken(data.refreshToken);

    return data;
  };

  const authPath = path.startsWith('/api/auth/');
  const accessToken = _config.getToken();
  try {
    return await request(accessToken);
  } catch (err) {
    if (authPath || err?.status !== 401) throw err;

    const refreshToken = _config.getRefreshToken();
    if (!refreshToken) {
      await _config.clearToken();
      await _config.clearRefreshToken();
      throw err;
    }

    const refreshResponse = await fetch(`${_config.baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!refreshResponse.ok) {
      await _config.clearToken();
      await _config.clearRefreshToken();
      throw err;
    }

    const refreshData = await refreshResponse.json();
    if (refreshData.token) await _config.setToken(refreshData.token);
    if (refreshData.refreshToken) await _config.setRefreshToken(refreshData.refreshToken);

    return request(refreshData.token || _config.getToken());
  }
}
