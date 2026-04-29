/**
 * Mobile API client — configures the shared client with SecureStore for token storage.
 */
import * as SecureStore from 'expo-secure-store';
import { configureClient, apiFetch } from '@shared/api/client.js';

const TOKEN_KEY = 'auth_token';

// On mobile, SecureStore is async — we cache the token in memory after first load
let _cachedToken = null;

export async function initApiClient(baseUrl) {
    _cachedToken = await SecureStore.getItemAsync(TOKEN_KEY);
    configureClient({
        baseUrl,
        getToken: () => _cachedToken,
        setToken: async (token) => {
            _cachedToken = token;
            await SecureStore.setItemAsync(TOKEN_KEY, token);
        },
        clearToken: async () => {
            _cachedToken = null;
            await SecureStore.deleteItemAsync(TOKEN_KEY);
        },
    });
}

export { apiFetch };
