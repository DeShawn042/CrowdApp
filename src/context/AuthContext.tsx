import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { AppUser } from '@/data/mockData';
import { isSupabaseConfigured, setCurrentUser, supabase } from '@/lib/supabase';
import {
  authenticateWithBiometric,
  checkBiometricAvailability,
  getBiometricEnabled,
} from '@/hooks/useBiometric';

const ONBOARDING_KEY = 'prescout_has_seen_onboarding';
async function markOnboardingSeen() {
  await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
}

interface AuthContextValue {
  isAuthenticated:    boolean;
  isLoading:          boolean;
  isBiometricRequired: boolean;
  user:               AppUser | null;
  login:              (email: string, password: string) => Promise<void>;
  signup:             (name: string, email: string, password: string) => Promise<{ needsEmailConfirmation: boolean }>;
  loginWithApple:     () => Promise<void>;
  loginWithGoogle:    () => Promise<void>;
  logout:             () => Promise<void>;
  deleteAccount:      () => Promise<void>;
  unlockWithBiometric: () => Promise<boolean>;
  cancelBiometric:    () => Promise<void>;
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

async function upsertProfile(userId: string, fields: { name?: string; avatar_url?: string }) {
  if (!isSupabaseConfigured) return;
  await supabase
    .from('profiles')
    .upsert({ id: userId, ...fields }, { onConflict: 'id' });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,               setUser]               = useState<AppUser | null>(null);
  const [isLoading,          setIsLoading]          = useState(true);
  const [isBiometricRequired, setIsBiometricRequired] = useState(false);
  const pendingUserRef = useRef<AppUser | null>(null);

  // Configure Google Sign-In on mount (no-op on web)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    import('@react-native-google-signin/google-signin').then(({ GoogleSignin }) => {
      GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
        offlineAccess: false,
      });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const isAdmin = await fetchIsAdmin(session.user.id);
        const appUser = mapToAppUser(session.user, isAdmin);

        // Gate with biometrics if the user has enabled it
        const biometricEnabled   = await getBiometricEnabled();
        const { available }      = await checkBiometricAvailability();
        if (biometricEnabled && available) {
          pendingUserRef.current = appUser;
          setIsBiometricRequired(true);
        } else {
          setUser(appUser);
          setCurrentUser(appUser.id, appUser.name);
        }
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const isAdmin = await fetchIsAdmin(session.user.id);
        const appUser = mapToAppUser(session.user, isAdmin);
        // Only update if not currently gated (biometric gate handles its own unlock)
        if (!pendingUserRef.current) {
          setUser(appUser);
          setCurrentUser(appUser.id, appUser.name);
        }
      } else {
        setUser(null);
        setCurrentUser(null, null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Biometric gate ────────────────────────────────────────────
  const unlockWithBiometric = useCallback(async (): Promise<boolean> => {
    const success = await authenticateWithBiometric('Verify your identity to access Prescout');
    if (success && pendingUserRef.current) {
      const u = pendingUserRef.current;
      pendingUserRef.current = null;
      setUser(u);
      setCurrentUser(u.id, u.name);
      setIsBiometricRequired(false);
    }
    return success;
  }, []);

  const cancelBiometric = useCallback(async () => {
    // User chose to fall back to password — clear the pending session
    pendingUserRef.current = null;
    setIsBiometricRequired(false);
    if (isSupabaseConfigured) await supabase.auth.signOut();
  }, []);

  // ── Email / password ─────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      const name = email.split('@')[0];
      const appUser: AppUser = { id: 'u1', name, email, joinDate: 'January 2025', totalReports: 0, weeklyReports: 0, favoriteVenue: '' };
      setUser(appUser);
      setCurrentUser('u1', name);
      await markOnboardingSeen();
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    await markOnboardingSeen();
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    if (!isSupabaseConfigured) {
      const appUser: AppUser = { id: 'u1', name, email, joinDate: 'January 2025', totalReports: 0, weeklyReports: 0, favoriteVenue: '' };
      setUser(appUser);
      setCurrentUser('u1', name);
      await markOnboardingSeen();
      return { needsEmailConfirmation: false };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw new Error(error.message);
    await markOnboardingSeen();
    return { needsEmailConfirmation: !!data.user && !data.session };
  }, []);

  // ── Apple Sign-In ─────────────────────────────────────────────
  const loginWithApple = useCallback(async () => {
    const AppleAuth = await import('expo-apple-authentication');
    const credential = await AppleAuth.signInAsync({
      requestedScopes: [
        AppleAuth.AppleAuthenticationScope.FULL_NAME,
        AppleAuth.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) throw new Error('Apple Sign-In failed: no identity token');

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });
    if (error) throw new Error(error.message);

    // Apple only provides the name on the very first sign-in
    const givenName  = credential.fullName?.givenName  ?? '';
    const familyName = credential.fullName?.familyName ?? '';
    const fullName   = [givenName, familyName].filter(Boolean).join(' ');
    if (fullName && data.user) {
      await upsertProfile(data.user.id, { name: fullName });
      await supabase.auth.updateUser({ data: { name: fullName } });
    }

    await markOnboardingSeen();
  }, []);

  // ── Google Sign-In ────────────────────────────────────────────
  const loginWithGoogle = useCallback(async () => {
    const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } =
      await import('@react-native-google-signin/google-signin');

    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    if (!isSuccessResponse(response)) {
      if (isErrorWithCode(response) && response.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new Error('CANCELLED');
      }
      throw new Error('Google Sign-In failed');
    }

    const idToken = response.data.idToken;
    if (!idToken) throw new Error('Google Sign-In failed: no ID token');

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
    if (error) throw new Error(error.message);

    // Sync name + photo from Google profile
    const googleUser = response.data.user;
    if (data.user && googleUser) {
      await upsertProfile(data.user.id, {
        name:       googleUser.name    ?? undefined,
        avatar_url: googleUser.photo   ?? undefined,
      });
    }

    await markOnboardingSeen();
  }, []);

  // ── Logout / delete ───────────────────────────────────────────
  const logout = useCallback(async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    setUser(null);
    setCurrentUser(null, null);
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setUser(null);
      setCurrentUser(null, null);
      await AsyncStorage.clear();
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (uid) {
      await supabase
        .from('reviews')
        .update({ display_name: 'Deleted User', user_id: null })
        .eq('user_id', uid);

      const tables = [
        'crowd_reports', 'user_favorites', 'business_claims',
        'business_owner_info', 'review_responses', 'user_report_flags',
        'location_reports', 'active_destinations', 'watchlist',
      ];
      await Promise.all(tables.map(t => supabase.from(t).delete().eq('user_id', uid)));

      const { error: rpcError } = await supabase.rpc('delete_user_account');
      if (rpcError) console.warn('delete_user_account RPC:', rpcError.message);
    }
    await supabase.auth.signOut();
    setUser(null);
    setCurrentUser(null, null);
    await AsyncStorage.clear();
  }, []);

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!user,
      isLoading,
      isBiometricRequired,
      user,
      login,
      signup,
      loginWithApple,
      loginWithGoogle,
      logout,
      deleteAccount,
      unlockWithBiometric,
      cancelBiometric,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
