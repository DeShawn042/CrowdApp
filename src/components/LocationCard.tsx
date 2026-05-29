import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Location } from '@/data/mockData';
import { COLORS } from '@/constants/crowdColors';
import { usePlacesPhoto } from '@/hooks/usePlacesPhoto';
import CrowdLevelBadge from './CrowdLevelBadge';
import LocationPhoto from './LocationPhoto';

interface Props {
  location: Location;
  onPress: () => void;
  showDistance?: boolean;
}

export default function LocationCard({ location, onPress, showDistance = true }: Props) {
  const photoUrl = usePlacesPhoto(location);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}>
      <LocationPhoto type={location.type} photoUrl={photoUrl} size={48} borderRadius={14} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{location.name}</Text>
        <Text style={styles.address} numberOfLines={1}>{location.address}</Text>
        <View style={styles.meta}>
          <CrowdLevelBadge level={location.currentCrowd} size="sm" />
          {location.reportCount > 0 && (
            <Text style={styles.reportCount}>
              {location.reportCount} {location.reportCount === 1 ? 'report' : 'reports'}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.right}>
        {showDistance && <Text style={styles.distance}>{location.distance}</Text>}
        <Text style={styles.chevron}>›</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.99 }],
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  address: {
    color: COLORS.textSec,
    fontSize: 12,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  reportCount: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
  },
  distance: {
    color: COLORS.textSec,
    fontSize: 12,
    fontWeight: '500',
  },
  chevron: {
    color: COLORS.textMuted,
    fontSize: 20,
  },
});
