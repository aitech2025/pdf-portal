import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '../src/context/AuthContext';
import { initApiClient } from '../src/lib/apiClient';
import Constants from 'expo-constants';

SplashScreen.preventAutoHideAsync();

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:8000';

export default function RootLayout() {
    useEffect(() => {
        initApiClient(API_URL).then(() => SplashScreen.hideAsync());
    }, []);

    return (
        <AuthProvider>
            <StatusBar style="auto" />
            <Stack screenOptions={{ headerShown: false }} />
        </AuthProvider>
    );
}
