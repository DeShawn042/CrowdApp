import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import { darkColors, lightColors } from '@/constants/themes';
import type { AppColors, ThemePreference } from '@/constants/themes';

const STORAGE_KEY = 'prescout_theme_preference';

interface ThemeContextValue {
  preference: ThemePreference;
  colors: AppColors;
  setPreference: (p: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  preference: 'system',
  colors: darkColors,
  setPreference: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // useColorScheme is the primary reactive source (updates on re-render)
  const systemScheme = useColorScheme();

  // Appearance.addChangeListener is the backup imperative listener —
  // catches system changes on Android where useColorScheme can lag
  const [listenerScheme, setListenerScheme] = useState<'light' | 'dark'>(
    () => Appearance.getColorScheme() === 'light' ? 'light' : 'dark'
  );

  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  // Register Appearance listener
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setListenerScheme(colorScheme === 'light' ? 'light' : 'dark');
    });
    return () => sub.remove();
  }, []);

  // Load saved preference on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(saved => {
      if (saved) setPreferenceState(saved as ThemePreference);
    });
  }, []);

  // useColorScheme wins if available, listenerScheme is the fallback
  const resolvedScheme = systemScheme ?? listenerScheme;

  const colors: AppColors =
    preference === 'light' ? lightColors
    : preference === 'dark'  ? darkColors
    : resolvedScheme === 'light' ? lightColors : darkColors;

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(STORAGE_KEY, p);
  }, []);

  return (
    <ThemeContext.Provider value={{ preference, colors, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
