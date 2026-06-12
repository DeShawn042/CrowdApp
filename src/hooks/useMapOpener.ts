import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import { getAvailableMapApps, type MapOption } from './useMapLink';

export const MAP_PREF_STORAGE_KEY = 'prescout_default_map_app';

const APP_ICONS: Record<string, string> = {
  'Apple Maps': '🗺️',
  'Google Maps': '📍',
  'Waze': '🚗',
  'Uber': '🚙',
  'Google Maps (Browser)': '🌐',
};

export interface InstalledApp {
  label: string;
  icon: string;
}

function googleBrowserUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export function useMapOpener() {
  const [defaultApp, setDefaultApp]     = useState<string | null>(null);
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [showSheet, setShowSheet]       = useState(false);
  const [sheetOptions, setSheetOptions] = useState<MapOption[]>([]);

  const pendingOptions = useRef<MapOption[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(MAP_PREF_STORAGE_KEY).then(v => setDefaultApp(v));
    // Check which apps are installed using dummy coords (only the scheme is checked)
    if (Platform.OS !== 'web') {
      getAvailableMapApps(0, 0, '').then(apps => {
        setInstalledApps(apps.map(a => ({ label: a.label, icon: APP_ICONS[a.label] ?? '🗺️' })));
      });
    }
  }, []);

  async function open(lat: number, lng: number, name: string) {
    if (Platform.OS === 'web') {
      Linking.openURL(googleBrowserUrl(lat, lng));
      return;
    }

    const available = await getAvailableMapApps(lat, lng, name);
    const fallback: MapOption = {
      label: 'Google Maps (Browser)',
      scheme: 'https://',
      url: googleBrowserUrl(lat, lng),
    };
    const options = available.length > 0 ? available : [fallback];

    // Only one app available — open directly, no sheet needed
    if (options.length === 1) {
      Linking.openURL(options[0].url);
      return;
    }

    // Default saved — open it directly if still installed
    if (defaultApp) {
      const match = options.find(o => o.label === defaultApp);
      if (match) {
        Linking.openURL(match.url);
        return;
      }
      // Default app no longer installed — clear and fall through to sheet
      await AsyncStorage.removeItem(MAP_PREF_STORAGE_KEY);
      setDefaultApp(null);
    }

    pendingOptions.current = options;
    setSheetOptions(options);
    setShowSheet(true);
  }

  function handlePick(opt: MapOption) {
    setShowSheet(false);
    Linking.openURL(opt.url);

    // Ask the user if they want this as their default (first-time only)
    Alert.alert(
      'Set as Default?',
      `Always open addresses in ${opt.label}?`,
      [
        {
          text: 'Set as Default',
          onPress: () => setDefaultDirect(opt.label),
        },
        { text: 'Just Once', style: 'cancel' },
      ],
    );
  }

  async function setDefaultDirect(label: string) {
    await AsyncStorage.setItem(MAP_PREF_STORAGE_KEY, label);
    setDefaultApp(label);
  }

  async function clearDefault() {
    await AsyncStorage.removeItem(MAP_PREF_STORAGE_KEY);
    setDefaultApp(null);
  }

  return {
    open,
    defaultApp,
    clearDefault,
    setDefaultDirect,
    installedApps,
    sheetProps: {
      visible: showSheet,
      options: sheetOptions,
      defaultAppLabel: defaultApp ?? undefined,
      onPick: handlePick,
      onClose: () => setShowSheet(false),
    },
  };
}
