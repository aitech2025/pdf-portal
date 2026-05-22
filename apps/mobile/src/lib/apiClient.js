/**
 * Mobile API client — configures the shared client with SecureStore for token storage.
 */
import * as SecureStore from 'expo-secure-store';
import { configureClient, apiFetch } from '@shared/api/client.js';

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';

// On mobile, SecureStore is async — we cache the token in memory after first load
let _cachedToken = null;
let _cachedRefreshToken = null;

export async function initApiClient(baseUrl) {
    _cachedToken = await SecureStore.getItemAsync(TOKEN_KEY);
    _cachedRefreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    configureClient({
        baseUrl,
        getToken: () => _cachedToken,
        getRefreshToken: () => _cachedRefreshToken,
        setToken: async (token) => {
            _cachedToken = token;
            await SecureStore.setItemAsync(TOKEN_KEY, token);
        },
        setRefreshToken: async (refreshToken) => {
            _cachedRefreshToken = refreshToken;
            await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
        },
        clearToken: async () => {
            _cachedToken = null;
            await SecureStore.deleteItemAsync(TOKEN_KEY);
        },
        clearRefreshToken: async () => {
            _cachedRefreshToken = null;
            await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        },
    });
}

export { apiFetch };
