
import React, { useState, useEffect } from 'react';
import { Route, Routes, BrowserRouter as Router, Navigate } from 'react-router-dom';
import client from '@/lib/apiClient';
import { AuthProvider } from '@/contexts/AuthContext.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import ProtectedRoute from '@/components/ProtectedRoute.jsx';
import AppLayout from '@/components/AppLayout.jsx';

import HomePage from '@/pages/HomePage.jsx';
import LoginPage from '@/pages/LoginPage.jsx';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from '@/pages/ResetPasswordPage.jsx';
import VerifyEmailPage from '@/pages/VerifyEmailPage.jsx';
import MaintenanceModePage from '@/pages/MaintenanceModePage.jsx';
import GuestSignupForm from '@/pages/GuestSignupForm.jsx';
import UserProfilePage from '@/pages/UserProfilePage.jsx';
import GlobalSearchPage from '@/pages/GlobalSearchPage.jsx';
import NotificationCenter from '@/pages/NotificationCenter.jsx';
import SettingsPage from '@/pages/SettingsPage.jsx';
import HelpCenterPage from '@/pages/HelpCenterPage.jsx';
import ForbiddenPage from '@/pages/ForbiddenPage.jsx';
import NotFoundPage from '@/pages/NotFoundPage.jsx';

// Admin Routes
import AdminDashboard from '@/pages/AdminDashboard.jsx';
import AdvancedAnalyticsDashboard from '@/pages/admin/AdvancedAnalyticsDashboard.jsx';
import AnalyticsReports from '@/pages/admin/AnalyticsReports.jsx';
import CategoriesAndSubcategoriesPage from '@/pages/admin/CategoriesAndSubcategoriesPage.jsx';
import CategoriesManagementTest from '@/pages/admin/CategoriesManagementTest.jsx';
import SimpleTest from '@/pages/admin/SimpleTest.jsx';
import PDFUploadManagement from '@/pages/admin/PDFUploadManagement.jsx';
import SchoolManagement from '@/pages/admin/SchoolManagement.jsx';
import SchoolsAndUsersPage from '@/pages/admin/SchoolsAndUsersPage.jsx';
import ContentDashboard from '@/pages/admin/ContentDashboard.jsx';
import AuditLogsPage from '@/pages/admin/AuditLogsPage.jsx';
import TeamManagementPage from '@/pages/admin/TeamManagementPage.jsx';
import BulkCreationPage from '@/pages/admin/BulkCreationPage.jsx';
import UserManagement from '@/pages/admin/UserManagement.jsx';
import ExportDataPage from '@/pages/ExportDataPage.jsx';
import ContentModeration from '@/pages/admin/ContentModeration.jsx';
import SystemSettings from '@/pages/admin/SystemSettings.jsx';
import NotificationsPage from '@/pages/admin/NotificationsPage.jsx';
import BulkNotificationPage from '@/pages/admin/BulkNotificationPage.jsx';
import ProgramsManagementPage from '@/pages/admin/ProgramsManagementPage.jsx';
import VideoLessonsPage from '@/pages/admin/VideoLessonsPage.jsx';
import ClassManagementPage from '@/pages/admin/ClassManagementPage.jsx';
import SubjectManagementPage from '@/pages/admin/SubjectManagementPage.jsx';

// School Routes
import SchoolDashboard from '@/pages/SchoolDashboard.jsx';
import SchoolPortal from '@/pages/school/SchoolPortal.jsx';
import SchoolPortalBrowse from '@/pages/school/SchoolPortalBrowse.jsx';
import SchoolBookmarksPage from '@/pages/school/SchoolBookmarksPage.jsx';
import FirstLoginChangePassword from '@/pages/school/FirstLoginChangePassword.jsx';
import UserRequestsPage from '@/pages/school/UserRequestsPage.jsx';
import SchoolSettings from '@/pages/school/SchoolSettings.jsx';
import SchoolAnalyticsDashboard from '@/pages/school/SchoolAnalyticsDashboard.jsx';
import SchoolVideoLessons from '@/pages/school/SchoolVideoLessons.jsx';

function AppContent() {
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const res = await fetch('/api/maintenanceMode');
        const data = res.ok ? await res.json() : null;
        if (data?.items?.length > 0) {
          const row = data.items[0];
          setIsMaintenance(row.isEnabled ?? row.is_enabled);
          setMaintenanceMessage(row.message || '');
        }
      } catch (e) {
        console.error('Failed to check maintenance mode:', e);
        // Don't block the app if maintenance check fails
        setError(e);
      }
      setLoading(false);
    };
    checkMaintenance();

    try {
      client.subscribe('maintenanceMode', (e) => {
        setIsMaintenance(e.record.isEnabled);
        setMaintenanceMessage(e.record.message || '');
      });
    } catch (e) {
      console.error('Failed to subscribe to maintenance mode:', e);
    }

    return () => {
      try {
        client.unsubscribe('maintenanceMode');
      } catch (e) {
        console.error('Failed to unsubscribe from maintenance mode:', e);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <MaintenanceAwareRoutes isMaintenance={isMaintenance} maintenanceMessage={maintenanceMessage} />
  );
}

