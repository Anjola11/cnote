import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Theme } from '../types';
import { useAuth } from './AuthContext';
import { preferencesApi } from '../services/api';

interface ThemeContextType {
  theme: Theme;
  setTheme: React.Dispatch<React.SetStateAction<Theme>>;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [theme, setTheme] = useState<Theme>(() => {
    // Initial load: prefer user settings, then local storage, then system
    const stored = localStorage.getItem('cnote-theme') as Theme | null;
    if (stored === 'dark' || stored === 'light' || stored === 'system') return stored;
    return 'system';
  });

  // Track the resolved theme (light/dark) for the data-theme attribute
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Effect to sync with user preferences once they are loaded
  useEffect(() => {
    if (user?.preferences?.theme) {
      const serverTheme = user.preferences.theme as Theme;
      if (serverTheme !== theme) {
        setTheme(serverTheme);
        localStorage.setItem('cnote-theme', serverTheme);
      }
    }
  }, [user?.preferences?.theme]);

  // Handle resolution of 'system' theme
  useEffect(() => {
    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setResolvedTheme(isDark ? 'dark' : 'light');
    } else {
      setResolvedTheme(theme as 'light' | 'dark');
    }
  }, [theme]);

  // Apply resolved theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
  }, [resolvedTheme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      if (theme === 'system') {
        setResolvedTheme(mediaQuery.matches ? 'dark' : 'light');
      }
    };
    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      let next: Theme;
      if (prev === 'light') next = 'dark';
      else if (prev === 'dark') next = 'system';
      else next = 'light';
      
      localStorage.setItem('cnote-theme', next);
      
      // Persist to backend if logged in
      if (user) {
        preferencesApi.update('theme', next).catch(() => {
          // Silently fail or handle error
        });
      }
      
      return next;
    });
  }, [user]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  return useContext(ThemeContext);
}

export default ThemeContext;
