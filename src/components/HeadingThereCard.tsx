import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/crowdColors';
import type { ActiveDestination } from '@/hooks/useHeadingThere';

interface Props {
  destination: ActiveDestination;
  onPress: () => void;
  onDismiss: () => void;
}

export default function HeadingThereCard({ destination, onPress, onDismiss }: Props) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow}>
        <Text style={styles.sectionLabel}>🚗  Heading There</Text>
        <Pressable onPress={onDismiss} hitSlop={10} style={styles.dismissBtn}>
          <Text style={styles.dismissText}>✕ Remove</Text>
        </Pressable>
      </View>

      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={onPress}>
        {destination.placeImage ? (
          <Image source={{ uri: destination.placeImage }} style={styles.image} />
        ) : (
          <View style={styles.imageFallback}>
            <Text style={styles.imageFallbackText}>📍</Text>
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{destination.placeName}</Text>
          {destination.address ? (
            <Text style={styles.address} numberOfLines={1}>{destination.address}</Text>
          ) : null}
          <Text style={styles.expiry}>Active for 4 hours</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:           { gap: 10 },
  labelRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel:      { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  dismissBtn:        { paddingVertical: 2, paddingHorizontal: 4 },
  dismissText:       { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },

  card:              { backgroundColor: COLORS.card, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: COLORS.primary + '50' },
  cardPressed:       { opacity: 0.75, transform: [{ scale: 0.99 }] },

  image:             { width: 52, height: 52, borderRadius: 12, backgroundColor: COLORS.surface },
  imageFallback:     { width: 52, height: 52, borderRadius: 12, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  imageFallbackText: { fontSize: 24 },

  info:              { flex: 1, gap: 3 },
  name:              { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  address:           { color: COLORS.textSec, fontSize: 12 },
  expiry:            { color: COLORS.primary, fontSize: 11, fontWeight: '600' },
  chevron:           { color: COLORS.textMuted, fontSize: 20 },
});
