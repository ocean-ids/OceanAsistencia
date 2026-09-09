/**
 * Contexto de autenticación: mantiene el usuario en sesión y expone signIn / signOut.
 * Al arrancar la app, restaura la sesión guardada (si existe).
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';
import { saveSession, clearSession, getStoredUser, getAccessToken, SessionUser } from '../services/auth';

type AuthState = {
  user: SessionUser | null;
  booting: boolean;       // cargando la sesión guardada al inicio
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [booting, setBooting] = useState(true);

  // Restaurar sesión al arrancar
  useEffect(() => {
    (async () => {
      try {
        const token = await getAccessToken();
        const stored = await getStoredUser();
        if (token && stored) {
          setUser(stored);
          // refresca los datos del usuario en segundo plano (no bloquea)
          api.getUser().then(setUser).catch(() => {});
        }
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    const res = await api.login(username, password);
    await saveSession(res.access, res.refresh, res.user);
    setUser(res.user);
  }, []);

  const signOut = useCallback(async () => {
    await api.logout();
    await clearSession();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, booting, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
