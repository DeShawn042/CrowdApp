import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { CrowdLevel, Location, MOCK_LOCATIONS, Report } from '@/data/mockData';
import { useAuth } from '@/context/AuthContext';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { averageReports } from '@/utils/crowdUtils';

interface AppContextValue {
  locations: Location[];
  reports: Report[];
  myReports: Report[];
  savedLocationIds: string[];
  recentLocationIds: string[];
  getLocationById: (id: string) => Location | undefined;
  getReportsForLocation: (id: string) => Report[];
  submitReport: (locationId: string, level: CrowdLevel, comment?: string) => Promise<void>;
  toggleSaved: (id: string) => void;
  addRecentLocation: (id: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const LEVEL_NUMS: Record<CrowdLevel, number> = { empty: 0, light: 1, moderate: 2, packed: 3 };

function mapRow(r: any): Report {
  return {
    id:         r.id,
    locationId: r.location_id,
    userId:     r.user_id,
    userName:   r.user_name,
    crowdLevel: r.crowd_level as CrowdLevel,
    comment:    r.comment ?? undefined,
    timestamp:  r.created_at,
  };
}

async function getOutlierFlag(locationId: string, userId: string, level: CrowdLevel): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: recent } = await supabase
    .from('crowd_reports')
    .select('crowd_level')
    .eq('location_id', locationId)
    .neq('user_id', userId)
    .eq('is_flagged_user', false)
    .gte('created_at', cutoff);

  if (!recent || recent.length < 3) return false;

  const avg = recent.reduce((s, r) => s + LEVEL_NUMS[r.crowd_level as CrowdLevel], 0) / recent.length;
  const isDivergent = Math.abs(LEVEL_NUMS[level] - avg) >= 2;

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

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Derive user identity directly from AuthContext so timing is always correct
  const { user } = useAuth();
  const userId   = user?.id   ?? null;
  const userName = user?.name ?? 'User';

  const [locations,       setLocations]       = useState<Location[]>(MOCK_LOCATIONS);
  // Start empty — populated from Supabase, not mock data
  const [reports,         setReports]         = useState<Report[]>([]);
  const [myReports,       setMyReports]       = useState<Report[]>([]);
  const [savedLocationIds, setSavedLocationIds] = useState<string[]>([]);
  const [recentLocationIds, setRecentLocationIds] = useState<string[]>([]);

  // ── Loaders ────────────────────────────────────────────────

  /** Recent reports from ALL users (last 60 min). Used for location detail cards. */
  const loadRecentReports = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('crowd_reports')
      .select('id, location_id, user_id, user_name, crowd_level, comment, created_at')
      .gte('created_at', cutoff)
      .eq('is_flagged_user', false)
      .order('created_at', { ascending: false });

    if (error) { console.warn('loadRecentReports:', error.message); return; }

    const mapped = (data ?? []).map(mapRow);
    setReports(mapped);

    // Update each location's current crowd level from live data
    setLocations(locs => locs.map(l => {
      const locReports = mapped.filter(r => r.locationId === l.id);
      return locReports.length > 0 ? { ...l, currentCrowd: averageReports(locReports) } : l;
    }));
  }, []);

  /** Current user's full report history (all time). Used on profile screen. */
  const loadMyReports = useCallback(async (uid: string) => {
    if (!isSupabaseConfigured) return;
    const { data, error } = await supabase
      .from('crowd_reports')
      .select('id, location_id, user_id, user_name, crowd_level, comment, created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) { console.warn('loadMyReports:', error.message); return; }
    setMyReports((data ?? []).map(mapRow));
  }, []);

  /** Current user's saved/hearted locations. */
  const loadFavorites = useCallback(async (uid: string) => {
    if (!isSupabaseConfigured) return;
    const { data, error } = await supabase
      .from('user_favorites')
      .select('location_id')
      .eq('user_id', uid);

    if (error) { console.warn('loadFavorites:', error.message); return; }
    setSavedLocationIds((data ?? []).map((f: any) => f.location_id));
  }, []);

  // ── Effects ────────────────────────────────────────────────

  // Public reports — load on mount, independent of auth
  useEffect(() => {
    loadRecentReports();
  }, [loadRecentReports]);

  // User-specific data — (re)load whenever the logged-in user changes
  useEffect(() => {
    if (!userId) {
      setMyReports([]);
      setSavedLocationIds([]);
      return;
    }
    loadMyReports(userId);
    loadFavorites(userId);
  }, [userId, loadMyReports, loadFavorites]);

  // ── Context methods ────────────────────────────────────────

  const getLocationById = useCallback(
    (id: string) => locations.find(l => l.id === id),
    [locations]
  );

  const getReportsForLocation = useCallback(
    (id: string) => {
      // `reports` is the Supabase source of truth (already filtered to last 60 min).
      // Client-side timestamp filter guards against reports that expire mid-session.
      const cutoff = Date.now() - 60 * 60 * 1000;
      return reports.filter(
        r => r.locationId === id && new Date(r.timestamp).getTime() > cutoff
      );
    },
    [reports]
  );

  const submitReport = useCallback(
    async (locationId: string, level: CrowdLevel, comment?: string) => {
      if (!userId) return;

      // Optimistic local update so the UI responds instantly
      const optimistic: Report = {
        id:         `opt-${Date.now()}`,
        locationId,
        userId,
        userName,
        crowdLevel: level,
        comment,
        timestamp:  new Date().toISOString(),
      };

      setReports(prev => [optimistic, ...prev]);
      setMyReports(prev => [optimistic, ...prev]);
      setLocations(locs => locs.map(l => {
        if (l.id !== locationId) return l;
        const relevant = [optimistic, ...reports].filter(
          r => r.locationId === locationId &&
               Date.now() - new Date(r.timestamp).getTime() < 60 * 60 * 1000
        );
        return { ...l, currentCrowd: averageReports(relevant) };
      }));

      if (!isSupabaseConfigured) return;

      try {
        const isFlaggedUser = await getOutlierFlag(locationId, userId, level);
        const { error } = await supabase.from('crowd_reports').insert({
          location_id:     locationId,
          user_id:         userId,
          user_name:       userName,
          crowd_level:     level,
          comment:         comment ?? null,
          is_flagged_user: isFlaggedUser,
        });

        if (error) {
          console.warn('submitReport:', error.message);
          return;
        }

        await loadRecentReports();
        await loadMyReports(userId);
      } catch (err) {
        console.warn('submitReport failed:', err);
      }
    },
    [reports, userId, userName, loadRecentReports, loadMyReports]
  );

  const toggleSaved = useCallback((id: string) => {
    if (!userId) return;
    setSavedLocationIds(prev => {
      const isSaved = prev.includes(id);
      if (isSupabaseConfigured) {
        if (isSaved) {
          supabase.from('user_favorites').delete().eq('user_id', userId).eq('location_id', id);
        } else {
          supabase.from('user_favorites').insert({ user_id: userId, location_id: id });
        }
      }
      return isSaved ? prev.filter(x => x !== id) : [...prev, id];
    });
  }, [userId]);

  const addRecentLocation = useCallback((id: string) => {
    setRecentLocationIds(prev => [id, ...prev.filter(x => x !== id)].slice(0, 10));
  }, []);

  return (
    <AppContext.Provider value={{
      locations, reports, myReports,
      savedLocationIds, recentLocationIds,
      getLocationById, getReportsForLocation,
      submitReport, toggleSaved, addRecentLocation,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
