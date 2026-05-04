import React, { createContext, useContext, useState, useCallback } from 'react';
import type { User } from '../types';
import { DEMO_USER } from '../demo/demoData';

interface AuthContextType {
  user: User | null;
  isDemo: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  enterDemo: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isDemo: false,
  isLoading: false,
  login: async () => {},
  signup: async () => {},
  logout: () => {},
  enterDemo: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [isLoading] = useState(false);

  const enterDemo = useCallback(() => {
    setUser(DEMO_USER);
    setIsDemo(true);
  }, []);

  const login = useCallback(async (_email: string, _password: string) => {
    // Real implementation: call authApi.login() with httpOnly cookies
    // For now, this is a placeholder that will be wired to the backend
    throw new Error('Backend not connected yet. Use Demo mode to explore the app.');
  }, []);

  const signup = useCallback(async (_name: string, _email: string, _password: string) => {
    // Real implementation: call authApi.signup()
    throw new Error('Backend not connected yet. Use Demo mode to explore the app.');
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setIsDemo(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isDemo, isLoading, login, signup, logout, enterDemo }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
