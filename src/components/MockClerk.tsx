import React from 'react';

export function ClerkProvider({ children }: { children: React.ReactNode; [key: string]: any }) {
  return <>{children}</>;
}

export function SignedIn({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function SignedOut(_props: any) {
  return null;
}

export function RedirectToSignIn(_props: any) {
  return null;
}

const mockEmail = {
  emailAddress: 'admin@reallysimpleapps.com',
  verification: { status: 'verified' }
};

export function useUser() {
  return {
    isLoaded: true,
    isSignedIn: true,
    user: {
      id: 'usr_admin',
      fullName: 'Club Admin',
      firstName: 'Club',
      lastName: 'Admin',
      imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
      primaryEmailAddress: mockEmail,
      emailAddresses: [mockEmail],
      publicMetadata: {
        role: 'admin',
      },
    },
  };
}

export function useAuth() {
  return {
    isLoaded: true,
    isSignedIn: true,
    userId: 'usr_admin',
    getToken: async () => 'dummy-token',
  };
}

export function useClerk() {
  return {
    signOut: async () => {
      console.log('Signing out is mocked. Redirecting to home.');
      window.location.href = '/';
    }
  };
}

export function SignIn(_props: any) {
  return <div>Sign In (Mocked)</div>;
}

export function SignUp(_props: any) {
  return <div>Sign Up (Mocked)</div>;
}

export function UserButton(_props: any) {
  return <div className="text-xs font-bold text-slate-400">Admin Mode</div>;
}
