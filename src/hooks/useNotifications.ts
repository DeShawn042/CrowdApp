import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { CrowdLevel } from '@/data/mockData';
import { CROWD_EMOJIS, CROWD_LABELS } from '@/utils/crowdUtils';

export const CROWD_CATEGORY_ID = 'CROWD_REPORT';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function setupNotificationCategories() {
  if (Platform.OS === 'web') return;
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
      options: { opensAppToForeground: true },
    },
  ]);
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function sendArrivalNotification(locationName: string, locationId: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `You arrived at ${locationName}`,
      body: 'How busy is it right now? Tap to report.',
      categoryIdentifier: CROWD_CATEGORY_ID,
      data: { locationId },
    },
    trigger: null,
  });
}

export function useNotificationResponse(
  onResponse: (locationId: string, level: CrowdLevel) => void
) {
  const callbackRef = useRef(onResponse);
  callbackRef.current = onResponse;

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const actionId = response.actionIdentifier as CrowdLevel | typeof Notifications.DEFAULT_ACTION_IDENTIFIER;
      const locationId = response.notification.request.content.data?.locationId as string | undefined;

      if (locationId && actionId && actionId !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
        callbackRef.current(locationId, actionId as CrowdLevel);
      }
    });

    return () => sub.remove();
  }, []);
}
