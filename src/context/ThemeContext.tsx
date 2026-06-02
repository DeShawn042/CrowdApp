import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Appearance } from 'react-native';
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

function resolveColors(preference: ThemePreference): AppColors {
  if (preference === 'light') return lightColors;
  if (preference === 'dark')  return darkColors;
  // system
  const scheme = Appearance.getColorScheme();
  return scheme === 'light' ? lightColors : darkColors;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [colors, setColors] = useState<AppColors>(resolveColors('system'));

  // Load saved preference on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(saved => {
      const pref = (saved as ThemePreference) ?? 'system';
      setPreferenceState(pref);
      setColors(resolveColors(pref));
    });
  }, []);

  // Listen for system appearance changes when preference is 'system'
  useEffect(() => {
    const sub = Appearance.addChangeListener(() => {
      if (preference === 'system') {
        setColors(resolveColors('system'));
      }
    });
    return () => sub.remove();
  }, [preference]);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    setColors(resolveColors(p));
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
