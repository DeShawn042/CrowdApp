import { useEffect, useRef, useState } from 'react';
import { Location } from '@/data/mockData';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const WINDOW_MS  = 60 * 60 * 1000; // 60 minutes of active reports
const REFRESH_MS =  5 * 60 * 1000; // re-check every 5 minutes
const MAX        = 5;

export type TrendingLocation = Location & { recentReports: number };

export function useTrending(locations: Location[]) {
  const [trending,    setTrending]    = useState<TrendingLocation[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [loading,     setLoading]     = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchTrending() {
    if (locations.length === 0) return;
    setLoading(true);

    if (!isSupabaseConfigured) {
      setTrending(
        [...locations]
          .sort((a, b) => b.rating - a.rating)
          .slice(0, MAX)
          .map(l => ({ ...l, recentReports: 0 })),
      );
      setLastRefresh(new Date());
      setLoading(false);
      return;
    }

    try {
      // ── Step 1: locations with active crowd reports (last 60 min) ──
      const cutoff = new Date(Date.now() - WINDOW_MS).toISOString();
      const { data: reportRows } = await supabase
        .from('crowd_reports')
        .select('location_id')
        .gte('created_at', cutoff)
        .eq('is_flagged_user', false);

      const reportCounts: Record<string, number> = {};
      for (const r of reportRows ?? []) {
        reportCounts[r.location_id] = (reportCounts[r.location_id] ?? 0) + 1;
      }

      const byReports: TrendingLocation[] = Object.entries(reportCounts)
        .sort(([, a], [, b]) => b - a)
        .flatMap(([id, count]) => {
          const loc = locations.find(l => l.id === id);
          return loc ? [{ ...loc, recentReports: count }] : [];
        })
        .slice(0, MAX);

      const needed = MAX - byReports.length;
      if (needed <= 0) {
        setTrending(byReports);
        setLastRefresh(new Date());
        setLoading(false);
        return;
      }

      // ── Step 2: fill remaining spots with most-reviewed locations ──
      const { data: reviewRows } = await supabase
        .from('reviews')
        .select('location_id');

      const reviewCounts: Record<string, number> = {};
      for (const r of reviewRows ?? []) {
        reviewCounts[r.location_id] = (reviewCounts[r.location_id] ?? 0) + 1;
      }

      const included = new Set(byReports.map(l => l.id));
      const fillers: TrendingLocation[] = [...locations]
        .filter(l => !included.has(l.id))
        .sort((a, b) => {
          const diff = (reviewCounts[b.id] ?? 0) - (reviewCounts[a.id] ?? 0);
          return diff !== 0 ? diff : b.rating - a.rating;
        })
        .slice(0, needed)
        .map(l => ({ ...l, recentReports: 0 }));

      setTrending([...byReports, ...fillers]);
      setLastRefresh(new Date());
    } catch (err) {
      console.warn('useTrending:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (locations.length === 0) return;
    fetchTrending();
    intervalRef.current = setInterval(fetchTrending, REFRESH_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [locations.length]);

  return { trending, lastRefresh, loading, refresh: fetchTrending };
}
