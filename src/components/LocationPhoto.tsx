import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/crowdColors';
import type { LocationType } from '@/data/mockData';

// Accent color per location type for the letter avatar background
const TYPE_COLORS: Record<LocationType, string> = {
  gym:           '#22C55E',
  bar:           '#8B5CF6',
  restaurant:    '#EF4444',
  cafe:          '#F59E0B',
  shopping:      '#EC4899',
  entertainment: '#0EA5E9',
  spa:           '#D946EF',
  medical:       '#06B6D4',
  park:          '#16A34A',
  hotel:         '#D97706',
  transit:       '#6366F1',
  airport:       '#0EA5E9',
  gas_station:   '#64748B',
  other:         '#7C6FFF',
};

interface Props {
  type: LocationType;
  photoUrl: string | null;
  size: number;
  borderRadius?: number;
  name?: string; // used for letter avatar fallback
}

export default function LocationPhoto({ type, photoUrl, size, borderRadius = 14, name }: Props) {
  const sharedStyle = { width: size, height: size, borderRadius };
  const letter = name ? name.trim()[0]?.toUpperCase() ?? '?' : '?';
  const bgColor = TYPE_COLORS[type] ?? COLORS.primary;
  const fontSize = Math.round(size * 0.42);

  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={[styles.image, sharedStyle]}
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={[styles.placeholder, sharedStyle, { backgroundColor: bgColor + '30' }]}>
      <Text style={[styles.letter, { fontSize, color: bgColor }]}>{letter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image:       { backgroundColor: COLORS.surface },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  letter:      { fontWeight: '700' },
});
