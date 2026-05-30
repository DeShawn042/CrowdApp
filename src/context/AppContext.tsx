import * as ExpoLocation from 'expo-location';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { CrowdLevel, Location, Report } from '@/data/mockData';
import { useAuth } from '@/context/AuthContext';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { searchNearby } from '@/utils/googlePlaces';
import { averageReports, busyLevelFromPercent } from '@/utils/crowdUtils';

interface UserLocation {
  lat: number;
  lng: number;
}

interface AppContextValue {
  locations: Location[];
  locationsLoading: boolean;
  userLocation: UserLocation | null;
  reports: Report[];
  myReports: Report[];
  savedLocationIds: string[];
  recentLocationIds: string[];
  getLocationById: (id: string) => Location | undefined;
  getReportsForLocation: (id: string) => Report[];
  submitReport: (locationId: string, level: CrowdLevel, comment?: string) => Promise<void>;
  toggleSaved: (id: string) => void;
  addRecentLocation: (id: string) => void;
  /** Merge a location into the shared store so the detail screen can find it. */
  registerLocation: (location: Location) => void;
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
  const { user } = useAuth();
  const userId   = user?.id   ?? null;
  const userName = user?.name ?? 'User';

  const [locations,         setLocations]         = useState<Location[]>([]);
  const [locationsLoading,  setLocationsLoading]  = useState(true);
  const [userLocation,      setUserLocation]      = useState<UserLocation | null>(null);
  const [reports,           setReports]           = useState<Report[]>([]);
  const [myReports,         setMyReports]         = useState<Report[]>([]);
  const [savedLocationIds,  setSavedLocationIds]  = useState<string[]>([]);
  const [recentLocationIds, setRecentLocationIds] = useState<string[]>([]);

  // ── Loaders ────────────────────────────────────────────────

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

    const hourIdx = Math.min(Math.max(new Date().getHours() - 6, 0), 17);
    setLocations(locs => locs.map(l => {
      const locReports = mapped.filter(r => r.locationId === l.id);
      if (locReports.length > 0) return { ...l, currentCrowd: averageReports(locReports) };
      // Only update typical for open places that have a meaningful type pattern.
      // Closed places and 'other' types show no crowd data in the UI — don't write
      // a misleading level into currentCrowd for them.
      if (l.openNow !== false && l.type !== 'other') {
        return { ...l, currentCrowd: busyLevelFromPercent(l.busyHours[hourIdx] ?? 0) };
      }
      return l;
    }));
  }, []);

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

  // On mount: get user location → fetch nearby places → load reports
  useEffect(() => {
    async function init() {
      setLocationsLoading(true);
      try {
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await ExpoLocation.getCurrentPositionAsync({
            accuracy: ExpoLocation.Accuracy.Balanced,
          });
          const { latitude: lat, longitude: lng } = pos.coords;
          setUserLocation({ lat, lng });

          const places = await searchNearby(lat, lng, 3000);
          if (places.length > 0) setLocations(places);
        }
      } catch (err) {
        console.warn('init location/nearby:', err);
      } finally {
        setLocationsLoading(false);
      }
      // Always update crowd levels from Supabase (works for whatever locations are set)
      await loadRecentReports();
    }
    init();
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
      const cutoff = Date.now() - 60 * 60 * 1000;
      return reports.filter(
        r => r.locationId === id && new Date(r.timestamp).getTime() > cutoff
      );
    },
    [reports]
  );

  const submitReport = useCallback(
    async (locationId: string, level: CrowdLevel, comment?: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[submitReport] userId:', userId ?? 'null');
      console.log('[submitReport] session user:', session?.user?.id ?? 'NO SESSION');
      console.log('[submitReport] token present:', !!session?.access_token);
      if (userId && session?.user?.id && userId !== session.user.id) {
        console.warn('[submitReport] ⚠️ userId/session mismatch');
      }

      if (!userId) {
        console.warn('[submitReport] blocked — not authenticated');
        return;
      }

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

      if (!isSupabaseConfigured) {
        console.warn('submitReport: blocked — isSupabaseConfigured is false');
        return;
      }

      try {
        const isFlaggedUser = await getOutlierFlag(locationId, userId, level);

        const payload = {
          location_id:     locationId,
          user_id:         userId,
          user_name:       userName,
          crowd_level:     level,
          comment:         comment ?? null,
          is_flagged_user: isFlaggedUser,
        };
        console.log('submitReport: inserting payload:', payload);

        const { data, error, status, statusText } = await supabase
          .from('crowd_reports')
          .insert(payload)
          .select();

        console.log('submitReport: response status:', status, statusText);
        console.log('submitReport: data:', data);
        console.log('submitReport: error:', error
          ? `${error.code} — ${error.message} | hint: ${error.hint}`
          : 'none');

        if (error) return;

        console.log('submitReport: ✅ insert succeeded, refreshing...');
        await loadRecentReports();
        await loadMyReports(userId);
      } catch (err) {
        console.error('submitReport: unexpected exception:', err);
      }
    },
    [reports, userId, userName, loadRecentReports, loadMyReports]
  );

  const toggleSaved = useCallback(async (id: string) => {
    if (!userId) return;

    const isSaved = savedLocationIds.includes(id);

    setSavedLocationIds(prev =>
      isSaved ? prev.filter(x => x !== id) : [...prev, id]
    );

    if (!isSupabaseConfigured) return;

    const { error } = isSaved
      ? await supabase.from('user_favorites').delete()
          .eq('user_id', userId).eq('location_id', id)
      : await supabase.from('user_favorites').insert(
          { user_id: userId, location_id: id }
        );

    if (error) {
      console.warn('toggleSaved:', error.message);
      setSavedLocationIds(prev =>
        isSaved ? [...prev, id] : prev.filter(x => x !== id)
      );
    }
  }, [userId, savedLocationIds]);

  const addRecentLocation = useCallback((id: string) => {
    setRecentLocationIds(prev => [id, ...prev.filter(x => x !== id)].slice(0, 10));
  }, []);

  const registerLocation = useCallback((loc: Location) => {
    setLocations(prev => prev.some(l => l.id === loc.id) ? prev : [...prev, loc]);
  }, []);

  return (
    <AppContext.Provider value={{
      locations, locationsLoading, userLocation,
      reports, myReports,
      savedLocationIds, recentLocationIds,
      getLocationById, getReportsForLocation,
      submitReport, toggleSaved, addRecentLocation, registerLocation,
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
