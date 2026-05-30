import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LocationType } from '@/data/mockData';
import { COLORS } from '@/constants/crowdColors';

const TYPE_ICONS: Record<LocationType, string> = {
  gym:           '🏋️',
  bar:           '🍺',
  restaurant:    '🍽️',
  cafe:          '☕',
  shopping:      '🛍️',
  entertainment: '🎬',
  spa:           '💆',
  gas_station:   '⛽',
  medical:       '🏥',
  park:          '🌳',
  hotel:         '🏨',
  transit:       '🚇',
  other:         '📍',
};

interface Props {
  type: LocationType;
  photoUrl: string | null;
  size: number;
  borderRadius?: number;
}

export default function LocationPhoto({ type, photoUrl, size, borderRadius = 14 }: Props) {
  const sharedStyle = { width: size, height: size, borderRadius };

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
    <View style={[styles.placeholder, sharedStyle]}>
      <Text style={{ fontSize: Math.round(size * 0.45) }}>
        {TYPE_ICONS[type] ?? '📍'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: COLORS.surface,
  },
  placeholder: {
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
