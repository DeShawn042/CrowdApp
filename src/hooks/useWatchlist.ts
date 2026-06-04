import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { currentUserId, isSupabaseConfigured, supabase } from '@/lib/supabase';

const isExpoGo = Constants.appOwnership === 'expo';
import type { CrowdLevel } from '@/data/mockData';
import { CROWD_LABELS } from '@/utils/crowdUtils';

export type AlertLevel = CrowdLevel; // 'empty' | 'light' | 'moderate' | 'packed'

export interface WatchlistItem {
  id: string;
  placeId: string;
  placeName: string;
  placeImage?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  alertLevel: AlertLevel;
  isActive: boolean;
  notifiedAt?: string;
  createdAt: string;
  expiresAt: string;
}

const EXPIRY_MS        = 24 * 60 * 60 * 1000; // 24 hours
const POLL_INTERVAL_MS = 15 * 60 * 1000;       // 15 minutes
const NOTIFY_COOLDOWN  = 30 * 60 * 1000;       // 30 min between notifications

const LEVEL_ORDER: Record<AlertLevel, number> = {
  empty: 0, light: 1, moderate: 2, packed: 3,
};

const LEVEL_EMOJI: Record<AlertLevel, string> = {
  empty: '🟢', light: '🟡', moderate: '🟠', packed: '🔴',
};

function mapRow(r: any): WatchlistItem {
  return {
    id:         r.id,
    placeId:    r.place_id,
    placeName:  r.place_name,
    placeImage: r.place_image ?? undefined,
    address:    r.address ?? undefined,
    latitude:   r.latitude ?? undefined,
    longitude:  r.longitude ?? undefined,
    alertLevel: r.alert_level as AlertLevel,
    isActive:   r.is_active,
    notifiedAt: r.notified_at ?? undefined,
    createdAt:  r.created_at,
    expiresAt:  r.expires_at,
  };
}

export function useWatchlist() {
  const [items,   setItems]   = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !currentUserId) { setLoading(false); return; }
    const now = new Date().toISOString();
    const { data } = await supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', currentUserId)
      .eq('is_active', true)
      .gt('expires_at', now)
      .order('created_at', { ascending: false });
    setItems((data ?? []).map(mapRow));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Poll every 15 min and check crowd levels ──────────────────
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const timer = setInterval(checkWatchlist, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [items]);

  async function checkWatchlist() {
    if (!items.length) return;
    const now = Date.now();
    const cutoff = new Date(now - 60 * 60 * 1000).toISOString(); // last hour

    for (const item of items) {
      // Skip if notified recently
      if (item.notifiedAt) {
        const lastNotify = new Date(item.notifiedAt).getTime();
        if (now - lastNotify < NOTIFY_COOLDOWN) continue;
      }

      // Get recent crowd reports for this place
      const { data: reports } = await supabase
        .from('crowd_reports')
        .select('crowd_level')
        .eq('location_id', item.placeId)
        .eq('is_flagged_user', false)
        .gte('created_at', cutoff);

      if (!reports?.length) continue;

      // Calculate majority crowd level
      const counts: Record<string, number> = {};
      for (const r of reports) counts[r.crowd_level] = (counts[r.crowd_level] ?? 0) + 1;
      const currentLevel = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as AlertLevel;

      // Notify if current level <= alert threshold (e.g. alert on 'light', notify at 'empty' or 'light')
      if (LEVEL_ORDER[currentLevel] <= LEVEL_ORDER[item.alertLevel]) {
        await sendWatchlistNotification(item, currentLevel);
        await supabase
          .from('watchlist')
          .update({ notified_at: new Date().toISOString() })
          .eq('id', item.id);
      }
    }
  }

  async function addToWatchlist(params: {
    placeId: string;
    placeName: string;
    placeImage?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    alertLevel: AlertLevel;
  }): Promise<boolean> {
    if (!isSupabaseConfigured || !currentUserId) return false;
    const expiresAt = new Date(Date.now() + EXPIRY_MS).toISOString();
    const { error } = await supabase.from('watchlist').insert({
      user_id:     currentUserId,
      place_id:    params.placeId,
      place_name:  params.placeName,
      place_image: params.placeImage ?? null,
      address:     params.address ?? null,
      latitude:    params.latitude ?? null,
      longitude:   params.longitude ?? null,
      alert_level: params.alertLevel,
      expires_at:  expiresAt,
    });
    if (error) { console.error('useWatchlist.add:', error.message); return false; }
    await load();
    return true;
  }

  async function removeFromWatchlist(id: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    await supabase.from('watchlist').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
  }

  async function renewWatchlistItem(id: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    const expiresAt = new Date(Date.now() + EXPIRY_MS).toISOString();
    await supabase.from('watchlist').update({ expires_at: expiresAt }).eq('id', id);
    await load();
  }

  function isWatching(placeId: string): WatchlistItem | undefined {
    return items.find(i => i.placeId === placeId);
  }

  return { items, loading, addToWatchlist, removeFromWatchlist, renewWatchlistItem, isWatching, reload: load };
}

async function sendWatchlistNotification(item: WatchlistItem, currentLevel: AlertLevel) {
  if (Platform.OS === 'web' || isExpoGo) return;
  try {
    const Notifications = await import('expo-notifications');
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `👁️ ${item.placeName}`,
        body: `${LEVEL_EMOJI[currentLevel]} Now ${CROWD_LABELS[currentLevel]} — good time to go!`,
        data: { locationId: item.placeId },
      },
      trigger: null,
    });
  } catch (e) {
    console.warn('watchlist notification failed:', e);
  }
}
