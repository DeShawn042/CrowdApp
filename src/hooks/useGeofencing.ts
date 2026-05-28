import { useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { sendArrivalNotification } from './useNotifications';
import { MOCK_LOCATIONS } from '@/data/mockData';

const GEOFENCE_TASK = 'CROWDAPP_GEOFENCE';
const GEOFENCE_RADIUS_M = 150; // meters

// Must be defined at module level — runs before app mounts
if (Platform.OS !== 'web') {
  TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }: TaskManager.TaskManagerTaskBody<{ eventType: Location.GeofencingEventType; region: Location.LocationRegion }>) => {
    if (error) {
      console.warn('[Geofence] task error:', error.message);
      return;
    }
    const { eventType, region } = data;
    if (eventType === Location.GeofencingEventType.Enter && region.identifier) {
      const loc = MOCK_LOCATIONS.find(l => l.id === region.identifier);
      if (loc) {
        await sendArrivalNotification(loc.name, loc.id);
      }
    }
  });
}

export function useGeofencing(monitoredIds: string[]) {
  const startGeofencing = useCallback(async () => {
    if (Platform.OS === 'web') return;

    const { status } = await Location.requestBackgroundPermissionsAsync();
    if (status !== 'granted') return;

    const regions: Location.LocationRegion[] = monitoredIds.flatMap(id => {
      const loc = MOCK_LOCATIONS.find(l => l.id === id);
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

    if (regions.length === 0) return;

    const isRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK);
    if (isRegistered) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK);
    }

    await Location.startGeofencingAsync(GEOFENCE_TASK, regions);
  }, [monitoredIds]);

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
