import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LocationType } from '@/data/mockData';
import { COLORS } from '@/constants/crowdColors';
import { TrendingLocation } from '@/hooks/useTrending';
import { CROWD_COLORS, CROWD_LABELS } from '@/utils/crowdUtils';

const TYPE_ICONS: Record<LocationType, string> = { gym: '🏋️', bar: '🍺', restaurant: '🍽️' };

interface Props {
  location: TrendingLocation;
  rank: number;
  onPress: () => void;
}

export default function TrendingCard({ location, rank, onPress }: Props) {
  const crowdColor = CROWD_COLORS[location.currentCrowd];

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}>
      <View style={styles.rankBadge}>
        <Text style={styles.rankText}>#{rank}</Text>
      </View>
      <Text style={styles.typeIcon}>{TYPE_ICONS[location.type]}</Text>
      <Text style={styles.name} numberOfLines={2}>{location.name}</Text>
      <View style={[styles.crowdPill, { backgroundColor: crowdColor + '20', borderColor: crowdColor + '60' }]}>
        <View style={[styles.dot, { backgroundColor: crowdColor }]} />
        <Text style={[styles.crowdText, { color: crowdColor }]}>{CROWD_LABELS[location.currentCrowd]}</Text>
      </View>
      <Text style={styles.reports}>
        {location.recentReports > 0 ? `${location.recentReports} reports` : `⭐ ${location.rating}`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    width: 138,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pressed:    { opacity: 0.75, transform: [{ scale: 0.98 }] },
  rankBadge:  { position: 'absolute', top: 10, right: 10, backgroundColor: COLORS.primary + '25', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  rankText:   { color: COLORS.primary, fontSize: 10, fontWeight: '700' },
  typeIcon:   { fontSize: 28 },
  name:       { color: COLORS.text, fontSize: 13, fontWeight: '600', lineHeight: 18, paddingRight: 24 },
  crowdPill:  { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3, alignSelf: 'flex-start' },
  dot:        { width: 5, height: 5, borderRadius: 3 },
  crowdText:  { fontSize: 11, fontWeight: '600' },
  reports:    { color: COLORS.textMuted, fontSize: 11 },
});
