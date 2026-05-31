import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/crowdColors';
import type { ActiveDestination } from '@/context/AppContext';
import type { CrowdLevel, LocationType } from '@/data/mockData';
import { CROWD_COLORS, CROWD_LABELS } from '@/utils/crowdUtils';

const TYPE_ICONS: Record<LocationType, string> = {
  gym: '🏋️', bar: '🍺', restaurant: '🍽️', cafe: '☕',
  shopping: '🛍️', entertainment: '🎬', spa: '💆', gas_station: '⛽',
  medical: '🏥', park: '🌳', hotel: '🏨', transit: '🚇', other: '📍',
};

interface Props {
  destination: ActiveDestination;
  locationType?: LocationType;
  crowdLevel?: CrowdLevel | null;
  onPress: () => void;
  onRemove: () => void;
}

export default function HeadingThereCard({ destination, locationType, crowdLevel, onPress, onRemove }: Props) {
  const icon = locationType ? TYPE_ICONS[locationType] : '🚗';
  const crowdColor = crowdLevel ? CROWD_COLORS[crowdLevel] : null;

  return (
    <View style={styles.outer}>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        onPress={onPress}>
        <Text style={styles.icon}>{icon}</Text>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{destination.placeName}</Text>
          <Text style={styles.address} numberOfLines={1}>📍 {destination.address}</Text>
          {crowdLevel && crowdColor && (
            <View style={[styles.crowdPill, { backgroundColor: crowdColor + '20', borderColor: crowdColor + '60' }]}>
              <View style={[styles.crowdDot, { backgroundColor: crowdColor }]} />
              <Text style={[styles.crowdText, { color: crowdColor }]}>{CROWD_LABELS[crowdLevel]}</Text>
            </View>
          )}
        </View>
      </Pressable>
      <Pressable onPress={onRemove} hitSlop={12} style={styles.removeBtn}>
        <Text style={styles.removeIcon}>✕</Text>
        <Text style={styles.removeText}>Remove</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.primary + '50',
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  pressed:    { opacity: 0.75 },
  icon:       { fontSize: 32 },
  info:       { flex: 1, gap: 4 },
  name:       { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  address:    { color: COLORS.textSec, fontSize: 12 },
  crowdPill:  {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  crowdDot:   { width: 5, height: 5, borderRadius: 3 },
  crowdText:  { fontSize: 11, fontWeight: '600' },
  removeBtn:  {
    paddingHorizontal: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
    gap: 3,
  },
  removeIcon: { color: COLORS.textMuted, fontSize: 13 },
  removeText: { color: COLORS.textMuted, fontSize: 10, fontWeight: '600' },
});
