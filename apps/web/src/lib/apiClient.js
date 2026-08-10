/**
 * REST API client for the i-icon academy backend.
 * All requests go to the Fastify backend (apps/api-node) at /api/*.
 */

const API_BASE = "/api";

export class ApiError extends Error {
    constructor(status, message, data) {
        super(message);
        this.status = status;
        this.data = data;
    }
}

// ---------------------------------------------------------------------------
// Auth store — persists JWT + user model in localStorage
// ---------------------------------------------------------------------------
class AuthStore {
    constructor() {
        this._token = localStorage.getItem("auth_token") || "";
        this._refreshToken = localStorage.getItem("auth_refresh_token") || "";
        this._model = JSON.parse(localStorage.getItem("auth_model") || "null");
        this._listeners = [];
    }

    get token() { return this._token; }
    get refreshToken() { return this._refreshToken; }
    get model() { return this._model; }
    get isValid() { return !!this._token; }

    save(token, model, refreshToken = this._refreshToken) {
        this._token = token;
        this._refreshToken = refreshToken || "";
        this._model = model;
        localStorage.setItem("auth_token", token);
        if (this._refreshToken) {
            localStorage.setItem("auth_refresh_token", this._refreshToken);
        } else {
            localStorage.removeItem("auth_refresh_token");
        }
        localStorage.setItem("auth_model", JSON.stringify(model));
        this._listeners.forEach(fn => fn(token, model, this._refreshToken));
    }

    clear() {
        this._token = "";
        this._refreshToken = "";
        this._model = null;
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_refresh_token");
        localStorage.removeItem("auth_model");
        this._listeners.forEach(fn => fn("", null, ""));
    }

    onChange(callback) {
        this._listeners.push(callback);
        return () => {
            this._listeners = this._listeners.filter(fn => fn !== callback);
        };
    }
}

