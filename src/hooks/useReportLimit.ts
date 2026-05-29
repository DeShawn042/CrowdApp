import { useEffect, useRef, useState } from 'react';
import { CrowdLevel } from '@/data/mockData';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const COOLDOWN_MS = 60 * 60 * 1000; // 60 minutes
const LEVEL_NUMS: Record<CrowdLevel, number> = { empty: 0, light: 1, moderate: 2, packed: 3 };

interface LastReport {
  crowdLevel: CrowdLevel;
  createdAt: string;
}

export function useReportLimit(locationId: string, userId: string = 'u1') {
  const [lastReport, setLastReport] = useState<LastReport | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function refresh() {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    const { data } = await supabase
      .from('crowd_reports')
      .select('crowd_level, created_at')
      .eq('location_id', locationId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    setLastReport(
      data ? { crowdLevel: data.crowd_level as CrowdLevel, createdAt: data.created_at } : null
    );
    setLoading(false);
  }

  useEffect(() => { refresh(); }, [locationId, userId]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!lastReport) { setCooldownSeconds(0); return; }

    const tick = () => {
      const elapsed = Date.now() - new Date(lastReport.createdAt).getTime();
      setCooldownSeconds(Math.max(0, Math.ceil((COOLDOWN_MS - elapsed) / 1000)));
    };
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [lastReport]);

  // Check and update outlier flag; returns whether user is now flagged
  async function checkOutlier(reportedLevel: CrowdLevel): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    const cutoff = new Date(Date.now() - COOLDOWN_MS).toISOString();
    const { data: recent } = await supabase
      .from('crowd_reports')
      .select('crowd_level')
      .eq('location_id', locationId)
      .neq('user_id', userId)
      .eq('is_flagged_user', false)
      .gte('created_at', cutoff);

    if (!recent || recent.length < 3) return false;

    const avg = recent.reduce((s, r) => s + LEVEL_NUMS[r.crowd_level as CrowdLevel], 0) / recent.length;
    const isDivergent = Math.abs(LEVEL_NUMS[reportedLevel] - avg) >= 2;

    const { data: existing } = await supabase
      .from('user_report_flags')
      .select('divergent_count')
      .eq('user_id', userId)
      .eq('location_id', locationId)
      .maybeSingle();

    const prev = existing?.divergent_count ?? 0;
    const next = isDivergent ? prev + 1 : Math.max(0, prev - 1);
    const isFlagged = next >= 3;

    await supabase.from('user_report_flags').upsert(
      { user_id: userId, location_id: locationId, divergent_count: next, is_flagged: isFlagged, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,location_id' }
    );
    return isFlagged;
  }

  return {
    canReport: cooldownSeconds === 0,
    cooldownSeconds,
    lastReportLevel: lastReport?.crowdLevel ?? null,
    loading,
    refresh,
    checkOutlier,
  };
}

export function formatCooldown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
