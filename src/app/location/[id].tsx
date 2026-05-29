import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BusyTimesChart from '@/components/BusyTimesChart';
import CrowdLevelBadge from '@/components/CrowdLevelBadge';
import LocationPhoto from '@/components/LocationPhoto';
import ReportCard from '@/components/ReportCard';
import ReviewCard from '@/components/ReviewCard';
import ReviewForm from '@/components/ReviewForm';
import StarRating from '@/components/StarRating';
import { COLORS } from '@/constants/crowdColors';
import { useAppContext } from '@/context/AppContext';
import { usePlacesPhoto } from '@/hooks/usePlacesPhoto';
import { useReviews } from '@/hooks/useReviews';
import { CROWD_BG_COLORS, CROWD_COLORS, CROWD_LABELS } from '@/utils/crowdUtils';

export default function LocationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getLocationById, getReportsForLocation, savedLocationIds, toggleSaved } = useAppContext();

  const location = getLocationById(id ?? '');
  const reports  = getReportsForLocation(id ?? '');
  const isSaved  = savedLocationIds.includes(id ?? '');

  const photoUrl = usePlacesPhoto(location);
  const { reviews, myReview, averageRating, submitReview } = useReviews(id ?? '');

  const [showReviewForm, setShowReviewForm] = useState(false);

  const currentHourIndex = useMemo(() => {
    const h = new Date().getHours();
    if (h < 6) return 0;
    if (h > 23) return 17;
    return Math.min(h - 6, 17);
  }, []);

  if (!location) {
    return (
      <SafeAreaView style={styles.safe}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Location not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const crowdColor = CROWD_COLORS[location.currentCrowd];
  const crowdBg    = CROWD_BG_COLORS[location.currentCrowd];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Pressable onPress={() => toggleSaved(location.id)} hitSlop={12}>
          <Text style={styles.saveIcon}>{isSaved ? '🔖' : '📌'}</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Location info */}
        <View style={styles.infoSection}>
          <View style={styles.nameRow}>
            <LocationPhoto type={location.type} photoUrl={photoUrl} size={72} borderRadius={16} />
            <View style={styles.nameCol}>
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingBadgeText}>⭐ {location.rating}</Text>
              </View>
              <Text style={styles.name} numberOfLines={2}>{location.name}</Text>
              <Text style={styles.address}>📍 {location.address}</Text>
            </View>
          </View>
          <Text style={styles.description}>{location.description}</Text>
          <View style={styles.hoursRow}>
            <Text style={styles.hours}>🕐 {location.hours}</Text>
            <Text style={styles.distance}>{location.distance}</Text>
          </View>
        </View>

        {/* Current crowd level */}
        <View style={[styles.crowdCard, { backgroundColor: crowdBg, borderColor: crowdColor + '60' }]}>
          <View style={styles.crowdHeader}>
            <Text style={styles.crowdTitle}>Right Now</Text>
            <Text style={styles.reportCount}>{reports.length} live {reports.length === 1 ? 'report' : 'reports'}</Text>
          </View>
          <View style={styles.crowdLevelRow}>
            <View style={[styles.crowdDot, { backgroundColor: crowdColor }]} />
            <Text style={[styles.crowdLevelText, { color: crowdColor }]}>
              {CROWD_LABELS[location.currentCrowd]}
            </Text>
          </View>
          <View style={styles.crowdMeter}>
            {(['empty', 'light', 'moderate', 'packed'] as const).map((level, i) => (
              <View
                key={level}
                style={[
                  styles.meterSegment,
                  { backgroundColor: CROWD_COLORS[level] },
                  location.currentCrowd === level && styles.meterActive,
                  i === 0 && { borderTopLeftRadius: 6, borderBottomLeftRadius: 6 },
                  i === 3 && { borderTopRightRadius: 6, borderBottomRightRadius: 6 },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Report button */}
        <Pressable
          style={({ pressed }) => [styles.reportBtn, pressed && styles.reportBtnPressed]}
          onPress={() => router.push(`/submit/${id}`)}>
          <Text style={styles.reportBtnIcon}>📊</Text>
          <Text style={styles.reportBtnText}>Report crowd level</Text>
          <Text style={styles.reportBtnArrow}>›</Text>
        </Pressable>

        {/* Busy times chart */}
        <BusyTimesChart data={location.busyHours} currentHourIndex={currentHourIndex} liveCrowd={location.currentCrowd} />

        {/* Recent reports */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Reports</Text>
          {reports.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>🔕</Text>
              <Text style={styles.emptyTitle}>No live reports</Text>
              <Text style={styles.emptySub}>Reports expire after 60 min. Be the first to report!</Text>
            </View>
          ) : (
            <View style={styles.listCard}>
              {reports.map(r => <ReportCard key={r.id} report={r} />)}
            </View>
          )}
        </View>

        {/* Reviews */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Reviews</Text>
            {averageRating !== null && (
              <View style={styles.avgRow}>
                <StarRating rating={averageRating} size={14} />
                <Text style={styles.avgText}>{averageRating.toFixed(1)}  ({reviews.length})</Text>
              </View>
            )}
          </View>

          {/* Write / Edit review button */}
          <Pressable
            style={({ pressed }) => [styles.writeReviewBtn, pressed && { opacity: 0.8 }]}
            onPress={() => setShowReviewForm(true)}>
            <Text style={styles.writeReviewText}>
              {myReview ? '✏️  Edit your review' : '＋  Write a review'}
            </Text>
          </Pressable>

          {reviews.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>⭐</Text>
              <Text style={styles.emptyTitle}>No reviews yet</Text>
              <Text style={styles.emptySub}>Be the first to leave a review!</Text>
            </View>
          ) : (
            <View style={styles.listCard}>
              {reviews.map(r => (
                <ReviewCard key={r.id} review={r} isOwn={r.userId === 'u1'} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Review form modal */}
      <ReviewForm
        visible={showReviewForm}
        onClose={() => setShowReviewForm(false)}
        existingReview={myReview}
        onSubmit={submitReview}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: COLORS.bg },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn:       { paddingVertical: 4 },
  backText:      { color: COLORS.primary, fontSize: 18, fontWeight: '500' },
  saveIcon:      { fontSize: 22 },
  scroll:        { flex: 1 },
  content:       { padding: 20, paddingTop: 0, gap: 20, paddingBottom: 60 },
  notFound:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText:  { color: COLORS.textSec, fontSize: 16 },
  infoSection:   { gap: 10 },
  nameRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  nameCol:       { flex: 1, gap: 4, justifyContent: 'center' },
  ratingBadge:   { alignSelf: 'flex-start', backgroundColor: COLORS.card, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  ratingBadgeText: { color: COLORS.textSec, fontSize: 12, fontWeight: '500' },
  name:          { color: COLORS.text, fontSize: 22, fontWeight: '800', lineHeight: 28 },
  address:       { color: COLORS.textSec, fontSize: 13 },
  description:   { color: COLORS.textSec, fontSize: 14, lineHeight: 20, marginTop: 4 },
  hoursRow:      { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  hours:         { color: COLORS.textMuted, fontSize: 13 },
  distance:      { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  crowdCard:     { borderRadius: 20, padding: 20, gap: 12, borderWidth: 1 },
  crowdHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  crowdTitle:    { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  reportCount:   { color: COLORS.textMuted, fontSize: 12 },
  crowdLevelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  crowdDot:      { width: 16, height: 16, borderRadius: 8 },
  crowdLevelText: { fontSize: 28, fontWeight: '800' },
  crowdMeter:    { flexDirection: 'row', gap: 3 },
  meterSegment:  { flex: 1, height: 8, opacity: 0.35 },
  meterActive:   { opacity: 1 },
  reportBtn:     { backgroundColor: COLORS.card, borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: COLORS.primary + '50', borderStyle: 'dashed' },
  reportBtnPressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },
  reportBtnIcon: { fontSize: 22 },
  reportBtnText: { flex: 1, color: COLORS.primary, fontSize: 16, fontWeight: '600' },
  reportBtnArrow: { color: COLORS.primary, fontSize: 22 },
  section:       { gap: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle:  { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  avgRow:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avgText:       { color: COLORS.textMuted, fontSize: 12 },
  writeReviewBtn: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.primary + '50', borderStyle: 'dashed' },
  writeReviewText: { color: COLORS.primary, fontSize: 15, fontWeight: '600' },
  listCard:      { backgroundColor: COLORS.card, borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: COLORS.border },
  emptyCard:     { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyEmoji:    { fontSize: 40 },
  emptyTitle:    { color: COLORS.textSec, fontSize: 16, fontWeight: '600' },
  emptySub:      { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 18 },
});
