/**
 * REST API client for the EduContent backend.
 */

const API_BASE = "/api";

export class ApiError extends Error {
    constructor(status, message, data) {
        super(message);
        this.status = status;
        this.data = data;
    }
}

class AuthStore {
    constructor() {
        this._token = localStorage.getItem("auth_token") || "";
        this._model = JSON.parse(localStorage.getItem("auth_model") || "null");
        this._listeners = [];
    }

    get token() { return this._token; }
    get model() { return this._model; }
    get isValid() { return !!this._token; }

    save(token, model) {
        this._token = token;
        this._model = model;
        localStorage.setItem("auth_token", token);
        localStorage.setItem("auth_model", JSON.stringify(model));
        this._listeners.forEach(fn => fn(token, model));
    }

    clear() {
        this._token = "";
        this._model = null;
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_model");
        this._listeners.forEach(fn => fn("", null));
    }

    onChange(callback) {
        this._listeners.push(callback);
        return () => {
            this._listeners = this._listeners.filter(fn => fn !== callback);
        };
    }
}

class RealtimeService {
    constructor(client) {
        this._client = client;
        this._ws = null;
        this._subscriptions = {};
        this._reconnectTimer = null;
        this._connect();
    }

    _connect() {
        if (!this._client.authStore.token) return;
        const proto = location.protocol === "https:" ? "wss" : "ws";
        const url = `${proto}://${location.host}/api/notifications/ws?token=${this._client.authStore.token}`;
        this._ws = new WebSocket(url);

        this._ws.onmessage = (e) => {
            try {
                const { event, data } = JSON.parse(e.data);
                const [collection] = event.split(":");
                const action = event.split(":")[1] || "update";
                if (this._subscriptions[collection]) {
                    this._subscriptions[collection].forEach(cb => cb({ action, record: data }));
                }
                // Also fire wildcard '*' subscriptions
                if (this._subscriptions["*"]) {
                    this._subscriptions["*"].forEach(cb => cb({ action, record: data }));
                }
            } catch { }
        };

        this._ws.onclose = () => {
            clearTimeout(this._reconnectTimer);
            this._reconnectTimer = setTimeout(() => this._connect(), 3000);
        };
    }

    subscribe(collection, callback) {
        if (!this._subscriptions[collection]) {
            this._subscriptions[collection] = [];
        }
        this._subscriptions[collection].push(callback);
        return Promise.resolve();
    }

    unsubscribe(collection) {
        delete this._subscriptions[collection];
        return Promise.resolve();
    }
}

async function apiFetch(path, method = "GET", body = null, params = null, token = "") {
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

class Collection {
    constructor(client, name) {
        this._client = client;
        this._name = name;
    }

    get _token() { return this._client.authStore.token; }

    async getList(page = 1, perPage = 10, options = {}) {
        const { filter, sort, expand, $autoCancel, ...rest } = options;
        const data = await apiFetch(`/${this._name}`, "GET", null, {
            page, per_page: perPage,
            ...(filter ? { filter } : {}),
            ...(sort ? { sort } : {}),
            ...(expand ? { expand } : {}),
        }, this._token);
        return { items: data.items || [], totalItems: data.totalItems || 0 };
    }

    async getFullList(options = {}) {
        const { filter, sort, expand } = options;
        const data = await apiFetch(`/${this._name}`, "GET", null, {
            page: 1, per_page: 500,
            ...(filter ? { filter } : {}),
            ...(sort ? { sort } : {}),
            ...(expand ? { expand } : {}),
        }, this._token);
        return data.items || [];
    }

    async getOne(id, options = {}) {
        return apiFetch(`/${this._name}/${id}`, "GET", null, null, this._token);
    }

    async create(body, options = {}) {
        return apiFetch(`/${this._name}`, "POST", body, null, this._token);
    }

    async update(id, body, options = {}) {
        return apiFetch(`/${this._name}/${id}`, "PATCH", body, null, this._token);
    }

    async delete(id, options = {}) {
        return apiFetch(`/${this._name}/${id}`, "DELETE", null, null, this._token);
    }

    subscribe(topic, callback) {
        return this._client._realtime.subscribe(this._name, callback);
    }

    unsubscribe(topic) {
        return this._client._realtime.unsubscribe(this._name);
    }
}

class UsersCollection extends Collection {
    async authWithPassword(email, password, options = {}) {
        const data = await apiFetch("/auth/login", "POST", { email, password });
        this._client.authStore.save(data.token, data.record);
        return data;
    }
}

class ApiClient {
    constructor() {
        this.authStore = new AuthStore();
        this._collections = {};
        this._realtime = new RealtimeService(this);
    }

    collection(name) {
        if (!this._collections[name]) {
            this._collections[name] = name === "users"
                ? new UsersCollection(this, name)
                : new Collection(this, name);
        }
        return this._collections[name];
    }

    getFileUrl(record, filename) {
        if (!filename) return null;
        return `/uploads/${filename}`;
    }
}

const client = new ApiClient();
export default client;
export { client as apiClient };
