import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authApi } from '@shared/api/index.js';
import { isPlatformRole, isSchoolRole, canWrite, ROLE_LABELS } from '@shared/constants/roles.js';

interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    schoolId?: string;
    isActive: boolean;
    avatar?: string;
    mobileNumber?: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<User>;
    logout: () => Promise<void>;
    isPlatform: boolean;
    isSchool: boolean;
    canWrite: boolean;
    roleLabel: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Restore session on app start
        const restore = async () => {
            try {
                const stored = await SecureStore.getItemAsync('auth_user');
                if (stored) setUser(JSON.parse(stored));
            } catch { }
            setLoading(false);
        };
        restore();
    }, []);

    const login = async (email: string, password: string) => {
        const data = await authApi.login(email, password);
        const u = data.record as User;
        setUser(u);
        await SecureStore.setItemAsync('auth_user', JSON.stringify(u));
        return u;
    };

    const logout = async () => {
        await authApi.logout();
        setUser(null);
        await SecureStore.deleteItemAsync('auth_user');
        await SecureStore.deleteItemAsync('auth_token');
    };

    const role = user?.role ?? '';

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            login,
            logout,
            isPlatform: isPlatformRole(role),
            isSchool: isSchoolRole(role),
            canWrite: canWrite(role),
            roleLabel: ROLE_LABELS[role] ?? role,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
};
