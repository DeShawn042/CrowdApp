import { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type TimeFilter = 'today' | 'week' | 'month' | 'all';

export interface AdminStats {
  // Users
  totalUsers:        number;
  newUsersThisWeek:  number;
  newUsersThisMonth: number;
  activeUsers:       number;

  // Crowd reports
  totalReports:      number;
  reportsToday:      number;
  reportsThisWeek:   number;
  reportsThisMonth:  number;
  reportsByLevel:    Record<string, number>;

  // Quick reports
  totalQuickReports:   number;
  quickReportsByType:  Record<string, number>;

  // Locations
  topReportedLocations: { place_id: string; name: string; count: number }[];
  topFavoritedLocations: { location_id: string; count: number }[];
  reportsByCity: Record<string, number>;

  // Engagement
  totalReviews:    number;
  totalFavorites:  number;
  totalWatchlist:  number;
  totalHeadingThere: number;
}

function cutoffFor(filter: TimeFilter): string | null {
  const now = new Date();
  if (filter === 'today') {
    now.setHours(0, 0, 0, 0);
    return now.toISOString();
  }
  if (filter === 'week') {
    now.setDate(now.getDate() - 7);
    return now.toISOString();
  }
  if (filter === 'month') {
    now.setMonth(now.getMonth() - 1);
    return now.toISOString();
  }
  return null; // all time
}

const EMPTY: AdminStats = {
  totalUsers: 0, newUsersThisWeek: 0, newUsersThisMonth: 0, activeUsers: 0,
  totalReports: 0, reportsToday: 0, reportsThisWeek: 0, reportsThisMonth: 0,
  reportsByLevel: {}, quickReportsByType: {}, totalQuickReports: 0,
  topReportedLocations: [], topFavoritedLocations: [], reportsByCity: {},
  totalReviews: 0, totalFavorites: 0, totalWatchlist: 0, totalHeadingThere: 0,
};

function extractCity(address: string): string {
  const parts = address.split(',').map(p => p.trim());
  return parts[1] ?? parts[0] ?? 'Unknown';
}

export function useAdminStats(
  filter: TimeFilter,
  getLocationName?: (id: string) => string | undefined,
  getLocationAddress?: (id: string) => string | undefined,
) {
  const [stats,   setStats]   = useState<AdminStats>(EMPTY);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    setLoading(true);

    const cutoff     = cutoffFor(filter);
    const weekAgo    = new Date(Date.now() - 7  * 86400_000).toISOString();
    const monthAgo   = new Date(Date.now() - 30 * 86400_000).toISOString();
    const todayStart = (() => { const d = new Date(); d.setHours(0,0,0,0); return d.toISOString(); })();

    // Run all queries in parallel
    const [
      { count: totalUsers },
      { count: newUsersWeek },
      { count: newUsersMonth },
      { data: reportRows },
      { count: totalQuickReports },
      { data: quickRows },
      { count: totalReviews },
      { count: totalFavorites },
      { count: totalWatchlist },
      { count: totalHeadingThere },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', monthAgo),
      (() => {
        let q = supabase.from('crowd_reports').select('location_id, crowd_level, user_id, created_at');
        if (cutoff) q = q.gte('created_at', cutoff);
        return q;
      })(),
      (() => {
        let q = supabase.from('location_reports').select('*', { count: 'exact', head: true });
        if (cutoff) q = q.gte('created_at', cutoff);
        return q;
      })(),
      (() => {
        let q = supabase.from('location_reports').select('report_type');
        if (cutoff) q = q.gte('created_at', cutoff);
        return q;
      })(),
      (() => {
        let q = supabase.from('reviews').select('*', { count: 'exact', head: true });
        if (cutoff) q = q.gte('created_at', cutoff);
        return q;
      })(),
      (() => {
        let q = supabase.from('user_favorites').select('*', { count: 'exact', head: true });
        if (cutoff) q = q.gte('created_at', cutoff);
        return q;
      })(),
      (() => {
        let q = supabase.from('watchlist').select('*', { count: 'exact', head: true });
        if (cutoff) q = q.gte('created_at', cutoff);
        return q;
      })(),
      (() => {
        let q = supabase.from('active_destinations').select('*', { count: 'exact', head: true });
        if (cutoff) q = q.gte('created_at', cutoff);
        return q;
      })(),
    ]);

    // Aggregate crowd reports
    const rows = reportRows ?? [];
    const reportsByLevel: Record<string, number> = {};
    const locationCounts: Record<string, number> = {};
    const activeUserIds = new Set<string>();
    let reportsToday = 0, reportsThisWeek = 0, reportsThisMonth = 0;

    for (const r of rows) {
      reportsByLevel[r.crowd_level] = (reportsByLevel[r.crowd_level] ?? 0) + 1;
      locationCounts[r.location_id] = (locationCounts[r.location_id] ?? 0) + 1;
      activeUserIds.add(r.user_id);
      if (r.created_at >= todayStart)  reportsToday++;
      if (r.created_at >= weekAgo)     reportsThisWeek++;
      if (r.created_at >= monthAgo)    reportsThisMonth++;
    }

    const topReportedLocations = Object.entries(locationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([place_id, count]) => ({
        place_id,
        name: getLocationName?.(place_id) ?? 'Unknown Location',
        count,
      }));

    // City breakdown from all location counts
    const reportsByCity: Record<string, number> = {};
    for (const [place_id, count] of Object.entries(locationCounts)) {
      const address = getLocationAddress?.(place_id);
      const city = address ? extractCity(address) : 'Unknown';
      reportsByCity[city] = (reportsByCity[city] ?? 0) + count;
    }

    // Quick report type breakdown
    const quickReportsByType: Record<string, number> = {};
    for (const r of quickRows ?? []) {
      quickReportsByType[r.report_type] = (quickReportsByType[r.report_type] ?? 0) + 1;
    }

    setStats({
      totalUsers:            totalUsers ?? 0,
      newUsersThisWeek:      newUsersWeek ?? 0,
      newUsersThisMonth:     newUsersMonth ?? 0,
      activeUsers:           activeUserIds.size,
      totalReports:          rows.length,
      reportsToday,
      reportsThisWeek,
      reportsThisMonth,
      reportsByLevel,
      totalQuickReports:     totalQuickReports ?? 0,
      quickReportsByType,
      topReportedLocations,
      topFavoritedLocations: [],
      reportsByCity,
      totalReviews:          totalReviews ?? 0,
      totalFavorites:        totalFavorites ?? 0,
      totalWatchlist:        totalWatchlist ?? 0,
      totalHeadingThere:     totalHeadingThere ?? 0,
    });
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load, getLocationName, getLocationAddress]);

  return { stats, loading, reload: load };
}
