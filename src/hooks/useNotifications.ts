import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { CrowdLevel } from '@/data/mockData';
import { CROWD_EMOJIS, CROWD_LABELS } from '@/utils/crowdUtils';

export const CROWD_CATEGORY_ID           = 'CROWD_REPORT';
export const WATCHLIST_CATEGORY_ID       = 'WATCHLIST_ALERT';
export const WATCHLIST_ARRIVAL_CATEGORY_ID = 'WATCHLIST_ARRIVAL';
export const HEADING_THERE_CATEGORY_ID   = 'HEADING_THERE';

// Remote push notifications are not supported in Expo Go SDK 53+.
// Only initialize expo-notifications in standalone/dev-client builds.
const isExpoGo = Constants.appOwnership === 'expo';

if (!isExpoGo) {
  import('expo-notifications').then(Notifications => {
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
    } catch {}
  });
}

export async function setupNotificationCategories() {
  if (Platform.OS === 'web' || isExpoGo) return;
  const Notifications = await import('expo-notifications');

  // Geofencing arrival — full crowd level picker
  await Notifications.setNotificationCategoryAsync(CROWD_CATEGORY_ID, [
    {
      identifier: 'empty',
      buttonTitle: `${CROWD_EMOJIS.empty} ${CROWD_LABELS.empty}`,
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'light',
      buttonTitle: `${CROWD_EMOJIS.light} ${CROWD_LABELS.light}`,
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'moderate',
      buttonTitle: `${CROWD_EMOJIS.moderate} ${CROWD_LABELS.moderate}`,
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'packed',
      buttonTitle: `${CROWD_EMOJIS.packed} ${CROWD_LABELS.packed}`,
      options: { opensAppToForeground: false },
    },
  ]);

  // Watchlist alert — quick crowd confirm (light/moderate/packed; empty unlikely trigger)
  await Notifications.setNotificationCategoryAsync(WATCHLIST_CATEGORY_ID, [
    {
      identifier: 'light',
      buttonTitle: `${CROWD_EMOJIS.light} ${CROWD_LABELS.light}`,
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'moderate',
      buttonTitle: `${CROWD_EMOJIS.moderate} ${CROWD_LABELS.moderate}`,
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'packed',
      buttonTitle: `${CROWD_EMOJIS.packed} ${CROWD_LABELS.packed}`,
      options: { opensAppToForeground: false },
    },
  ]);

  // Watchlist arrival — prompt user to submit a report
  await Notifications.setNotificationCategoryAsync(WATCHLIST_ARRIVAL_CATEGORY_ID, [
    {
      identifier: 'report_now',
      buttonTitle: '📊 Report Crowd',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'view_location',
      buttonTitle: '📍 View Location',
      options: { opensAppToForeground: true },
    },
  ]);

  // Heading There reminder
  await Notifications.setNotificationCategoryAsync(HEADING_THERE_CATEGORY_ID, [
    {
      identifier: 'im_here',
      buttonTitle: "🚀 I'm Here",
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'view_location',
      buttonTitle: '📍 View Location',
      options: { opensAppToForeground: true },
    },
  ]);
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web' || isExpoGo) return false;
  const Notifications = await import('expo-notifications');
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function sendWatchlistArrivalNotification(locationName: string, locationId: string) {
  if (isExpoGo) return;
  const Notifications = await import('expo-notifications');
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `📍 You arrived at ${locationName}`,
      body: "You're on your watchlist here — how busy is it?",
      categoryIdentifier: WATCHLIST_ARRIVAL_CATEGORY_ID,
      data: { locationId, notificationType: 'watchlist_arrival' },
    },
    trigger: null,
  });
}

export async function sendArrivalNotification(locationName: string, locationId: string) {
  if (isExpoGo) return;
  const Notifications = await import('expo-notifications');
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🚗 You arrived at ${locationName}`,
      body: "How busy is it? Tap 'I'm Here' to report or view the location.",
      categoryIdentifier: HEADING_THERE_CATEGORY_ID,
      data: { locationId, notificationType: 'heading_there' },
    },
    trigger: null,
  });
}

const CROWD_LEVELS = new Set<string>(['empty', 'light', 'moderate', 'packed']);

// Module-level deduplication — prevents the same notification response from
// being handled twice (e.g. when the app resumes and the last-response re-fires)
const handledNotificationIds = new Set<string>();

export function useNotificationResponse(callbacks: {
  onReport: (locationId: string, level: CrowdLevel) => void;
  onNavigate: (locationId: string) => void;
}) {
  const callbackRef = useRef(callbacks);
  callbackRef.current = callbacks;

  const handleResponse = useCallback((Notifications: any, response: any) => {
    // Deduplicate: each notification response is processed exactly once
    const notifId = response.notification.request.identifier;
    if (handledNotificationIds.has(notifId)) return;
    handledNotificationIds.add(notifId);

    const actionId   = response.actionIdentifier;
    const data       = response.notification.request.content.data ?? {};
    const locationId = data.locationId as string | undefined;
    if (!locationId) return;

    const isDefaultTap = actionId === Notifications.DEFAULT_ACTION_IDENTIFIER;

    if (isDefaultTap || actionId === 'view_location' || actionId === 'im_here' || actionId === 'report_now') {
      // Award Heading There arrival points when "I'm Here" is tapped
      if (actionId === 'im_here' && data.notificationType === 'heading_there') {
        import('@/lib/supabase').then(({ supabase }) => {
          supabase.rpc('award_gamification_points', { p_points: 15, p_is_report: false, p_is_pioneer: false })
            .then(() => {}).catch(() => {});
        });
      }
      callbackRef.current.onNavigate(locationId);
    } else if (CROWD_LEVELS.has(actionId)) {
      callbackRef.current.onReport(locationId, actionId as CrowdLevel);
    }
  }, []);

  useEffect(() => {
    if (isExpoGo) return;
    let sub: { remove: () => void } | null = null;
    import('expo-notifications').then(async Notifications => {
      // Handle any notification the user tapped while the app was killed
      const lastResponse = await Notifications.getLastNotificationResponseAsync();
      if (lastResponse) handleResponse(Notifications, lastResponse);

      sub = Notifications.addNotificationResponseReceivedListener(
        response => handleResponse(Notifications, response),
      );
    });
    return () => sub?.remove();
  }, [handleResponse]);
}
