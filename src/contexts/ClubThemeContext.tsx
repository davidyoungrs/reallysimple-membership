import React, { createContext, useContext, useEffect, useState } from 'react';
import { type ClubBrandingConfig } from '../types/membershipTypes.js';

interface ClubThemeContextType {
  theme: ClubBrandingConfig | null;
  setTheme: (theme: ClubBrandingConfig | null) => void;
}

const ClubThemeContext = createContext<ClubThemeContextType | undefined>(undefined);

export function ClubThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ClubBrandingConfig | null>(null);

  const setTheme = (newTheme: ClubBrandingConfig | null) => {
    setThemeState(newTheme);
  };

  useEffect(() => {
    if (theme) {
      document.documentElement.style.setProperty('--club-primary', theme.primaryColor);
      document.documentElement.style.setProperty('--club-secondary', theme.secondaryColor);
      document.documentElement.style.setProperty('--club-text', theme.textColor);
      document.documentElement.style.setProperty('--club-bg', theme.backgroundColor);
    } else {
      document.documentElement.style.removeProperty('--club-primary');
      document.documentElement.style.removeProperty('--club-secondary');
      document.documentElement.style.removeProperty('--club-text');
      document.documentElement.style.removeProperty('--club-bg');
    }
  }, [theme]);

  return (
    <ClubThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ClubThemeContext.Provider>
  );
}

export function useClubTheme() {
  const context = useContext(ClubThemeContext);
  if (context === undefined) {
    throw new Error('useClubTheme must be used within a ClubThemeProvider');
  }
  return context;
}
