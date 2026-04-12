'use client';

import {
  createContext, useContext, useEffect, useState, useCallback,
} from 'react';
import type { AuthUser } from '@/types';
import { clearSession, getStoredUser, saveSession } from '@/lib/auth';
import { userApi } from '@/lib/api';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [isLoading, setLoading] = useState(true);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = getStoredUser();
    if (stored) setUser(stored);
    setLoading(false);
  }, []);

  const login = useCallback((token: string, authUser: AuthUser) => {
    saveSession({ token, isEmailVerified: authUser.isEmailVerified }, authUser);
    setUser(authUser);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const res = await userApi.getMe(user.id);
      const u = res.data;
      const updated: AuthUser = {
        id: u.id, name: u.name, email: u.email,
        isEmailVerified: u.isEmailVerified, accessRole: u.accessRole,
      };
      setUser(updated);
      localStorage.setItem('auth_user', JSON.stringify(updated));
    } catch {
      // silently ignore
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
