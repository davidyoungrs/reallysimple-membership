// import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './components/LandingPage';
import { CardBuilder } from './components/CardBuilder';
import { Dashboard } from './components/Dashboard';
import { PublicCard } from './components/PublicCard';
import { PolicyPage } from './components/PolicyPage';
import { RequireVerifiedEmail } from './components/RequireVerifiedEmail';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminUsers } from './components/admin/AdminUsers';
import { AdminCards } from './components/admin/AdminCards';
import { AdminSecurity } from './components/admin/AdminSecurity';
import { AdminSettings } from './components/admin/AdminSettings';
import { useEffect, useState } from 'react';

import { SignedIn, SignedOut, RedirectToSignIn, SignIn, SignUp, useUser } from '@clerk/clerk-react';

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
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
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
      <Routes>
        <Route path="/" element={<LandingPage />} />

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

        {/* Policy Routes */}
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
        </Route>

        {/* Redirect unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
