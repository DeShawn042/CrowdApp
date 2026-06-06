import { useCallback, useEffect, useState } from 'react';
import { currentUserId, isSupabaseConfigured, supabase } from '@/lib/supabase';

export interface ImpactStats {
  crowdReports: number;
  quickReports: number;
  reviews: number;
  watchlistUsed: number;
  headingThereUsed: number;
}

export function useImpactStats() {
  const [stats, setStats] = useState<ImpactStats>({
    crowdReports: 0,
    quickReports: 0,
    reviews: 0,
    watchlistUsed: 0,
    headingThereUsed: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!isSupabaseConfigured || !currentUserId) { setLoading(false); return; }

    const uid = currentUserId;
    const [crowd, quick, reviews, watchlist, destinations] = await Promise.all([
      supabase.from('crowd_reports').select('*', { count: 'exact', head: true }).eq('user_id', uid),
      supabase.from('location_reports').select('*', { count: 'exact', head: true }).eq('user_id', uid),
      supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('user_id', uid),
      supabase.from('watchlist').select('*', { count: 'exact', head: true }).eq('user_id', uid),
      supabase.from('active_destinations').select('*', { count: 'exact', head: true }).eq('user_id', uid),
    ]);

    setStats({
      crowdReports:     crowd.count ?? 0,
      quickReports:     quick.count ?? 0,
      reviews:          reviews.count ?? 0,
      watchlistUsed:    watchlist.count ?? 0,
      headingThereUsed: destinations.count ?? 0,
    });
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { stats, loading, refresh: fetch };
}
