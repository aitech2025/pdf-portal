
import React, { useState, useEffect } from 'react';
import { Route, Routes, BrowserRouter as Router, Navigate } from 'react-router-dom';
import pb from '@/lib/apiClient';
import { AuthProvider } from '@/contexts/AuthContext.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import ProtectedRoute from '@/components/ProtectedRoute.jsx';
import AppLayout from '@/components/AppLayout.jsx';

import HomePage from '@/pages/HomePage.jsx';
import LoginPage from '@/pages/LoginPage.jsx';
import MaintenanceModePage from '@/pages/MaintenanceModePage.jsx';
import GuestSignupForm from '@/pages/GuestSignupForm.jsx';
import UserProfilePage from '@/pages/UserProfilePage.jsx';
import GlobalSearchPage from '@/pages/GlobalSearchPage.jsx';
import NotificationCenter from '@/pages/NotificationCenter.jsx';
import SettingsPage from '@/pages/SettingsPage.jsx';
import HelpCenterPage from '@/pages/HelpCenterPage.jsx';

// Admin Routes
import AdminDashboard from '@/pages/AdminDashboard.jsx';
import AdvancedAnalyticsDashboard from '@/pages/admin/AdvancedAnalyticsDashboard.jsx';
import AnalyticsReports from '@/pages/admin/AnalyticsReports.jsx';
import CategoriesAndSubcategoriesPage from '@/pages/admin/CategoriesAndSubcategoriesPage.jsx';
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

// School Routes
import SchoolDashboard from '@/pages/SchoolDashboard.jsx';
import SchoolPortal from '@/pages/school/SchoolPortal.jsx';
import UserRequestsPage from '@/pages/school/UserRequestsPage.jsx';
import SchoolSettings from '@/pages/school/SchoolSettings.jsx';
import SchoolAnalyticsDashboard from '@/pages/school/SchoolAnalyticsDashboard.jsx';

function AppContent() {
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const res = await pb.collection('maintenanceMode').getList(1, 1, { $autoCancel: false });
        if (res.items.length > 0) {
          setIsMaintenance(res.items[0].isEnabled);
          setMaintenanceMessage(res.items[0].message || '');
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    checkMaintenance();

    pb.collection('maintenanceMode').subscribe('*', (e) => {
      setIsMaintenance(e.record.isEnabled);
      setMaintenanceMessage(e.record.message || '');
    });

    return () => pb.collection('maintenanceMode').unsubscribe('*');
  }, []);

  if (loading) return null;

  return (
    <MaintenanceAwareRoutes isMaintenance={isMaintenance} maintenanceMessage={maintenanceMessage} />
  );
}

// Separate component so we can use useAuth inside Router context
function MaintenanceAwareRoutes({ isMaintenance, maintenanceMessage }) {
  const { currentUser } = useAuth();
  const PLATFORM_ROLES = ['platform_admin', 'admin', 'moderator', 'platform_viewer'];
  const isPlatformUser = currentUser && PLATFORM_ROLES.includes(currentUser.role);

  // Show maintenance page only for non-platform users (or unauthenticated)
  if (isMaintenance && !isPlatformUser) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<MaintenanceModePage message={maintenanceMessage} />} />
      </Routes>
    );
  }
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<GuestSignupForm />} />

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
              <Route path="audit-logs" element={<AuditLogsPage />} />
              <Route path="settings" element={<SystemSettings />} />
              <Route path="notifications" element={<NotificationsPage />} />
            </Routes>
          </AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/school/*" element={
        <ProtectedRoute allowedRoles={['school', 'school_admin', 'school_viewer', 'teacher']}>
          <AppLayout>
            <Routes>
              <Route path="dashboard" element={<SchoolDashboard />} />
              <Route path="portal" element={<SchoolPortal />} />
              <Route path="user-requests" element={<UserRequestsPage />} />
              <Route path="settings" element={<SchoolSettings />} />
              <Route path="analytics" element={<SchoolAnalyticsDashboard />} />
            </Routes>
          </AppLayout>
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
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
