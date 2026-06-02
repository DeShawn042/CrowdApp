import { router } from 'expo-router';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/crowdColors';
import { useTheme } from '@/context/ThemeContext';

const TABS = [
  { label: 'Home',    emoji: '🏠', route: '/(tabs)/' as const },
  { label: 'Search',  emoji: '🔍', route: '/(tabs)/search' as const },
  { label: 'Profile', emoji: '👤', route: '/(tabs)/profile' as const },
];

export default function BottomNav() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[
      styles.bar,
      { backgroundColor: colors.tabBg, borderTopColor: colors.border, paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 16) : 10 },
    ]}>
      {TABS.map(tab => (
        <Pressable
          key={tab.label}
          style={({ pressed }) => [styles.tab, pressed && { opacity: 0.7 }]}
          onPress={() => router.push(tab.route)}>
          <Text style={styles.emoji}>{tab.emoji}</Text>
          <Text style={[styles.label, { color: colors.tabInactive }]}>{tab.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: COLORS.tabBg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  emoji: {
    fontSize: 22,
    opacity: 0.5, // never highlighted — user is on a detail page
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.tabInactive,
  },
});
