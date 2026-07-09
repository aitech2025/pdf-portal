
import React, { lazy, Suspense, useState, useEffect } from 'react';
import { Route, Routes, BrowserRouter as Router, Navigate } from 'react-router-dom';
import client from '@/lib/apiClient';
import { AuthProvider } from '@/contexts/AuthContext.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import ProtectedRoute from '@/components/ProtectedRoute.jsx';
import AppLayout from '@/components/AppLayout.jsx';

// Auth / public pages — small, load eagerly so login is instant
import LoginPage from '@/pages/LoginPage.jsx';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from '@/pages/ResetPasswordPage.jsx';
import VerifyEmailPage from '@/pages/VerifyEmailPage.jsx';
import MaintenanceModePage from '@/pages/MaintenanceModePage.jsx';
import GuestSignupForm from '@/pages/GuestSignupForm.jsx';
import ForbiddenPage from '@/pages/ForbiddenPage.jsx';
import NotFoundPage from '@/pages/NotFoundPage.jsx';

// Shared authenticated pages — lazy loaded
const UserProfilePage = lazy(() => import('@/pages/UserProfilePage.jsx'));
const GlobalSearchPage = lazy(() => import('@/pages/GlobalSearchPage.jsx'));
const NotificationCenter = lazy(() => import('@/pages/NotificationCenter.jsx'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage.jsx'));
const HelpCenterPage = lazy(() => import('@/pages/HelpCenterPage.jsx'));

// Admin pages — lazy loaded
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard.jsx'));
const AdvancedAnalyticsDashboard = lazy(() => import('@/pages/admin/AdvancedAnalyticsDashboard.jsx'));
const AnalyticsReports = lazy(() => import('@/pages/admin/AnalyticsReports.jsx'));
const CategoriesAndSubcategoriesPage = lazy(() => import('@/pages/admin/CategoriesAndSubcategoriesPage.jsx'));
const CategoriesManagementTest = lazy(() => import('@/pages/admin/CategoriesManagementTest.jsx'));
const SimpleTest = lazy(() => import('@/pages/admin/SimpleTest.jsx'));
const PDFUploadManagement = lazy(() => import('@/pages/admin/PDFUploadManagement.jsx'));
const SchoolManagement = lazy(() => import('@/pages/admin/SchoolManagement.jsx'));
const SchoolsAndUsersPage = lazy(() => import('@/pages/admin/SchoolsAndUsersPage.jsx'));
const ContentDashboard = lazy(() => import('@/pages/admin/ContentDashboard.jsx'));
const AuditLogsPage = lazy(() => import('@/pages/admin/AuditLogsPage.jsx'));
const TeamManagementPage = lazy(() => import('@/pages/admin/TeamManagementPage.jsx'));
const BulkCreationPage = lazy(() => import('@/pages/admin/BulkCreationPage.jsx'));
const UserManagement = lazy(() => import('@/pages/admin/UserManagement.jsx'));
const ExportDataPage = lazy(() => import('@/pages/ExportDataPage.jsx'));
const ContentModeration = lazy(() => import('@/pages/admin/ContentModeration.jsx'));
const SystemSettings = lazy(() => import('@/pages/admin/SystemSettings.jsx'));
const NotificationsPage = lazy(() => import('@/pages/admin/NotificationsPage.jsx'));
const BulkNotificationPage = lazy(() => import('@/pages/admin/BulkNotificationPage.jsx'));
const ProgramsManagementPage = lazy(() => import('@/pages/admin/ProgramsManagementPage.jsx'));
const VideoLessonsPage = lazy(() => import('@/pages/admin/VideoLessonsPage.jsx'));
const ClassManagementPage = lazy(() => import('@/pages/admin/ClassManagementPage.jsx'));
const SubjectManagementPage = lazy(() => import('@/pages/admin/SubjectManagementPage.jsx'));

// School pages — lazy loaded
const SchoolDashboard = lazy(() => import('@/pages/SchoolDashboard.jsx'));
const SchoolPortal = lazy(() => import('@/pages/school/SchoolPortal.jsx'));
const SchoolPortalBrowse = lazy(() => import('@/pages/school/SchoolPortalBrowse.jsx'));
const SchoolBookmarksPage = lazy(() => import('@/pages/school/SchoolBookmarksPage.jsx'));
const FirstLoginChangePassword = lazy(() => import('@/pages/school/FirstLoginChangePassword.jsx'));
const SchoolSettings = lazy(() => import('@/pages/school/SchoolSettings.jsx'));
const SchoolAnalyticsDashboard = lazy(() => import('@/pages/school/SchoolAnalyticsDashboard.jsx'));
const SchoolVideoLessons = lazy(() => import('@/pages/school/SchoolVideoLessons.jsx'));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3"></div>
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-8">
          <div className="text-center max-w-md">
            <h1 className="text-xl font-semibold text-foreground mb-2">Something went wrong</h1>
            <p className="text-sm text-muted-foreground mb-4">
              The page failed to load. Please refresh — if the problem persists, clear your browser cache.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90"
            >
              Refresh page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <MaintenanceAwareRoutes isMaintenance={isMaintenance} maintenanceMessage={maintenanceMessage} />
      </Suspense>
    </ErrorBoundary>
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
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
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
