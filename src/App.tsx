// import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { SignedIn, SignedOut, RedirectToSignIn, SignIn, SignUp, useUser } from '@clerk/clerk-react';
import { LoadingSpinner } from './components/LoadingSpinner';
import { TierProvider } from './contexts/TierContext';
import { ClubThemeProvider } from './contexts/ClubThemeContext.js';

// Lazy Load Pages
const PolicyPage = lazy(() => import('./components/PolicyPage').then(module => ({ default: module.PolicyPage })));
const RequireVerifiedEmail = lazy(() => import('./components/RequireVerifiedEmail').then(module => ({ default: module.RequireVerifiedEmail })));
const AdminLayout = lazy(() => import('./components/admin/AdminLayout').then(module => ({ default: module.AdminLayout })));
const AdminSecurity = lazy(() => import('./components/admin/AdminSecurity').then(module => ({ default: module.AdminSecurity })));
const AdminSettings = lazy(() => import('./components/admin/AdminSettings').then(module => ({ default: module.AdminSettings })));
const MembershipCardCreator = lazy(() => import('./components/membership/MembershipCardCreator').then(module => ({ default: module.MembershipCardCreator })));
const MembershipPublicPage = lazy(() => import('./components/membership/MembershipPublicPage').then(module => ({ default: module.MembershipPublicPage })));
const MembershipAdminLayout = lazy(() => import('./components/membership/admin/MembershipAdminLayout').then(module => ({ default: module.MembershipAdminLayout })));
const MembershipAdminDashboard = lazy(() => import('./components/membership/admin/MembershipAdminDashboard').then(module => ({ default: module.MembershipAdminDashboard })));
const MembershipAdminMembers = lazy(() => import('./components/membership/admin/MembershipAdminMembers').then(module => ({ default: module.MembershipAdminMembers })));
const MembershipAdminTemplates = lazy(() => import('./components/membership/admin/MembershipAdminTemplates').then(module => ({ default: module.MembershipAdminTemplates })));
const AdminMembershipClubs = lazy(() => import('./components/admin/AdminMembershipClubs').then(module => ({ default: module.AdminMembershipClubs })));

function App() {
  const [settings, setSettings] = useState<Record<string, boolean>>({});
  const [loadingSettings, setLoadingSettings] = useState(true);
  const { user } = useUser();
  const statusFetchedRef = useRef(false);

  useEffect(() => {
    if (statusFetchedRef.current) return;
    statusFetchedRef.current = true;

    fetch('/api/public?resource=status')
      .then(res => res.json())
      .then(data => {
        setSettings(data);
        setLoadingSettings(false);
      })
      .catch(err => {
        console.error('Failed to fetch system status:', err);
        setLoadingSettings(false);
      });
  }, []);

  if (loadingSettings) {
    return <LoadingSpinner />;
  }

  // Maintenance Mode Check
  if (settings['maintenance_mode']) {
    // Allow admins to bypass (checking Clerk metadata if available, though simple client-side check is weak security, 
    // real protection is at API level. For UI, this is enough to stop regular users).
    const isAdmin = user?.publicMetadata?.role === 'admin';

    if (!isAdmin && !window.location.pathname.startsWith('/sign-in') && !window.location.pathname.startsWith('/admin')) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Under Maintenance</h1>
          <p className="text-gray-600 max-w-md">
            We are currently performing scheduled maintenance to improve our services.
            Please check back shortly.
          </p>
        </div>
      );
    }
  }

  return (
    <BrowserRouter>
      <TierProvider>
        <ClubThemeProvider>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
            <Route path="/" element={<Navigate to="/admin" replace />} />

            {/* Auth Routes */}
            <Route path="/sign-in/*" element={<div className="flex justify-center items-center min-h-screen bg-gray-50"><SignIn routing="path" path="/sign-in" /></div>} />
            <Route
              path="/sign-up/*"
              element={
                settings['disable_registrations'] ? (
                  <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Registrations Closed</h1>
                    <p className="text-gray-600 max-w-md">
                      New account registrations are currently disabled. Please try again later.
                    </p>
                    <a href="/" className="mt-6 text-blue-600 hover:text-blue-800 font-medium">Return Home</a>
                  </div>
                ) : (
                  <div className="flex justify-center items-center min-h-screen bg-gray-50"><SignUp routing="path" path="/sign-up" /></div>
                )
              }
            />

            {/* Membership Routes */}
            <Route
              path="/membership-cards"
              element={
                <>
                  <SignedIn>
                    <RequireVerifiedEmail>
                      <MembershipCardCreator />
                    </RequireVerifiedEmail>
                  </SignedIn>
                  <SignedOut>
                    <RedirectToSignIn />
                  </SignedOut>
                </>
              }
            />
            <Route path="/membership/:slug" element={<MembershipPublicPage />} />

            {/* Policy Routes - must come after all static routes */}
            <Route path="/:type" element={<PolicyPage />} />

            {/* Super Admin Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminMembershipClubs />} />
              <Route path="security" element={<AdminSecurity />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            {/* Club Admin Routes */}
            <Route
              path="/membership-admin/:clubSlug"
              element={
                <>
                  <SignedIn>
                    <RequireVerifiedEmail>
                      <MembershipAdminLayout />
                    </RequireVerifiedEmail>
                  </SignedIn>
                  <SignedOut>
                    <RedirectToSignIn />
                  </SignedOut>
                </>
              }
            >
              <Route index element={<MembershipAdminDashboard />} />
              <Route path="members" element={<MembershipAdminMembers />} />
              <Route path="templates" element={<MembershipAdminTemplates />} />
              <Route path="create" element={<MembershipCardCreator />} />
            </Route>

            {/* Redirect unknown routes to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ClubThemeProvider>
    </TierProvider>
  </BrowserRouter>
);
}

export default App;
