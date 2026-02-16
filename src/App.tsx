// import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './components/LandingPage';
import { CardBuilder } from './components/CardBuilder';
import { Dashboard } from './components/Dashboard';
import { PublicCard } from './components/PublicCard';
import { PolicyPage } from './components/PolicyPage';
import { RequireVerifiedEmail } from './components/RequireVerifiedEmail';

import { SignedIn, SignedOut, RedirectToSignIn, SignIn, SignUp } from '@clerk/clerk-react';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        {/* Auth Routes */}
        <Route path="/sign-in/*" element={<div className="flex justify-center items-center min-h-screen bg-gray-50"><SignIn routing="path" path="/sign-in" /></div>} />
        <Route path="/sign-up/*" element={<div className="flex justify-center items-center min-h-screen bg-gray-50"><SignUp routing="path" path="/sign-up" /></div>} />

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

        {/* Redirect unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
