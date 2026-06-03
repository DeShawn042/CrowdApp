import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GoogleReviewCard from '@/components/GoogleReviewCard';
import StarRating from '@/components/StarRating';
import { COLORS } from '@/constants/crowdColors';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/themes';
import { useAppContext } from '@/context/AppContext';

export default function GoogleReviewsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { getLocationById } = useAppContext();
  const location = getLocationById(id ?? '');

  if (!location) {
    return (
      <SafeAreaView style={styles.safe}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <View style={styles.center}>
          <Text style={styles.errorText}>Location not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const reviews = location.googleReviews ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        <Text style={styles.locationName} numberOfLines={2}>{location.name}</Text>

        <View style={styles.summaryCard}>
          <View style={styles.googleBadgeRow}>
            <View style={styles.googleBadge}>
              <Text style={styles.googleBadgeText}>G</Text>
            </View>
            <Text style={styles.summaryLabel}>Google Reviews</Text>
          </View>
          <View style={styles.ratingRow}>
            <Text style={styles.ratingNumber}>{location.rating.toFixed(1)}</Text>
            <View style={styles.ratingRight}>
              <StarRating rating={location.rating} size={18} />
              {location.googleReviewCount ? (
                <Text style={styles.reviewCount}>
                  {location.googleReviewCount.toLocaleString()} reviews
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {reviews.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={[styles.emptyText, { color: COLORS.textSec, fontWeight: '600', fontSize: 16 }]}>No reviews yet</Text>
            <Text style={styles.emptyText}>No preview reviews available from Google.</Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            {reviews.map((r, i) => (
              <GoogleReviewCard key={i} review={r} />
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
  safe:           { flex: 1, backgroundColor: c.bg },
  header:         { paddingHorizontal: 20, paddingVertical: 12 },
  backBtn:        { paddingVertical: 4, alignSelf: 'flex-start' },
  backText:       { color: COLORS.primary, fontSize: 18, fontWeight: '500' },
  scroll:         { flex: 1 },
  content:        { padding: 20, paddingTop: 4, gap: 20, paddingBottom: 80 },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText:      { color: c.textMuted, fontSize: 14 },
  locationName:   { color: c.text, fontSize: 24, fontWeight: '700', lineHeight: 30 },
  summaryCard:    { backgroundColor: c.card, borderRadius: 16, padding: 16, gap: 14, borderWidth: 1, borderColor: c.border },
  googleBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  googleBadge:    { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.google, alignItems: 'center', justifyContent: 'center' },
  googleBadgeText:{ color: '#fff', fontSize: 12, fontWeight: '800' },
  summaryLabel:   { color: c.textSec, fontSize: 14, fontWeight: '600' },
  ratingRow:      { flexDirection: 'row', alignItems: 'center', gap: 14 },
  ratingNumber:   { color: c.text, fontSize: 42, fontWeight: '700', lineHeight: 48 },
  ratingRight:    { gap: 6 },
  reviewCount:    { color: c.textMuted, fontSize: 12 },
  listCard:       { backgroundColor: c.card, borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: c.border },
  empty:          { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyEmoji:     { fontSize: 40 },
  emptyText:      { color: c.textMuted, fontSize: 14, textAlign: 'center' },
  });
}