// Separate component so we can use useAuth inside Router context
function MaintenanceAwareRoutes({ isMaintenance, maintenanceMessage }) {
  const { currentUser } = useAuth();
  // Only SUPER_ADMIN (platform_admin / admin / super_admin) bypass maintenance, matching backend
  const SUPER_ADMIN_ROLES = ['platform_admin', 'admin', 'super_admin'];
  const isSuperAdmin = currentUser && SUPER_ADMIN_ROLES.includes(currentUser.role);

  if (isMaintenance && !isSuperAdmin) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/maintenance" element={<MaintenanceModePage message={maintenanceMessage} />} />
        <Route path="*" element={<MaintenanceModePage message={maintenanceMessage} />} />
      </Routes>
    );
  }
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/signup" element={<GuestSignupForm />} />
      <Route path="/register" element={<Navigate to="/signup" replace />} />
      <Route path="/maintenance" element={<MaintenanceModePage message={maintenanceMessage} />} />
      <Route path="/403" element={<ForbiddenPage />} />
      <Route path="/forbidden" element={<ForbiddenPage />} />
      <Route path="/404" element={<NotFoundPage />} />

      {/* Shared Authenticated Routes */}
      <Route path="/profile" element={<ProtectedRoute><AppLayout><UserProfilePage /></AppLayout></ProtectedRoute>} />
      <Route path="/search" element={<ProtectedRoute><AppLayout><GlobalSearchPage /></AppLayout></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><AppLayout><NotificationCenter /></AppLayout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><AppLayout><SettingsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/help" element={<ProtectedRoute><AppLayout><HelpCenterPage /></AppLayout></ProtectedRoute>} />

      <Route path="/admin/*" element={
        <ProtectedRoute allowedRoles={['admin', 'platform_admin', 'platform_viewer', 'moderator']}>
          <AppLayout>
            <Routes>
              <Route path="" element={<AdminDashboard />} />
              <Route path="analytics" element={<AdvancedAnalyticsDashboard />} />
              <Route path="analytics-reports" element={<AnalyticsReports />} />
              <Route path="schools" element={<SchoolManagement />} />
              <Route path="schools-and-users" element={<SchoolsAndUsersPage />} />
              <Route path="team" element={<TeamManagementPage />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="moderation" element={<ContentModeration />} />
              <Route path="content-dashboard" element={<ContentDashboard />} />
              <Route path="pdf-upload" element={<PDFUploadManagement />} />
              <Route path="bulk-create" element={<BulkCreationPage />} />
              <Route path="export" element={<ExportDataPage />} />
              <Route path="categories-management" element={<CategoriesAndSubcategoriesPage />} />
              <Route path="programs" element={<Navigate to="/admin/categories-management" replace />} />
              <Route path="video-lessons" element={<VideoLessonsPage />} />
              <Route path="classes" element={<ClassManagementPage />} />
              <Route path="subjects" element={<SubjectManagementPage />} />
              <Route path="categories-test" element={<CategoriesManagementTest />} />
              <Route path="simple-test" element={<SimpleTest />} />
              <Route path="audit-logs" element={<AuditLogsPage />} />
              <Route path="settings" element={<SystemSettings />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="broadcast" element={<BulkNotificationPage />} />
            </Routes>
          </AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/school/change-password" element={
        <ProtectedRoute allowedRoles={['school', 'school_admin', 'school_viewer', 'teacher']}>
          <FirstLoginChangePassword />
        </ProtectedRoute>
      } />

      <Route path="/school/*" element={
        <ProtectedRoute allowedRoles={['school', 'school_admin', 'school_viewer', 'teacher']}>
          <AppLayout>
            <Routes>
              <Route path="dashboard" element={<SchoolDashboard />} />
              <Route path="portal" element={<SchoolPortal />} />
              <Route path="portal/browse" element={<SchoolPortalBrowse />} />
              <Route path="bookmarks" element={<SchoolBookmarksPage />} />
              <Route path="user-requests" element={<UserRequestsPage />} />
              <Route path="settings" element={<SchoolSettings />} />
              <Route path="analytics" element={<SchoolAnalyticsDashboard />} />
              <Route path="video-lessons" element={<SchoolVideoLessons />} />
            </Routes>
          </AppLayout>
        </ProtectedRoute>
      } />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
