import { Routes, Route, useLocation, Navigate, Outlet } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { PublicLayout } from '../layouts/PublicLayout';
import { LandingPage } from '../pages/LandingPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { AppLayout } from '../layouts/AppLayout';
import { useAuth } from '../features/auth/AuthProvider';
import type { Role } from '../api/types';
import { AdminLayout } from '../layouts/AdminLayout';
import { LoadingCards } from '../components/ui';
const LoginPage = lazy(() => import('../pages/AuthPages').then(module => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('../pages/AuthPages').then(module => ({ default: module.RegisterPage })));
const ProfilePage = lazy(() => import('../pages/ProfilePage').then(module => ({ default: module.ProfilePage })));
const RequestsPage = lazy(() => import('../pages/RequestsPage').then(module => ({ default: module.RequestsPage })));
const NewRequestPage = lazy(() => import('../pages/NewRequestPage').then(module => ({ default: module.NewRequestPage })));
const RequestDetailPage = lazy(() => import('../pages/RequestDetailPage').then(module => ({ default: module.RequestDetailPage })));
const SessionsPage = lazy(() => import('../pages/SessionsPage').then(module => ({ default: module.SessionsPage })));
const SessionPage = lazy(() => import('../pages/SessionPage').then(module => ({ default: module.SessionPage })));
const AdminDashboardPage = lazy(() => import('../pages/AdminDashboardPage').then(module => ({ default: module.AdminDashboardPage })));
const AdminUsersPage = lazy(() => import('../pages/AdminListPages').then(module => ({ default: module.AdminUsersPage })));
const AdminRequestsPage = lazy(() => import('../pages/AdminListPages').then(module => ({ default: module.AdminRequestsPage })));
const AdminReportsPage = lazy(() => import('../pages/AdminListPages').then(module => ({ default: module.AdminReportsPage })));
const AdminAuditPage = lazy(() => import('../pages/AdminListPages').then(module => ({ default: module.AdminAuditPage })));
const AdminReportDetailPage = lazy(() => import('../pages/AdminReportDetailPage').then(module => ({ default: module.AdminReportDetailPage })));
const AdminCategoriesPage = lazy(() => import('../pages/AdminCategoriesPage').then(module => ({ default: module.AdminCategoriesPage })));
export function Protected({ roles }: { roles?: Role[] }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user)
    return (
      <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`} replace />
    );
  return roles && !roles.includes(user.role) ? <NotFoundPage /> : <Outlet />;
}
export function App() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
    else window.scrollTo(0, 0);
  }, [pathname, hash]);
  return (
    <Suspense fallback={<div className="container page"><LoadingCards /></div>}><Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route path="login" element={<LoginPage />} />
      <Route path="register" element={<RegisterPage />} />
      <Route element={<Protected />}>
        <Route element={<AppLayout />}>
          <Route path="profile" element={<ProfilePage />} />
          <Route path="requests" element={<RequestsPage />} />
          <Route path="requests/:id" element={<RequestDetailPage />} />
          <Route element={<Protected roles={['Requester', 'Helper']} />}>
            <Route path="sessions" element={<SessionsPage />} />
            <Route path="sessions/:id" element={<SessionPage />} />
          </Route>
          <Route element={<Protected roles={['Requester']} />}>
            <Route path="my-requests" element={<RequestsPage mine />} />
            <Route path="requests/new" element={<NewRequestPage />} />
          </Route>
          <Route element={<Protected roles={['Helper']} />}>
            <Route path="my-jobs" element={<RequestsPage mine />} />
          </Route>
          <Route element={<Protected roles={['Admin']} />}>
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="requests" element={<AdminRequestsPage />} />
              <Route path="categories" element={<AdminCategoriesPage />} />
              <Route path="reports" element={<AdminReportsPage />} />
              <Route path="reports/:id" element={<AdminReportDetailPage />} />
              <Route path="audit" element={<AdminAuditPage />} />
            </Route>
          </Route>
        </Route>
      </Route>
    </Routes></Suspense>
  );
}
