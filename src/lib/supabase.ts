import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL  ?? '';
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = url.length > 0 && key.length > 0;

// ── Singleton guard ───────────────────────────────────────────
// Expo's web renderer evaluates modules on both the server (SSR)
// and the client (hydration). Without this guard a second
// GoTrueClient is created during hydration, producing the
// "Multiple GoTrueClient instances" warning and risking session
// de-sync between the two instances.
const g = global as typeof globalThis & { _prescoutSupabase?: SupabaseClient };

if (!g._prescoutSupabase) {
  g._prescoutSupabase = createClient(
    url || 'https://placeholder.supabase.co',
    key || 'placeholder-anon-key',
    {
      auth: {
        autoRefreshToken:   true,
        persistSession:     true,
        detectSessionInUrl: false,
      },
    }
  );
}

export const supabase: SupabaseClient = g._prescoutSupabase;

// ── Current user ─────────────────────────────────────────────
// Updated by AuthContext on every auth state change so hooks can
// read the latest userId without prop-drilling.
export let currentUserId   = '';
export let currentUserName = 'User';

export function setCurrentUser(id: string | null, name: string | null) {
  currentUserId   = id   ?? '';
  currentUserName = name ?? 'User';
}
