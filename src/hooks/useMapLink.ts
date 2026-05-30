import { ActionSheetIOS, Linking, Platform } from 'react-native';

export interface MapOption {
  label: string;
  url: string;
  scheme: string;
}

export const MAP_APPS: MapOption[] = [
  {
    label: 'Apple Maps',
    url: '', // built dynamically with coords
    scheme: 'maps://',
  },
  {
    label: 'Google Maps',
    url: '',
    scheme: 'comgooglemaps://',
  },
  {
    label: 'Waze',
    url: '',
    scheme: 'waze://',
  },
  {
    label: 'Uber',
    url: '',
    scheme: 'uber://',
  },
];

function buildUrls(lat: number, lng: number, name: string): MapOption[] {
  const encodedName = encodeURIComponent(name);
  return [
    {
      label: 'Apple Maps',
      scheme: 'maps://',
      url: `maps://app?daddr=${lat},${lng}&q=${encodedName}`,
    },
    {
      label: 'Google Maps',
      scheme: 'comgooglemaps://',
      url: `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`,
    },
    {
      label: 'Waze',
      scheme: 'waze://',
      url: `waze://?ll=${lat},${lng}&navigate=yes`,
    },
    {
      label: 'Uber',
      scheme: 'uber://',
      url: `uber://?action=setPickup&dropoff[latitude]=${lat}&dropoff[longitude]=${lng}&dropoff[nickname]=${encodedName}`,
    },
  ];
}

function googleMapsBrowserUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export async function getAvailableMapApps(
  lat: number,
  lng: number,
  name: string,
): Promise<MapOption[]> {
  const apps = buildUrls(lat, lng, name);

  // Apple Maps is always available on iOS; skip the check
  const checks = await Promise.all(
    apps.map(async app => {
      if (app.label === 'Apple Maps') {
        return { ...app, available: Platform.OS === 'ios' };
      }
      const available = await Linking.canOpenURL(app.scheme).catch(() => false);
      return { ...app, available };
    }),
  );

  return checks.filter(a => a.available);
}

export async function openMapSheet(
  lat: number,
  lng: number,
  name: string,
  // Android: caller handles the modal; iOS: we show ActionSheetIOS here
  onShowAndroidSheet?: (options: MapOption[], fallbackUrl: string) => void,
): Promise<void> {
  const fallbackUrl = googleMapsBrowserUrl(lat, lng);

  if (Platform.OS === 'web') {
    await Linking.openURL(fallbackUrl);
    return;
  }

  const available = await getAvailableMapApps(lat, lng, name);

  // Always guarantee at least the browser fallback
  const googleBrowser: MapOption = {
    label: 'Google Maps (Browser)',
    scheme: 'https://',
    url: fallbackUrl,
  };
  const options = available.length > 0 ? available : [googleBrowser];

  if (Platform.OS === 'ios') {
    const buttonTitles = [...options.map(o => o.label), 'Cancel'];
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: 'Open in Maps',
        options: buttonTitles,
        cancelButtonIndex: buttonTitles.length - 1,
      },
      buttonIndex => {
        if (buttonIndex < options.length) {
          Linking.openURL(options[buttonIndex].url);
        }
      },
    );
    return;
  }

  // Android: delegate to caller-rendered modal
  onShowAndroidSheet?.(options, fallbackUrl);
}
