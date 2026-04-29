import React, { createContext, useContext, useState, useEffect } from 'react';
import client from '@/lib/apiClient.js';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Role helpers
export const ROLES = {
  PLATFORM_ADMIN: 'platform_admin',
  PLATFORM_VIEWER: 'platform_viewer',
  SCHOOL_ADMIN: 'school_admin',
  SCHOOL_VIEWER: 'school_viewer',
  TEACHER: 'teacher',
  // Legacy
  ADMIN: 'admin',
  SCHOOL: 'school',
};

export const isPlatformRole = (role) =>
  ['platform_admin', 'admin'].includes(role);

export const isSchoolRole = (role) =>
  ['school_admin', 'school_viewer', 'teacher', 'school'].includes(role);

export const canWrite = (role) =>
  ['platform_admin', 'admin', 'school_admin', 'school'].includes(role);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(client.authStore.model);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = client.authStore.onChange((token, model) => {
      setCurrentUser(model);
    });
    setLoading(false);
    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    const authData = await client.collection('users').authWithPassword(email, password);
    return authData;
  };

  const logout = () => {
    client.authStore.clear();
    setCurrentUser(null);
  };

  const role = currentUser?.role;

  const value = {
    currentUser,
    login,
    logout,
    isAuthenticated: !!currentUser,
    // Platform-level access
    isPlatformAdmin: ['platform_admin', 'admin'].includes(role),
    isPlatformViewer: role === 'platform_viewer',
    isPlatform: isPlatformRole(role),
    // School-level access
    isSchoolAdmin: ['school_admin', 'school'].includes(role),
    isSchoolViewer: role === 'school_viewer',
    isSchool: isSchoolRole(role),
    isTeacher: role === 'teacher',
    // Write access
    canWrite: canWrite(role),
    // Legacy compat
    isAdmin: ['platform_admin', 'admin'].includes(role),
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
