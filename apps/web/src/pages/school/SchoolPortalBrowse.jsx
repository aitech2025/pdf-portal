import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import SchoolPortalContent from '@/pages/school/SchoolPortalContent.jsx';

/** Browse assigned categories and PDFs (FRD school portal). */
const SchoolPortalBrowse = () => {
  const { currentUser } = useAuth();
  const schoolId = currentUser?.schoolId ?? currentUser?.school_id;
  if (!schoolId) {
    return <Navigate to="/school/dashboard" replace />;
  }
  return <SchoolPortalContent school={{ id: schoolId }} />;
};

export default SchoolPortalBrowse;
