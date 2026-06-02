// Shared colors — identical in both themes
const shared = {
  primary:      '#7C6FFF',
  primaryLight: '#A89AFF',
  primaryDark:  '#5A4FCC',
  google:       '#4285F4',
  empty:        '#22C55E',
  light:        '#84CC16',
  moderate:     '#F59E0B',
  packed:       '#EF4444',
  tabActive:    '#7C6FFF',
} as const;

export const darkColors = {
  ...shared,
  bg:            '#0F0F13',
  surface:       '#1A1A22',
  card:          '#22222E',
  cardElevated:  '#2A2A38',
  border:        '#32323F',
  borderLight:   '#3E3E4F',
  text:          '#FFFFFF',
  textSec:       '#A0A0B8',
  textMuted:     '#55555F',
  tabBg:         '#16161F',
  tabInactive:   '#55555F',
  inputBg:       '#22222E',
  inputBorder:   '#32323F',
  inputFocus:    '#7C6FFF',
  statusBar:     'light' as const,
} as const;

export const lightColors = {
  ...shared,
  bg:            '#F2F2F7',
  surface:       '#E5E5EA',
  card:          '#FFFFFF',
  cardElevated:  '#F8F8F8',
  border:        '#C6C6C8',
  borderLight:   '#D1D1D6',
  text:          '#000000',
  textSec:       '#3C3C43',
  textMuted:     '#8E8E93',
  tabBg:         '#F9F9F9',
  tabInactive:   '#8E8E93',
  inputBg:       '#FFFFFF',
  inputBorder:   '#C6C6C8',
  inputFocus:    '#7C6FFF',
  statusBar:     'dark' as const,
} as const;

export type AppColors = typeof darkColors;
export type ThemePreference = 'dark' | 'light' | 'system';
