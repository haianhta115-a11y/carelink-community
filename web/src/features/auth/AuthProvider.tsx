import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../../api/client';
import type { Auth, User, Role } from '../../api/types';
import { readAuth, writeAuth } from '../../lib/auth-storage';
import { vi } from '../../locales/vi';
interface AuthContextValue {
  auth: Auth | null;
  user: User | null;
  signIn: (value: Auth) => void;
  signOut: () => void;
  updateUser: (user: User) => void;
}
const AuthContext = createContext<AuthContextValue | null>(null);
export function roleHome(role: Role) {
  return role === 'Admin' ? '/admin' : role === 'Requester' ? '/my-requests' : '/requests';
}
export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<Auth | null>(readAuth);
  const client = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  function signIn(value: Auth) {
    writeAuth(value);
    setAuth(value);
    client.clear();
  }
  function signOut() {
    writeAuth(null);
    setAuth(null);
    client.clear();
    navigate('/login', { replace: true });
  }
  function updateUser(user: User) {
    setAuth((previous) => {
      if (!previous) return null;
      const next = { ...previous, user };
      writeAuth(next);
      return next;
    });
  }
  useEffect(() => {
    function onUnauthorized() {
      if (!auth?.token) return;
      writeAuth(null);
      setAuth(null);
      client.clear();
      toast.error(vi.errors.UNAUTHORIZED);
      navigate(`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`, {
        replace: true,
      });
    }
    window.addEventListener('carelink:unauthorized', onUnauthorized);
    return () => window.removeEventListener('carelink:unauthorized', onUnauthorized);
  }, [client, navigate, location.pathname, location.search, auth?.token]);
  useEffect(() => {
    if (!auth) return;
    const delay = Date.parse(auth.expiresAt) - Date.now();
    const timer = window.setTimeout(
      () => window.dispatchEvent(new Event('carelink:unauthorized')),
      Math.max(0, delay),
    );
    return () => window.clearTimeout(timer);
  }, [auth]);
  useEffect(() => {
    if (!auth?.token) return;
    let active = true;
    api
      .get<User>('/auth/me')
      .then((response) => {
        if (active) updateUser(response.data);
      })
      .catch(() => {
        if (active) window.dispatchEvent(new Event('carelink:unauthorized'));
      });
    return () => {
      active = false;
    };
  }, [auth?.token]);
  return (
    <AuthContext.Provider value={{ auth, user: auth?.user ?? null, signIn, signOut, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider is required.');
  return context;
}
