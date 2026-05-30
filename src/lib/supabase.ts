import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL  ?? '';
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = url.length > 0 && key.length > 0;


export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  key || 'placeholder-anon-key',
  {
    auth: {
      autoRefreshToken:   true,
      persistSession:     true,   // uses localStorage on web, memory on native
      detectSessionInUrl: false,
    },
  }
);

// Module-level current user — updated by AuthContext on every auth state change.
// Hooks (useReviews, useReportLimit, useBusinessClaim, AppContext) read these
// so they always operate on the authenticated user without prop-drilling.
export let currentUserId   = 'u1';
export let currentUserName = 'User';

export function setCurrentUser(id: string | null, name: string | null) {
  currentUserId   = id   || 'u1';
  currentUserName = name || 'User';
}
