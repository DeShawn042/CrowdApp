import { useCallback, useEffect, useState } from 'react';
import { currentUserId, isSupabaseConfigured, supabase } from '@/lib/supabase';
import { ALL_REPORT_TYPES } from '@/utils/quickReportConfig';
import type { ReportType } from '@/utils/quickReportConfig';

export type { ReportType };

export interface QuickReport {
  id: string;
  placeId: string;
  userId: string;
  reportType: ReportType;
  value: string;
  createdAt: string;
  expiresAt: string;
}

export interface AggregatedReport {
  reportType: ReportType;
  value: string;
  count: number;
}

const COOLDOWN_MS      = 60 * 60 * 1000;           // 60 min — all types except price
const PRICE_EXPIRY_MS  = 60 * 24 * 60 * 60 * 1000; // 60 days — price only

function emptyMyLast(): Record<ReportType, string | null> {
  return Object.fromEntries(ALL_REPORT_TYPES.map(t => [t, null])) as Record<ReportType, string | null>;
}

function mapRow(r: any): QuickReport {
  return {
    id:         r.id,
    placeId:    r.place_id,
    userId:     r.user_id,
    reportType: r.report_type as ReportType,
    value:      r.value,
    createdAt:  r.created_at,
    expiresAt:  r.expires_at,
  };
}

export function useQuickReports(placeId: string) {
  const [reports,      setReports]      = useState<QuickReport[]>([]);
  const [priceReports, setPriceReports] = useState<QuickReport[]>([]);
  const [myLast,       setMyLast]       = useState<Record<ReportType, string | null>>(emptyMyLast);
  const [loading,      setLoading]      = useState(true);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !placeId) { setLoading(false); return; }
    const now    = new Date().toISOString();
    const cutoff = new Date(Date.now() - COOLDOWN_MS).toISOString();
    const uid    = currentUserId; // snapshot — may be '' if not yet signed in

    const [{ data: active }, { data: prices }, { data: mine }] = await Promise.all([
      // All non-price active reports (expire in 60 min)
      supabase
        .from('location_reports')
        .select('id, place_id, user_id, report_type, value, created_at, expires_at')
        .eq('place_id', placeId)
        .neq('report_type', 'price')
        .gt('expires_at', now)
        .order('created_at', { ascending: false }),

      // Price reports expire in 60 days — fetch separately
      supabase
        .from('location_reports')
        .select('id, place_id, user_id, report_type, value, created_at, expires_at')
        .eq('place_id', placeId)
        .eq('report_type', 'price')
        .gt('expires_at', now)
        .order('created_at', { ascending: false }),

      // User's own recent submissions for rate-limiting UI (skip if not signed in)
      uid
        ? supabase
            .from('location_reports')
            .select('report_type, value, created_at')
            .eq('place_id', placeId)
            .eq('user_id', uid)
            .gt('created_at', cutoff)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);

    setReports((active ?? []).map(mapRow));
    setPriceReports((prices ?? []).map(mapRow));

    const last = emptyMyLast();
    for (const r of mine ?? []) {
      const t = r.report_type as ReportType;
      if (!last[t]) last[t] = r.value;
    }
    setMyLast(last);
    setLoading(false);
  }, [placeId]);

  useEffect(() => { load(); }, [load]);

  // All reports combined for display purposes
  const allReports = [...reports, ...priceReports];

  const aggregated: AggregatedReport[] = (() => {
    const map = new Map<string, AggregatedReport>();
    for (const r of allReports) {
      const key = `${r.reportType}::${r.value}`;
      const existing = map.get(key);
      if (existing) existing.count++;
      else map.set(key, { reportType: r.reportType, value: r.value, count: 1 });
    }
    return Array.from(map.values());
  })();

  async function submit(reportType: ReportType, value: string): Promise<boolean> {
    if (!isSupabaseConfigured || !currentUserId) return false;
    const expiryMs  = reportType === 'price' ? PRICE_EXPIRY_MS : COOLDOWN_MS;
    const expiresAt = new Date(Date.now() + expiryMs).toISOString();
    const { error } = await supabase.from('location_reports').insert({
      place_id:    placeId,
      user_id:     currentUserId,
      report_type: reportType,
      value,
      expires_at:  expiresAt,
    });
    if (error) { console.error('useQuickReports.submit:', error.message); return false; }
    // Award quick report points (fire-and-forget)
    supabase.rpc('award_gamification_points', { p_points: 5, p_is_report: false, p_is_pioneer: false })
      .then(() => {}).catch(() => {});
    await load();
    return true;
  }

  function cooldownFor(reportType: ReportType): number {
    const source = reportType === 'price' ? priceReports : reports;
    const match  = [...source]
      .filter(r => r.userId === currentUserId && r.reportType === reportType)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    if (!match) return 0;
    const expiry = reportType === 'price' ? PRICE_EXPIRY_MS : COOLDOWN_MS;
    return Math.max(0, expiry - (Date.now() - new Date(match.createdAt).getTime()));
  }

  return {
    reports: allReports,
    priceReports,
    aggregated,
    myLast,
    loading,
    submit,
    cooldownFor,
    reload: load,
  };
}
