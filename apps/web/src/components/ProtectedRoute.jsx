import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';

const PLATFORM_ROLES = ['platform_admin', 'platform_viewer', 'admin', 'moderator'];
const SCHOOL_ROLES = ['school_admin', 'school_viewer', 'teacher', 'school'];

const ProtectedRoute = ({ children, allowedRoles, requireWrite }) => {
  const { currentUser, isAuthenticated, canWrite } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireWrite && !canWrite) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles) {
    // Expand role groups
    const expanded = allowedRoles.flatMap(r => {
      if (r === 'admin') return PLATFORM_ROLES;
      if (r === 'school') return SCHOOL_ROLES;
      return [r];
    });
    if (!expanded.includes(currentUser?.role)) {
      // Redirect to appropriate home
      const role = currentUser?.role;
      if (PLATFORM_ROLES.includes(role)) return <Navigate to="/admin" replace />;
      if (SCHOOL_ROLES.includes(role)) return <Navigate to="/school/dashboard" replace />;
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
