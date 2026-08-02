/**
 * Dynamic Expo config — reads EXPO_PUBLIC_API_URL from the environment
 * (set per build profile in eas.json) and injects it into extra.apiUrl.
 *
 * This overrides the static apiUrl in app.json so that:
 *   development build   → http://localhost:8000 (from eas.json or fallback)
 *   preview build       → https://iiconacademy.in (from eas.json)
 *   production build    → https://iiconacademy.in (from eas.json)
 */
export default ({ config }) => ({
    ...config,
    extra: {
        ...config.extra,
        apiUrl: process.env.EXPO_PUBLIC_API_URL ?? config.extra?.apiUrl ?? 'https://iiconacademy.in',
    },
});
