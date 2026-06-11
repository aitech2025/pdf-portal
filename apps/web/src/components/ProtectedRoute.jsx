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
    return <Navigate to="/403" replace />;
  }

  if (allowedRoles) {
    const expanded = allowedRoles.flatMap((r) => {
      if (r === 'admin') return PLATFORM_ROLES;
      if (r === 'school') return SCHOOL_ROLES;
      return [r];
    });
    if (!expanded.includes(currentUser?.role)) {
      return <Navigate to="/403" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
