import { useEffect, useRef, useState } from 'react';
import { Location } from '@/data/mockData';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const WINDOW_MS   = 2  * 60 * 60 * 1000; // 2 hours
const REFRESH_MS  = 15 * 60 * 1000;       // 15 minutes

export type TrendingLocation = Location & { recentReports: number };

export function useTrending(locations: Location[]) {
  const [trending, setTrending] = useState<TrendingLocation[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchTrending() {
    if (!isSupabaseConfigured || locations.length === 0) {
      // Fallback: top 5 by rating
      setTrending(
        [...locations]
          .sort((a, b) => b.rating - a.rating)
          .slice(0, 5)
          .map(l => ({ ...l, recentReports: 0 }))
      );
      setLastRefresh(new Date());
      return;
    }

    const cutoff = new Date(Date.now() - WINDOW_MS).toISOString();
    const { data } = await supabase
      .from('crowd_reports')
      .select('location_id')
      .gte('created_at', cutoff);

    if (!data || data.length === 0) {
      // No recent reports — fall back to top-rated
      setTrending(
        [...locations]
          .sort((a, b) => b.rating - a.rating)
          .slice(0, 5)
          .map(l => ({ ...l, recentReports: 0 }))
      );
      setLastRefresh(new Date());
      return;
    }

    // Count reports per location
    const counts: Record<string, number> = {};
    for (const r of data) {
      counts[r.location_id] = (counts[r.location_id] ?? 0) + 1;
    }

    const result: TrendingLocation[] = Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .flatMap(([locationId, count]) => {
        const loc = locations.find(l => l.id === locationId);
        return loc ? [{ ...loc, recentReports: count }] : [];
      });

    setTrending(result);
    setLastRefresh(new Date());
  }

  useEffect(() => {
    if (locations.length === 0) return;
    fetchTrending();
    intervalRef.current = setInterval(fetchTrending, REFRESH_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [locations.length]);

  return { trending, lastRefresh, refresh: fetchTrending };
}
