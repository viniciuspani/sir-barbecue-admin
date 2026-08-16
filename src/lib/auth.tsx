import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { supabase, USE_MOCK } from '@/lib/supabase';

type AuthState = {
  loading: boolean;
  isAuthenticated: boolean;
  /** Só super-admins (linha em platform_admins) passam do gate. */
  isAdmin: boolean;
  email: string | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

async function checkIsAdmin(): Promise<boolean> {
  if (USE_MOCK) return true;
  const { data, error } = await supabase.rpc('is_platform_admin');
  if (error) return false;
  return data === true;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [isAdmin, setAdmin] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      if (USE_MOCK) {
        // Sessão fake de dono para desenvolvimento sem backend.
        const mocked = localStorage.getItem('mock-admin') === 'true';
        if (active) {
          setAuthenticated(mocked);
          setAdmin(mocked);
          setEmail(mocked ? 'dono@sirbarbecue.app' : null);
          setLoading(false);
        }
        return;
      }

      const { data } = await supabase.auth.getSession();
      const session = data.session;
      const admin = session ? await checkIsAdmin() : false;
      if (!active) return;
      setAuthenticated(!!session);
      setAdmin(admin);
      setEmail(session?.user.email ?? null);
      setLoading(false);

      supabase.auth.onAuthStateChange((_event, s) => {
        setAuthenticated(!!s);
        setEmail(s?.user.email ?? null);
        if (!s) setAdmin(false);
      });
    }

    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      isAuthenticated,
      isAdmin,
      email,
      signIn: async (mail, password) => {
        if (USE_MOCK) {
          localStorage.setItem('mock-admin', 'true');
          setAuthenticated(true);
          setAdmin(true);
          setEmail('dono@sirbarbecue.app');
          return { error: null };
        }
        const { error } = await supabase.auth.signInWithPassword({ email: mail, password });
        if (error) return { error: 'Credenciais inválidas.' };
        const admin = await checkIsAdmin();
        setAdmin(admin);
        if (!admin) {
          await supabase.auth.signOut();
          return { error: 'Acesso restrito ao dono da aplicação.' };
        }
        return { error: null };
      },
      signOut: async () => {
        if (USE_MOCK) localStorage.removeItem('mock-admin');
        else await supabase.auth.signOut();
        setAuthenticated(false);
        setAdmin(false);
        setEmail(null);
      },
    }),
    [loading, isAuthenticated, isAdmin, email],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve estar dentro de <AuthProvider>');
  return ctx;
}
