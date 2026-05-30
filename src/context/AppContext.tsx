import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  CrowdLevel,
  Location,
  MOCK_LOCATIONS,
  MOCK_REPORTS,
  MY_REPORTS,
  Report,
} from '@/data/mockData';
import { currentUserId, currentUserName, isSupabaseConfigured, supabase } from '@/lib/supabase';
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

async function resolveOutlierFlag(locationId: string, userId: string, reportedLevel: CrowdLevel): Promise<boolean> {
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

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [locations, setLocations] = useState<Location[]>(MOCK_LOCATIONS);
  const [reports, setReports] = useState<Report[]>(MOCK_REPORTS);
  const [myReports, setMyReports] = useState<Report[]>(MY_REPORTS);
  const [savedLocationIds, setSavedLocationIds] = useState<string[]>([]);
  const [recentLocationIds, setRecentLocationIds] = useState<string[]>(['1', '3', '2']);

  // Load favorites from Supabase on mount
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase
      .from('user_favorites')
      .select('location_id')
      .eq('user_id', currentUserId)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setSavedLocationIds(data.map((f: { location_id: string }) => f.location_id));
        }
      });
  }, []);

  const getLocationById = useCallback(
    (id: string) => locations.find(l => l.id === id),
    [locations]
  );

  const getReportsForLocation = useCallback(
    (id: string) => {
      const cutoff = Date.now() - 60 * 60 * 1000;
      return [...reports, ...myReports].filter(
        r => r.locationId === id && new Date(r.timestamp).getTime() > cutoff
      );
    },
    [reports, myReports]
  );

  const submitReport = useCallback(
    async (locationId: string, level: CrowdLevel, comment?: string) => {
      const newReport: Report = {
        id: `r${Date.now()}`,
        locationId,
        userId:    currentUserId,
        userName:  currentUserName,
        crowdLevel: level,
        comment,
        timestamp: new Date().toISOString(),
      };

      // Optimistic local update
      setMyReports(prev => {
        const updated = [newReport, ...prev];
        const cutoff = Date.now() - 60 * 60 * 1000;
        const recent = [
          ...updated.filter(r => r.locationId === locationId && new Date(r.timestamp).getTime() > cutoff),
          ...reports.filter(r => r.locationId === locationId && new Date(r.timestamp).getTime() > cutoff),
        ];
        setLocations(locs =>
          locs.map(l => l.id === locationId ? { ...l, currentCrowd: averageReports(recent) } : l)
        );
        return updated;
      });

      // Persist to Supabase (fire-and-forget, doesn't block the UI)
      try {
        const isFlaggedUser = await resolveOutlierFlag(locationId, currentUserId, level);
        if (isSupabaseConfigured) {
          await supabase.from('crowd_reports').insert({
            location_id: locationId,
            user_id: currentUserId,
            user_name: currentUserName,
            crowd_level: level,
            comment: comment ?? null,
            is_flagged_user: isFlaggedUser,
          });
        }
      } catch (err) {
        console.warn('Supabase report persist failed:', err);
      }
    },
    [reports]
  );

  const toggleSaved = useCallback((id: string) => {
    setSavedLocationIds(prev => {
      const isSaved = prev.includes(id);
      if (isSupabaseConfigured) {
        if (isSaved) {
          supabase.from('user_favorites').delete().eq('user_id', currentUserId).eq('location_id', id);
        } else {
          supabase.from('user_favorites').insert({ user_id: currentUserId, location_id: id });
        }
      }
      return isSaved ? prev.filter(x => x !== id) : [...prev, id];
    });
  }, []);

  const addRecentLocation = useCallback((id: string) => {
    setRecentLocationIds(prev => [id, ...prev.filter(x => x !== id)].slice(0, 10));
  }, []);

  return (
    <AppContext.Provider
      value={{
        locations,
        reports,
        myReports,
        savedLocationIds,
        recentLocationIds,
        getLocationById,
        getReportsForLocation,
        submitReport,
        toggleSaved,
        addRecentLocation,
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
