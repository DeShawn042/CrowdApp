import { useCallback, useEffect, useState } from 'react';
import { currentUserId, isSupabaseConfigured, supabase } from '@/lib/supabase';

export interface ActiveDestination {
  id: string;
  placeId: string;
  placeName: string;
  placeImage?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  expiresAt: string;
}

const EXPIRY_MS = 4 * 60 * 60 * 1000; // 4 hours

function mapRow(r: any): ActiveDestination {
  return {
    id:         r.id,
    placeId:    r.place_id,
    placeName:  r.place_name,
    placeImage: r.place_image ?? undefined,
    address:    r.address ?? undefined,
    latitude:   r.latitude ?? undefined,
    longitude:  r.longitude ?? undefined,
    createdAt:  r.created_at,
    expiresAt:  r.expires_at,
  };
}

export function useHeadingThere() {
  const [destination, setDestination] = useState<ActiveDestination | null>(null);
  const [loading, setLoading]         = useState(true);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !currentUserId) { setLoading(false); return; }
    const now = new Date().toISOString();
    const { data } = await supabase
      .from('active_destinations')
      .select('*')
      .eq('user_id', currentUserId)
      .gt('expires_at', now)
      .maybeSingle();
    setDestination(data ? mapRow(data) : null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function setHeadingThere(params: {
    placeId: string;
    placeName: string;
    placeImage?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  }): Promise<boolean> {
    if (!isSupabaseConfigured || !currentUserId) return false;
    const expiresAt = new Date(Date.now() + EXPIRY_MS).toISOString();

    // Upsert — replaces any existing destination for this user
    const { error } = await supabase
      .from('active_destinations')
      .upsert(
        {
          user_id:     currentUserId,
          place_id:    params.placeId,
          place_name:  params.placeName,
          place_image: params.placeImage ?? null,
          address:     params.address ?? null,
          latitude:    params.latitude ?? null,
          longitude:   params.longitude ?? null,
          expires_at:  expiresAt,
        },
        { onConflict: 'user_id' },
      );

    if (error) { console.error('useHeadingThere.set:', error.message); return false; }
    await load();
    return true;
  }

  async function clearDestination(): Promise<void> {
    if (!isSupabaseConfigured || !currentUserId) return;
    await supabase
      .from('active_destinations')
      .delete()
      .eq('user_id', currentUserId);
    setDestination(null);
  }

  const isHeadingThere = (placeId: string) =>
    !!destination && destination.placeId === placeId;

  return { destination, loading, setHeadingThere, clearDestination, isHeadingThere, reload: load };
}
