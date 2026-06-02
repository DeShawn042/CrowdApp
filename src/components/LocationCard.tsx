import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Location } from '@/data/mockData';
import { COLORS } from '@/constants/crowdColors';
import { useAppContext } from '@/context/AppContext';
import { usePlacesPhoto } from '@/hooks/usePlacesPhoto';
import { useReviews } from '@/hooks/useReviews';
import { getCrowdDisplay } from '@/utils/crowdUtils';
import CrowdLevelBadge from './CrowdLevelBadge';
import LocationPhoto from './LocationPhoto';

interface Props {
  location: Location;
  onPress: () => void;
  showDistance?: boolean;
}

export default function LocationCard({ location, onPress, showDistance = true }: Props) {
  const { savedLocationIds, toggleSaved, getReportsForLocation } = useAppContext();
  const isFavorite = savedLocationIds.includes(location.id);
  const photoUrl = usePlacesPhoto(location);
  const { averageRating, reviews } = useReviews(location.id);
  const reviewCount = reviews.length;
  const liveReports  = getReportsForLocation(location.id);
  const crowdDisplay = getCrowdDisplay(location, liveReports);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}>
      <LocationPhoto type={location.type} photoUrl={photoUrl} size={48} borderRadius={14} name={location.name} />
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{location.name}</Text>
        </View>
        <Text style={styles.address} numberOfLines={1}>{location.address}</Text>
        <View style={styles.meta}>
          <CrowdLevelBadge level={crowdDisplay.level} size="sm" source={crowdDisplay.source} />
          {location.reportCount > 0 && (
            <Text style={styles.reportCount}>
              {location.reportCount} {location.reportCount === 1 ? 'report' : 'reports'}
            </Text>
          )}
          {averageRating !== null ? (
            <View style={styles.starPill}>
              <Text style={styles.starChar}>⭐</Text>
              <Text style={styles.starValue}>{averageRating.toFixed(1)}</Text>
              <Text style={styles.reviewCount}>{reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}</Text>
            </View>
          ) : location.rating > 0 ? (
            <View style={[styles.starPill, styles.googlePill]}>
              <Text style={styles.starChar}>⭐</Text>
              <Text style={styles.starValue}>{location.rating.toFixed(1)}</Text>
              <Text style={styles.googleLabel}>Google</Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.right}>
        <Pressable onPress={() => toggleSaved(location.id)} hitSlop={10} style={styles.heartBtn}>
          <Text style={styles.heartIcon}>{isFavorite ? '❤️' : '🤍'}</Text>
        </Pressable>
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
  pressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },
  info:      { flex: 1, gap: 4 },
  nameRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name:      { color: COLORS.text, fontSize: 16, fontWeight: '600', flex: 1 },
  starPill:    { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: COLORS.moderate + '18', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 14 },
  googlePill:  { backgroundColor: COLORS.google + '18' },
  starChar:    { fontSize: 11 },
  starValue:   { color: COLORS.moderate, fontSize: 12, fontWeight: '700' },
  reviewCount: { color: COLORS.textMuted, fontSize: 12 },
  googleLabel: { color: COLORS.google, fontSize: 12, fontWeight: '600' },
  address:   { color: COLORS.textSec, fontSize: 12 },
  meta:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' },
  reportCount: { color: COLORS.textMuted, fontSize: 12 },
  right:     { alignItems: 'flex-end', gap: 4 },
  heartBtn:  { padding: 2 },
  heartIcon: { fontSize: 18 },
  distance: { color: COLORS.textSec, fontSize: 12, fontWeight: '500' },
  chevron: { color: COLORS.textMuted, fontSize: 20 },
});
