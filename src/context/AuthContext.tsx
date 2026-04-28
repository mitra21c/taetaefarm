import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import type { User, JwtPayload } from '../types/auth';

const IDLE_TIMEOUT = 5 * 60 * 1000; // 5분
const IDLE_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'] as const;

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function parseUser(token: string): User | null {
  try {
    const payload = jwtDecode<JwtPayload>(token);
    return {
      id: Number(payload.sub),
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

function initUser(): User | null {
  const token = localStorage.getItem('accessToken');
  return token ? parseUser(token) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(initUser);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAuth = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  }, []);

  const setTokens = useCallback((accessToken: string, refreshToken: string) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(parseUser(accessToken));
  }, []);

  useEffect(() => {
    if (!user) return;

    const logout = () => {
      clearAuth();
      window.location.href = '/login';
    };

    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(logout, IDLE_TIMEOUT);
    };

    reset();
    IDLE_EVENTS.forEach(e => window.addEventListener(e, reset));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      IDLE_EVENTS.forEach(e => window.removeEventListener(e, reset));
    };
  }, [user, clearAuth]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, setTokens, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider');
  return ctx;
}
