// import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './components/LandingPage';
import { useEffect, useState, lazy, Suspense } from 'react';
import { SignedIn, SignedOut, RedirectToSignIn, SignIn, SignUp, useUser } from '@clerk/clerk-react';
import { LoadingSpinner } from './components/LoadingSpinner';
import { TierProvider } from './contexts/TierContext';

// Lazy Load Pages
const WordPressHome = lazy(() => import('./components/WordPressHome').then(module => ({ default: module.WordPressHome })));
const CardBuilder = lazy(() => import('./components/CardBuilder').then(module => ({ default: module.CardBuilder })));
const Dashboard = lazy(() => import('./components/Dashboard').then(module => ({ default: module.Dashboard })));
const PublicCard = lazy(() => import('./components/PublicCard').then(module => ({ default: module.PublicCard })));
const PolicyPage = lazy(() => import('./components/PolicyPage').then(module => ({ default: module.PolicyPage })));
const RequireVerifiedEmail = lazy(() => import('./components/RequireVerifiedEmail').then(module => ({ default: module.RequireVerifiedEmail })));
const AdminLayout = lazy(() => import('./components/admin/AdminLayout').then(module => ({ default: module.AdminLayout })));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const AdminUsers = lazy(() => import('./components/admin/AdminUsers').then(module => ({ default: module.AdminUsers })));
const AdminCards = lazy(() => import('./components/admin/AdminCards').then(module => ({ default: module.AdminCards })));
const AdminSecurity = lazy(() => import('./components/admin/AdminSecurity').then(module => ({ default: module.AdminSecurity })));
const AdminSettings = lazy(() => import('./components/admin/AdminSettings').then(module => ({ default: module.AdminSettings })));
const SubscriptionSimulator = lazy(() => import('./components/admin/SubscriptionSimulator').then(module => ({ default: module.SubscriptionSimulator })));
const Licenses = lazy(() => import('./components/Licenses').then(module => ({ default: module.Licenses })));
const LapsedSubscription = lazy(() => import('./components/LapsedSubscription'));
const Pricing = lazy(() => import('./components/Pricing').then(module => ({ default: module.Pricing })));
const OnboardingWizard = lazy(() => import('./components/OnboardingWizard').then(module => ({ default: module.OnboardingWizard })));
const OnboardingCallback = lazy(() => import('./components/OnboardingCallback').then(module => ({ default: module.OnboardingCallback })));

function App() {
  const [settings, setSettings] = useState<Record<string, boolean>>({});
  const [loadingSettings, setLoadingSettings] = useState(true);
  const { user } = useUser();

  useEffect(() => {
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
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/create" element={<OnboardingWizard />} />
            <Route path="/onboarding-callback" element={<OnboardingCallback />} />
            <Route path="/wordpress-home" element={<WordPressHome />} />
            <Route path="/pricing" element={<Pricing />} />

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

            {/* Public Card Route */}
            <Route path="/card/:slug" element={<PublicCard />} />

            {/* Landing/Static Routes */}
            <Route path="/lapsed" element={<LapsedSubscription />} />
            <Route path="/licenses" element={<Licenses />} />

            {/* Admin Editor Route (Concierge Mode) */}
            <Route
              path="/editor"
              element={
                <>
                  <SignedIn>
                    <RequireVerifiedEmail>
                      <CardBuilder />
                    </RequireVerifiedEmail>
                  </SignedIn>
                  <SignedOut>
                    <RedirectToSignIn />
                  </SignedOut>
                </>
              }
            />

            {/* Policy Routes - must come after all static routes */}
            <Route path="/:type" element={<PolicyPage />} />

            {/* Protected App Route */}
            <Route
              path="/app"
              element={
                <>
                  <SignedIn>
                    <RequireVerifiedEmail>
                      <CardBuilder />
                    </RequireVerifiedEmail>
                  </SignedIn>
                  <SignedOut>
                    <RedirectToSignIn />
                  </SignedOut>
                </>
              }
            />

            {/* Protected Dashboard Route */}
            <Route
              path="/dashboard"
              element={
                <>
                  <SignedIn>
                    <RequireVerifiedEmail>
                      <Dashboard />
                    </RequireVerifiedEmail>
                  </SignedIn>
                  <SignedOut>
                    <RedirectToSignIn />
                  </SignedOut>
                </>
              }
            />

            {/* Super Admin Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="cards" element={<AdminCards />} />
              <Route path="security" element={<AdminSecurity />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="simulator" element={<SubscriptionSimulator />} />
            </Route>

            {/* Redirect unknown routes to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </TierProvider>
    </BrowserRouter>
  );
}

export default App;
