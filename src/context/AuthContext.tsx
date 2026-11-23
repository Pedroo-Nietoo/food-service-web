import { createContext, useContext, useState, type ReactNode } from 'react';
import { apiRequest, clearStoredSession } from '../lib/api';
import type { AuthUser, LoginResponse, UserRole } from '../types/api';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (loginValue: string, password: string, remember: boolean) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'brasa_access_token';
const USER_KEY = 'brasa_user';

function loadInitialUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY),
  );
  const [user, setUser] = useState<AuthUser | null>(loadInitialUser);

  async function login(loginValue: string, password: string, remember: boolean) {
    const data = await apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login: loginValue, password }),
    });
    clearStoredSession();
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(TOKEN_KEY, data.accessToken);
    storage.setItem(USER_KEY, JSON.stringify(data.user));
    setToken(data.accessToken);
    setUser(data.user);
  }

  function logout() {
    clearStoredSession();
    setToken(null);
    setUser(null);
  }

  function hasRole(...roles: UserRole[]) {
    return user ? roles.includes(user.role) : false;
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
