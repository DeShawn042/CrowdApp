import { useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { sendArrivalNotification, sendWatchlistArrivalNotification } from './useNotifications';
import type { Location as AppLocation } from '@/data/mockData';

const GEOFENCE_TASK = 'CROWDAPP_GEOFENCE';
const GEOFENCE_RADIUS_M = 150;
const NOTIFY_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

// Module-level caches — persist for the lifetime of the JS context
const locationNameCache = new Map<string, string>();
const lastNotifiedAt    = new Map<string, number>(); // placeId → timestamp

// Context shared between the hook and the background task
const geofenceCtx = {
  headingThereId: null as string | null,
  userId:         null as string | null,
  watchlistIds:   new Set<string>(),
};

export function updateGeofenceContext(
  headingThereId: string | null,
  watchlistIds: string[],
  userId: string | null,
) {
  geofenceCtx.headingThereId = headingThereId;
  geofenceCtx.userId         = userId;
  geofenceCtx.watchlistIds   = new Set(watchlistIds);
}

// Must be defined at module level — runs before app mounts
if (Platform.OS !== 'web') {
  TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }: TaskManager.TaskManagerTaskBody<{ eventType: Location.GeofencingEventType; region: Location.LocationRegion }>) => {
    if (error) {
      console.warn('[Geofence] task error:', error.message);
      return;
    }
    const { eventType, region } = data;
    if (eventType !== Location.GeofencingEventType.Enter || !region.identifier) return;

    const placeId = region.identifier;
    const last = lastNotifiedAt.get(placeId) ?? 0;
    if (Date.now() - last < NOTIFY_COOLDOWN_MS) return;
    lastNotifiedAt.set(placeId, Date.now());

    const name = locationNameCache.get(placeId) ?? 'a location';

    if (placeId === geofenceCtx.headingThereId) {
      // Clear the Heading There destination from Supabase on arrival
      if (geofenceCtx.userId) {
        try {
          const { supabase } = await import('@/lib/supabase');
          await supabase
            .from('active_destinations')
            .delete()
            .eq('user_id', geofenceCtx.userId);
        } catch (e) {
          console.warn('[Geofence] failed to clear destination:', e);
        }
      }
      geofenceCtx.headingThereId = null;
      await sendArrivalNotification(name, placeId);
    } else if (geofenceCtx.watchlistIds.has(placeId)) {
      // Watchlist arrival — prompt user to submit a crowd report
      await sendWatchlistArrivalNotification(name, placeId);
    }
    // Other saved/recent locations: no arrival notification
  });
}

export function useGeofencing(
  headingThereId: string | null,
  watchlistIds: string[],
  locations: AppLocation[],
  userId?: string | null,
) {
  // Keep name and context caches in sync
  useEffect(() => {
    for (const l of locations) locationNameCache.set(l.id, l.name);
  }, [locations]);

  useEffect(() => {
    updateGeofenceContext(headingThereId, watchlistIds, userId ?? null);
  }, [headingThereId, watchlistIds, userId]);

  // Monitored regions = Heading There destination + watchlist places
  const monitoredIds = [
    ...(headingThereId ? [headingThereId] : []),
    ...watchlistIds,
  ].filter((id, i, arr) => arr.indexOf(id) === i); // deduplicate

  const startGeofencing = useCallback(async () => {
    if (Platform.OS === 'web') return;

    const { status } = await Location.requestBackgroundPermissionsAsync();
    if (status !== 'granted') return;

    const regions: Location.LocationRegion[] = monitoredIds.flatMap(id => {
      const loc = locations.find(l => l.id === id);
      if (!loc) return [];
      return [{
        identifier: id,
        latitude: loc.coordinates.lat,
        longitude: loc.coordinates.lng,
        radius: GEOFENCE_RADIUS_M,
        notifyOnEnter: true,
        notifyOnExit: false,
      }];
    });

    const isRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK);
    if (isRegistered) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK);
    }

    if (regions.length === 0) return;
    await Location.startGeofencingAsync(GEOFENCE_TASK, regions);
  }, [monitoredIds, locations]);

  const stopGeofencing = useCallback(async () => {
    if (Platform.OS === 'web') return;
    const isRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK);
    if (isRegistered) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK);
    }
  }, []);

  useEffect(() => {
    startGeofencing();
    return () => {
      stopGeofencing();
    };
  }, [startGeofencing, stopGeofencing]);
}