// ---------------------------------------------------------------------------
// Core fetch helper
// ---------------------------------------------------------------------------
export async function apiFetch(path, method = "GET", body = null, params = null, token = "") {
    const url = new URL(`${API_BASE}${path}`, location.origin);
    if (params) {
        Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null && !k.startsWith("$")) {
                url.searchParams.set(k, String(v));
            }
        });
    }

    const headers = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (body && !(body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    const res = await fetch(url.toString(), {
        method,
        headers,
        body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new ApiError(res.status, err.detail || err.message || "Request failed", err);
    }

    if (res.status === 204) return null;
    return res.json();
}

// ---------------------------------------------------------------------------
// Realtime service — WebSocket-based notifications
// ---------------------------------------------------------------------------
class RealtimeService {
    constructor(authStore) {
        this._authStore = authStore;
        this._ws = null;
        this._subscriptions = {};
        this._reconnectTimer = null;
        this._reconnectAttempts = 0;
        this._maxReconnectAttempts = 3;
        this._isConnecting = false;
        this._connect();
    }

    _connect() {
        if (!this._authStore.token || this._isConnecting) return;
        if (this._reconnectAttempts >= this._maxReconnectAttempts) {
            console.warn('WebSocket: Max reconnection attempts reached. Real-time updates disabled.');
            return;
        }

        this._isConnecting = true;
        const proto = location.protocol === "https:" ? "wss" : "ws";
        const url = `${proto}://${location.host}/api/notifications/ws?token=${this._authStore.token}`;

        try {
            this._ws = new WebSocket(url);

            this._ws.onopen = () => {
                this._reconnectAttempts = 0;
                this._isConnecting = false;
                console.log('WebSocket: Connected successfully');
            };

            this._ws.onmessage = (e) => {
                try {
                    const { event, data } = JSON.parse(e.data);
                    const collection = event.split(":")[0];
                    const action = event.split(":")[1] || "update";
                    const handlers = [
                        ...(this._subscriptions[collection] || []),
                        ...(this._subscriptions["*"] || []),
                    ];
                    handlers.forEach(cb => cb({ action, record: data }));
                } catch { }
            };

            this._ws.onerror = (error) => {
                this._isConnecting = false;
                // Silently handle WebSocket errors - they're not critical
            };

            this._ws.onclose = () => {
                this._isConnecting = false;
                this._reconnectAttempts++;
                clearTimeout(this._reconnectTimer);

                if (this._reconnectAttempts < this._maxReconnectAttempts) {
                    const delay = Math.min(1000 * Math.pow(2, this._reconnectAttempts), 10000);
                    this._reconnectTimer = setTimeout(() => this._connect(), delay);
                }
            };
        } catch (error) {
            this._isConnecting = false;
            console.warn('WebSocket: Connection failed. Real-time updates disabled.');
        }
    }

    subscribe(collection, callback) {
        if (!this._subscriptions[collection]) this._subscriptions[collection] = [];
        this._subscriptions[collection].push(callback);
        return Promise.resolve();
    }

    unsubscribe(collection) {
        delete this._subscriptions[collection];
        return Promise.resolve();
    }
}

// ---------------------------------------------------------------------------
// Main client
// ---------------------------------------------------------------------------
class ApiClient {
    constructor() {
        this.authStore = new AuthStore();
        this._realtime = new RealtimeService(this.authStore);
        this._refreshPromise = null;
    }

    get token() { return this.authStore.token; }

    /** Fetch PDF bytes with auth (for preview/download in viewers). */
    async fetchPdfBlob(pdfId, { preview = false } = {}) {
        const path = preview ? `/pdfs/${pdfId}/preview` : `/pdfs/${pdfId}/download`;
        const url = new URL(`${API_BASE}${path}`, location.origin);
        const res = await fetch(url.toString(), {
            method: "GET",
            headers: this.authStore.token ? { Authorization: `Bearer ${this.authStore.token}` } : {},
        });
        if (res.status === 401 && this.authStore.refreshToken) {
            const refreshed = await this.refreshToken();
            if (refreshed) {
                return this.fetchPdfBlob(pdfId, { preview });
            }
        }
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: res.statusText }));
            throw new ApiError(res.status, err.detail || "Failed to load PDF", err);
        }
        return res.blob();
    }

    /** Create an object URL for react-pdf; caller must revoke when done. */
    async createPdfObjectUrl(pdfId, preview = true) {
        const blob = await this.fetchPdfBlob(pdfId, { preview });
        return URL.createObjectURL(blob);
    }

    async fetchPdfVersionBlob(versionId) {
        const url = new URL(`${API_BASE}/pdfVersions/${versionId}/download`, location.origin);
        const res = await fetch(url.toString(), {
            headers: this.authStore.token ? { Authorization: `Bearer ${this.authStore.token}` } : {},
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: res.statusText }));
            throw new ApiError(res.status, err.detail || "Failed to load PDF version", err);
        }
        return res.blob();
    }

    async createPdfVersionObjectUrl(versionId) {
        const blob = await this.fetchPdfVersionBlob(versionId);
        return URL.createObjectURL(blob);
    }

    /** Upload a new PDF via multipart form. */
    async uploadPdf(formData) {
        if (!formData.has("file") && formData.has("pdfFile")) {
            const f = formData.get("pdfFile");
            formData.append("file", f);
        }
        return this.fetch("/pdfs", "POST", formData);
    }

    /** Upload a new PDF/archive via multipart form, reporting real byte-level progress (0-1). */
    async uploadPdfWithProgress(formData, onProgress) {
        if (!formData.has("file") && formData.has("pdfFile")) {
            const f = formData.get("pdfFile");
            formData.append("file", f);
        }
        const send = () => new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", `${API_BASE}/pdfs`);
            if (this.authStore.token) xhr.setRequestHeader("Authorization", `Bearer ${this.authStore.token}`);
            xhr.upload.onprogress = (e) => {
                if (onProgress && e.lengthComputable) onProgress(e.loaded / e.total);
            };
            xhr.onload = () => {
                let data = null;
                try { data = JSON.parse(xhr.responseText); } catch { /* empty/non-JSON body */ }
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(data);
                } else {
                    reject(new ApiError(xhr.status, data?.detail || data?.message || xhr.statusText || "Upload failed", data));
                }
            };
            xhr.onerror = () => reject(new ApiError(0, "Network error during upload", null));
            xhr.send(formData);
        });

        try {
            return await send();
        } catch (error) {
            if (error?.status !== 401 || !this.authStore.refreshToken) throw error;
            const refreshed = await this.refreshToken();
            if (!refreshed) throw error;
            return send();
        }
    }

    /** Authenticated fetch shorthand */
    async fetch(path, method = "GET", body = null, params = null) {
        try {
            return await apiFetch(path, method, body, params, this.authStore.token);
        } catch (error) {
            const canRetry =
                error?.status === 401 &&
                !path.startsWith("/auth/login") &&
                !path.startsWith("/auth/refresh") &&
                !path.startsWith("/auth/forgot-password") &&
                !path.startsWith("/auth/reset-password");
            if (!canRetry || !this.authStore.refreshToken) {
                throw error;
            }

            const refreshed = await this.refreshToken();
            if (!refreshed) throw error;
            return apiFetch(path, method, body, params, this.authStore.token);
        }
    }

    /** Login — identifier can be email or mobile number */
    async login(identifier, password) {
        const data = await apiFetch("/auth/login", "POST", { identifier, password });
        this.authStore.save(data.token, data.record, data.refreshToken);
        return data;
    }

    async refreshToken() {
        if (this._refreshPromise) return this._refreshPromise;
        if (!this.authStore.refreshToken) return false;

        this._refreshPromise = (async () => {
            try {
                const data = await apiFetch("/auth/refresh", "POST", {
                    refreshToken: this.authStore.refreshToken,
                });
                this.authStore.save(data.token, data.record, data.refreshToken);
                return true;
            } catch {
                this.authStore.clear();
                return false;
            } finally {
                this._refreshPromise = null;
            }
        })();

        return this._refreshPromise;
    }

    async logout() {
        const refreshToken = this.authStore.refreshToken;
        try {
            if (this.authStore.token) {
                await apiFetch("/auth/logout", "POST", refreshToken ? { refreshToken } : null, null, this.authStore.token);
            }
        } catch {
            // Ignore API errors; local logout still proceeds.
        } finally {
            this.authStore.clear();
        }
    }

    /** Subscribe to real-time events for a collection */
    subscribe(collection, callback) {
        return this._realtime.subscribe(collection, callback);
    }

    unsubscribe(collection) {
        return this._realtime.unsubscribe(collection);
    }

    /** PocketBase compatibility layer */
    collection(name) {
        const self = this;
        return {
            async getList(page = 1, perPage = 50, options = {}) {
                const params = {
                    page,
                    per_page: perPage,
                };

                // Copy all options except PocketBase-specific ones
                for (const [k, v] of Object.entries(options)) {
                    if (k === '$autoCancel' || k === 'expand') continue;
                    if (k === 'filter') {
                        // Parse simple PocketBase filter strings into real query params
                        // e.g. 'categoryId="abc"' → { categoryId: 'abc' }
                        // e.g. 'subCategoryId="abc"' → { subCategoryId: 'abc' }
                        const filterStr = String(v);
                        const matches = filterStr.matchAll(/(\w+)\s*=\s*["']([^"']+)["']/g);
                        for (const m of matches) {
                            params[m[1]] = m[2];
                        }
                        continue;
                    }
                    params[k] = v;
                }

                const result = await self.fetch(`/${name}`, 'GET', null, params);
                return {
                    items: result.items || result,
                    totalItems: result.totalItems || result.total || (result.items || result).length,
                    totalPages: result.totalPages || Math.ceil((result.totalItems || result.total || 0) / perPage),
                    page,
                    perPage
                };
            },
            async getFullList(options = {}) {
                const batchSize = 200;
                let page = 1;
                let allItems = [];
                while (true) {
                    const result = await self.collection(name).getList(page, batchSize, options);
                    allItems = allItems.concat(result.items);
                    if (allItems.length >= result.totalItems || result.items.length < batchSize) break;
                    page++;
                }
                return allItems;
            },
            async getOne(id, options = {}) {
                return await self.fetch(`/${name}/${id}`, 'GET');
            },
            async create(data, options = {}) {
                return await self.fetch(`/${name}`, 'POST', data);
            },
            async update(id, data, options = {}) {
                return await self.fetch(`/${name}/${id}`, 'PATCH', data);
            },
            async delete(id, options = {}) {
                return await self.fetch(`/${name}/${id}`, 'DELETE');
            },
            subscribe(callback) {
                return self._realtime.subscribe(name, callback);
            },
            unsubscribe() {
                return self._realtime.unsubscribe(name);
            }
        };
    }
}

const client = new ApiClient();
export default client;
export { client as apiClient };
export { client as pb }; // Backward compatibility for legacy imports
