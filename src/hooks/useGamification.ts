import { useCallback, useEffect, useRef, useState } from 'react';
import { currentUserId, isSupabaseConfigured, supabase } from '@/lib/supabase';
import { BADGES, getLevelProgress, LAUNCH_DATE } from '@/constants/gamification';
import type { Level } from '@/constants/gamification';

export interface GamificationData {
  totalPoints:   number;
  weeklyPoints:  number;
  currentStreak: number;
  longestStreak: number;
  pioneerCount:  number;
  totalReports:  number;
  peopleHelped:  number;
  earnedBadgeIds: Set<string>;
}

export interface PointsResult {
  pointsAwarded: number;
  streakBonus:   number;
  newStreak:     number;
  totalPoints:   number;
}

export interface LevelInfo {
  current:      Level;
  next:         Level | null;
  progress:     number;
  pointsToNext: number;
}

const EMPTY: GamificationData = {
  totalPoints: 0, weeklyPoints: 0, currentStreak: 0, longestStreak: 0,
  pioneerCount: 0, totalReports: 0, peopleHelped: 0, earnedBadgeIds: new Set(),
};

export function useGamification() {
  const [data,    setData]    = useState<GamificationData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const onPointsCb = useRef<((r: PointsResult) => void) | null>(null);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !currentUserId) { setLoading(false); return; }
    const uid = currentUserId;
    const [gamRow, badgesRow] = await Promise.all([
      supabase.from('user_gamification').select('*').eq('user_id', uid).maybeSingle(),
      supabase.from('user_badges').select('badge_id').eq('user_id', uid),
    ]);
    const g = gamRow.data;
    setData({
      totalPoints:    g?.total_points    ?? 0,
      weeklyPoints:   g?.weekly_points   ?? 0,
      currentStreak:  g?.current_streak  ?? 0,
      longestStreak:  g?.longest_streak  ?? 0,
      pioneerCount:   g?.pioneer_count   ?? 0,
      totalReports:   g?.total_reports   ?? 0,
      peopleHelped:   g?.people_helped   ?? 0,
      earnedBadgeIds: new Set((badgesRow.data ?? []).map((b: any) => b.badge_id as string)),
    });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function awardPoints(
    points: number,
    options: { isReport?: boolean; isPioneer?: boolean } = {},
  ): Promise<PointsResult | null> {
    if (!isSupabaseConfigured || !currentUserId) return null;
    const { data: result, error } = await supabase.rpc('award_gamification_points', {
      p_points:     points,
      p_is_report:  options.isReport  ?? false,
      p_is_pioneer: options.isPioneer ?? false,
    });
    if (error) { console.warn('awardPoints:', error.message); return null; }
    const r: PointsResult = {
      pointsAwarded: result.points_awarded,
      streakBonus:   result.streak_bonus,
      newStreak:     result.new_streak,
      totalPoints:   result.total_points,
    };
    onPointsCb.current?.(r);
    load(); // refresh in background
    return r;
  }

  async function awardBadge(badgeId: string): Promise<boolean> {
    if (!isSupabaseConfigured || !currentUserId) return false;
    if (data.earnedBadgeIds.has(badgeId)) return false;
    const { error } = await supabase.from('user_badges').insert({
      user_id:  currentUserId,
      badge_id: badgeId,
    });
    if (error && error.code !== '23505') {
      console.warn('awardBadge:', error.message);
      return false;
    }
    return true;
  }

  async function checkAndAwardBadges(context: {
    totalReports?:     number;
    quickReports?:     number;
    currentStreak?:    number;
    watchlistCount?:   number;
    headingThereCount?: number;
    reviewCount?:      number;
    reviewsWithPhotos?: number;
    isPioneer?:        boolean;
    joinDate?:         string;
  }) {
    const t = context.totalReports       ?? data.totalReports;
    const s = context.currentStreak      ?? data.currentStreak;
    const q = context.quickReports       ?? 0;
    const w = context.watchlistCount     ?? 0;
    const h = context.headingThereCount  ?? 0;
    const r = context.reviewCount        ?? 0;
    const p = context.reviewsWithPhotos  ?? 0;

    const toCheck: [string, boolean][] = [
      ['first_report',  t >= 1],
      ['quick_draw',    q >= 5],
      ['pioneer',       context.isPioneer ?? false],
      ['on_the_move',   h >= 5],
      ['watchful_eye',  w >= 5],
      ['consistent',    s >= 3],
      ['dedicated',     s >= 7],
      ['century',       t >= 100],
      ['reviewer',      r >= 5],
      ['photographer',  p >= 3],
      ['early_adopter', (() => {
        if (!context.joinDate) return false;
        const joined = new Date(context.joinDate);
        const days = (joined.getTime() - LAUNCH_DATE.getTime()) / 86400000;
        return days <= 30;
      })()],
    ];

    await Promise.all(
      toCheck.filter(([, cond]) => cond).map(([id]) => awardBadge(id)),
    );
    load();
  }

  function onPointsAwarded(cb: (r: PointsResult) => void) {
    onPointsCb.current = cb;
  }

  const levelInfo: LevelInfo = getLevelProgress(data.totalPoints);

  return { data, loading, load, awardPoints, awardBadge, checkAndAwardBadges, onPointsAwarded, levelInfo };
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  rank:         number;
  userId:       string;
  displayName:  string;
  levelName:    string;
  levelIcon:    string;
  weeklyPoints: number;
  isCurrentUser: boolean;
}

export async function fetchLeaderboard(): Promise<{
  top10: LeaderboardEntry[];
  myEntry: LeaderboardEntry | null;
}> {
  if (!isSupabaseConfigured || !currentUserId) return { top10: [], myEntry: null };

  const { data: rows, error } = await supabase.rpc('get_weekly_leaderboard');
  if (error) { console.warn('fetchLeaderboard:', error.message); return { top10: [], myEntry: null }; }

  const entries: LeaderboardEntry[] = (rows ?? []).map((r: any, i: number) => {
    const { getLevel } = require('@/constants/gamification');
    const lvl = getLevel(r.total_points ?? 0);
    return {
      rank:          i + 1,
      userId:        r.user_id,
      displayName:   r.display_name ?? 'Scout',
      levelName:     lvl.name,
      levelIcon:     lvl.icon,
      weeklyPoints:  r.weekly_points ?? 0,
      isCurrentUser: r.user_id === currentUserId,
    };
  });

  const top10   = entries.slice(0, 10);
  const myEntry = entries.find(e => e.isCurrentUser) ?? null;
  return { top10, myEntry };
}
