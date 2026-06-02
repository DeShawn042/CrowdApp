import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppUser } from '@/data/mockData';
import { isSupabaseConfigured, setCurrentUser, supabase } from '@/lib/supabase';

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AppUser | null;
  login:  (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<{ needsEmailConfirmation: boolean }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapToAppUser(u: any, isAdmin = false): AppUser {
  const name =
    u.user_metadata?.name ??
    u.user_metadata?.full_name ??
    u.email?.split('@')[0] ??
    'User';
  return {
    id:            u.id,
    name,
    email:         u.email ?? '',
    joinDate:      new Date(u.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    totalReports:  0,
    weeklyReports: 0,
    favoriteVenue: '',
    isAdmin,
  };
}

async function fetchIsAdmin(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { data } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .maybeSingle();
  return data?.is_admin === true;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]         = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    // Restore an existing session on mount (handles page refresh)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const isAdmin = await fetchIsAdmin(session.user.id);
        const appUser = mapToAppUser(session.user, isAdmin);
        setUser(appUser);
        setCurrentUser(session.user.id, appUser.name);
      }
      setIsLoading(false);
    });

    // Keep state in sync with every auth event (sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const isAdmin = await fetchIsAdmin(session.user.id);
        const appUser = mapToAppUser(session.user, isAdmin);
        setUser(appUser);
        setCurrentUser(session.user.id, appUser.name);
      } else {
        setUser(null);
        setCurrentUser(null, null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      const name = email.split('@')[0];
      const appUser: AppUser = { id: 'u1', name, email, joinDate: 'January 2025', totalReports: 0, weeklyReports: 0, favoriteVenue: '' };
      setUser(appUser);
      setCurrentUser('u1', name);
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    // User state updated automatically via onAuthStateChange
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    if (!isSupabaseConfigured) {
      const appUser: AppUser = { id: 'u1', name, email, joinDate: 'January 2025', totalReports: 0, weeklyReports: 0, favoriteVenue: '' };
      setUser(appUser);
      setCurrentUser('u1', name);
      return { needsEmailConfirmation: false };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw new Error(error.message);
    // session is null when Supabase requires email confirmation
    return { needsEmailConfirmation: !!data.user && !data.session };
  }, []);

  const logout = useCallback(async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    setUser(null);
    setCurrentUser(null, null);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, isLoading, user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
