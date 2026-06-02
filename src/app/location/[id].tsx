import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BusyTimesChart from '@/components/BusyTimesChart';
import ClaimModal from '@/components/ClaimModal';
import CrowdLevelBadge from '@/components/CrowdLevelBadge';
import LocationPhoto from '@/components/LocationPhoto';
import OwnerResponseModal from '@/components/OwnerResponseModal';
import ReportCard from '@/components/ReportCard';
import ReviewCard from '@/components/ReviewCard';
import ReviewForm from '@/components/ReviewForm';
import StarRating from '@/components/StarRating';
import { COLORS } from '@/constants/crowdColors';
import { useAppContext } from '@/context/AppContext';
import { useBusinessClaim } from '@/hooks/useBusinessClaim';
import { usePlacesPhoto } from '@/hooks/usePlacesPhoto';
import { useReviews } from '@/hooks/useReviews';
import { currentUserId } from '@/lib/supabase';
import { CROWD_BG_COLORS, CROWD_COLORS, CROWD_LABELS, getCrowdDisplay } from '@/utils/crowdUtils';
import { fetchPlaceDetails } from '@/utils/googlePlaces';
import BottomNav from '@/components/BottomNav';
import MapChooserModal from '@/components/MapChooserModal';
import QuickReportsSection from '@/components/QuickReportsSection';
import QuickReportSummaries from '@/components/QuickReportSummaries';
import Toast from '@/components/Toast';
import WatchlistSheet from '@/components/WatchlistSheet';
import { openMapSheet } from '@/hooks/useMapLink';
import type { MapOption } from '@/hooks/useMapLink';
import { useQuickReports } from '@/hooks/useQuickReports';
import { useHeadingThere } from '@/hooks/useHeadingThere';
import { useWatchlist } from '@/hooks/useWatchlist';
import { getQuickReportConfigs } from '@/utils/quickReportConfig';
import type { Location, Review } from '@/data/mockData';

export default function LocationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    getLocationById, getReportsForLocation, savedLocationIds,
    toggleSaved, registerLocation, userLocation,
  } = useAppContext();

  // ── Location resolution ─────────────────────────────────────
  // Priority: context cache → Google Places API fallback
  const [fetchedLocation, setFetchedLocation] = useState<Location | null>(null);
  const [fetchLoading,    setFetchLoading]    = useState(false);
  const [fetchError,      setFetchError]      = useState(false);

  const location = getLocationById(id ?? '') ?? fetchedLocation;

  const attemptFetch = useCallback(async () => {
    if (!id) return;
    setFetchLoading(true);
    setFetchError(false);
    try {
      const loc = await fetchPlaceDetails(id, userLocation?.lat, userLocation?.lng);
      if (loc) {
        setFetchedLocation(loc);
        registerLocation(loc); // cache for future navigations in this session
      } else {
        setFetchError(true);
      }
    } catch {
      setFetchError(true);
    } finally {
      setFetchLoading(false);
    }
  }, [id, userLocation?.lat, userLocation?.lng, registerLocation]);

  useEffect(() => {
    // Only fetch from API if the location isn't already in the context store
    if (id && !getLocationById(id) && !fetchedLocation) {
      attemptFetch();
    }
  }, [id]); // intentionally only depends on id — we only need one attempt per navigation

  // ── Hooks that must run unconditionally ──────────────────────
  const reports = getReportsForLocation(id ?? '');
  const isSaved = savedLocationIds.includes(id ?? '');

  const photoUrl = usePlacesPhoto(location ?? undefined);
  const { reviews, myReview, averageRating, submitReview } = useReviews(id ?? '');
  const claim = useBusinessClaim(id ?? '', location?.name, location?.address);

  const quickReports = useQuickReports(id ?? '');
  const { destination, setHeadingThere, clearDestination, isHeadingThere } = useHeadingThere();
  const { addToWatchlist, removeFromWatchlist, isWatching } = useWatchlist();

  const [showReviewForm,  setShowReviewForm]  = useState(false);
  const [showToast,       setShowToast]       = useState(false);
  const [showWatchlist,   setShowWatchlist]   = useState(false);
  const [showClaimModal,  setShowClaimModal]  = useState(false);
  const [respondTarget,   setRespondTarget]   = useState<Review | null>(null);
  const [mapOptions,      setMapOptions]      = useState<MapOption[]>([]);
  const [showMapChooser,  setShowMapChooser]  = useState(false);

  const currentHour = new Date().getHours();

  // ── Early returns (after all hooks) ─────────────────────────
  if (fetchLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.centerStateText}>Loading location…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (fetchError || (!location && !fetchLoading)) {
    return (
      <SafeAreaView style={styles.safe}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <View style={styles.centerState}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorTitle}>Couldn't load this location</Text>
          <Text style={styles.errorSub}>Check your connection and try again.</Text>
          <Pressable style={styles.retryBtn} onPress={attemptFetch}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!location) return null; // shouldn't reach here

  const crowdDisplay = getCrowdDisplay(location, reports);
  const crowdColor = crowdDisplay.level ? CROWD_COLORS[crowdDisplay.level] : '#4B5563';
  const crowdBg    = crowdDisplay.level ? CROWD_BG_COLORS[crowdDisplay.level] : '#1A1A22';

  async function handleHeadingThere() {
    if (!location) return;

    // Already heading here — tap again to cancel
    if (isHeadingThere(location.id)) {
      await clearDestination();
      return;
    }

    const alreadySet = destination && destination.placeId !== location.id;
    if (alreadySet) {
      Alert.alert(
        'Replace Destination?',
        `You're currently heading to ${destination!.placeName}. Replace it with ${location.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace',
            onPress: async () => {
              await setHeadingThere({
                placeId:    location.id,
                placeName:  location.name,
                placeImage: photoUrl ?? undefined,
                address:    location.address,
                latitude:   location.coordinates.lat,
                longitude:  location.coordinates.lng,
              });
              setShowToast(true);
            },
          },
        ],
      );
      return;
    }
    await setHeadingThere({
      placeId:    location.id,
      placeName:  location.name,
      placeImage: photoUrl ?? undefined,
      address:    location.address,
      latitude:   location.coordinates.lat,
      longitude:  location.coordinates.lng,
    });
    setShowToast(true);
  }

  async function handleShare() {
    const crowdDesc = crowdDisplay.level
      ? `It's ${CROWD_LABELS[crowdDisplay.level]} at ${location!.name} right now!`
      : `Check out ${location!.name} on Prescout!`;
    await Share.share({
      message: `${crowdDesc} Check Prescout to plan your visit 📱`,
      title: `${location!.name} — Prescout`,
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable onPress={handleShare} hitSlop={12}>
            <Text style={styles.headerIcon}>📤</Text>
          </Pressable>
          <Pressable onPress={() => toggleSaved(location.id)} hitSlop={12}>
            <Text style={styles.headerIcon}>{isSaved ? '❤️' : '🤍'}</Text>
          </Pressable>
          <Pressable
            onPress={() => setShowWatchlist(true)}
            hitSlop={12}
            style={({ pressed }) => [styles.headingBtn, isWatching(location.id) && styles.headingBtnActive, pressed && { opacity: 0.75 }]}>
            <Text style={styles.headingBtnText}>
              {isWatching(location.id) ? '👁️ Watching' : '👁️ Watch'}
            </Text>
          </Pressable>
          <Pressable
            onPress={handleHeadingThere}
            hitSlop={12}
            style={({ pressed }) => [styles.headingBtn, isHeadingThere(location.id) && styles.headingBtnActive, pressed && { opacity: 0.75 }]}>
            <Text style={styles.headingBtnText}>
              {isHeadingThere(location.id) ? '✓ Heading There' : '🚗 Heading There'}
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Location info */}
        <View style={styles.infoSection}>
          <View style={styles.nameRow}>
            <LocationPhoto type={location.type} photoUrl={photoUrl} size={72} borderRadius={16} />
            <View style={styles.nameCol}>
              <View style={styles.badgeRow}>
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingBadgeText}>⭐ {location.rating}</Text>
                </View>
                {claim.ownerInfo?.isVerified ? (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>✓ Verified Owner</Text>
                  </View>
                ) : claim.myClaimStatus === 'pending' ? (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingText}>⏳ Pending Verification</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.name} numberOfLines={2}>{location.name}</Text>
              <Pressable
                onPress={() =>
                  openMapSheet(
                    location.coordinates.lat,
                    location.coordinates.lng,
                    location.name,
                    (opts, _fallback) => {
                      setMapOptions(opts);
                      setShowMapChooser(true);
                    },
                  )
                }
                hitSlop={8}>
                <Text style={styles.addressLink}>📍 {location.address}</Text>
              </Pressable>
            </View>
          </View>
          <Text style={styles.description}>{location.description}</Text>
          <View style={styles.hoursRow}>
            <Text style={styles.hours}>🕐 {location.hours}</Text>
            <Text style={styles.distance}>{location.distance}</Text>
          </View>
        </View>

        {/* Current crowd level */}
        {crowdDisplay.source === 'closed' ? (
          <View style={styles.crowdCardMuted}>
            <Text style={styles.crowdTitleMuted}>Currently Closed</Text>
            <Text style={styles.reportCountMuted}>No crowd data available while closed</Text>
          </View>
        ) : crowdDisplay.source === 'none' ? (
          <View style={styles.crowdCardMuted}>
            <Text style={styles.crowdTitleMuted}>No data yet</Text>
            <Text style={styles.reportCountMuted}>Be the first to report the crowd level</Text>
          </View>
        ) : (
          <View style={[styles.crowdCard, { backgroundColor: crowdBg, borderColor: crowdColor + '60' }]}>
            <View style={styles.crowdHeader}>
              {crowdDisplay.source === 'live' ? (
                <View style={styles.liveRow}>
                  <View style={styles.livePulse} />
                  <Text style={styles.crowdTitle}>Live</Text>
                </View>
              ) : (
                <Text style={styles.crowdTitle}>Typical</Text>
              )}
              <Text style={styles.reportCount}>
                {crowdDisplay.source === 'live'
                  ? `${crowdDisplay.reportCount} ${crowdDisplay.reportCount === 1 ? 'report' : 'reports'}`
                  : 'Based on historical data'}
              </Text>
            </View>
            <View style={styles.crowdLevelRow}>
              <View style={[styles.crowdDot, { backgroundColor: crowdColor }]} />
              <Text style={[styles.crowdLevelText, { color: crowdColor }]}>
                {crowdDisplay.level ? CROWD_LABELS[crowdDisplay.level] : ''}
              </Text>
            </View>
            <View style={styles.crowdMeter}>
              {(['empty', 'light', 'moderate', 'packed'] as const).map((level, i) => (
                <View
                  key={level}
                  style={[
                    styles.meterSegment,
                    { backgroundColor: CROWD_COLORS[level] },
                    crowdDisplay.level === level && styles.meterActive,
                    i === 0 && { borderTopLeftRadius: 6, borderBottomLeftRadius: 6 },
                    i === 3 && { borderTopRightRadius: 6, borderBottomRightRadius: 6 },
                  ]}
                />
              ))}
            </View>
          </View>
        )}

        {/* Report button */}
        <Pressable
          style={({ pressed }) => [styles.reportBtn, pressed && styles.reportBtnPressed]}
          onPress={() => router.push(`/submit/${id}`)}>
          <Text style={styles.reportBtnIcon}>📊</Text>
          <Text style={styles.reportBtnText}>Report crowd level</Text>
          <Text style={styles.reportBtnArrow}>›</Text>
        </Pressable>

        {/* Quick Reports — hidden for categories with no applicable report types */}
        {(() => {
          const qrConfigs = getQuickReportConfigs(location.type);
          if (!qrConfigs) return null;
          return (
            <QuickReportsSection
              configs={qrConfigs}
              aggregated={quickReports.aggregated}
              myLast={quickReports.myLast}
              cooldownFor={quickReports.cooldownFor}
              onSubmit={quickReports.submit}
            />
          );
        })()}

        {/* Quick Report summaries — above busy times, only renders if data exists */}
        {(() => {
          const qrConfigs = getQuickReportConfigs(location.type);
          if (!qrConfigs) return null;
          const activeTypes = new Set(qrConfigs.map(c => c.type));
          return (
            <QuickReportSummaries
              reports={quickReports.reports}
              priceReports={quickReports.priceReports}
              activeTypes={activeTypes}
            />
          );
        })()}

        {/* Busy times chart */}
        <BusyTimesChart
          data={location.busyHours}
          currentHour={currentHour}
          liveCrowd={crowdDisplay.source === 'live' ? crowdDisplay.level : undefined}
          googleLivePct={
            // Show Google's busyness estimate when the place is confirmed open
            // and there are no Prescout reports overriding it.
            location.openNow === true && crowdDisplay.source !== 'live'
              ? (location.busyHours[
                  currentHour >= 6 && currentHour <= 23
                    ? currentHour - 6
                    : currentHour < 6 ? 0 : 17
                ] ?? 0)
              : undefined
          }
          openHour={location.openHour}
          closeHour={location.closeHour}
        />

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

        {/* Google Reviews — compact tappable row */}
        {location.rating > 0 && (
          <Pressable
            style={({ pressed }) => [styles.googleRow, pressed && { opacity: 0.75 }]}
            onPress={() => router.push(`/reviews/${location.id}`)}>
            <View style={styles.googleBadge}>
              <Text style={styles.googleBadgeText}>G</Text>
            </View>
            <StarRating rating={location.rating} size={14} />
            <Text style={styles.googleRowText}>
              {location.rating.toFixed(1)}
              {location.googleReviewCount ? ` · ${location.googleReviewCount.toLocaleString()} reviews` : ''}
            </Text>
            <Text style={styles.googleRowChevron}>›</Text>
          </Pressable>
        )}

        {/* Prescout Reviews */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Prescout Reviews</Text>
            {averageRating !== null && (
              <View style={styles.avgRow}>
                <StarRating rating={averageRating} size={14} />
                <Text style={styles.avgText}>{averageRating.toFixed(1)} ({reviews.length})</Text>
              </View>
            )}
          </View>

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
              <Text style={styles.emptySub}>Be the first to leave a Prescout review!</Text>
            </View>
          ) : (
            <View style={styles.listCard}>
              {reviews.map(r => (
                <View key={r.id}>
                  <ReviewCard review={r} isOwn={r.userId === currentUserId} />
                  {claim.isCurrentUserOwner && (
                    <Pressable
                      style={styles.respondBtn}
                      onPress={() => setRespondTarget(r)}>
                      <Text style={styles.respondTxt}>
                        {r.ownerResponse ? '✏️ Edit response' : '↩ Respond as owner'}
                      </Text>
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Owner dashboard shortcut */}
        {claim.isCurrentUserOwner && (
          <Pressable
            style={({ pressed }) => [styles.dashBtn, pressed && { opacity: 0.8 }]}
            onPress={() => router.push(`/dashboard/${id}`)}>
            <Text style={styles.dashIcon}>📊</Text>
            <Text style={styles.dashText}>View owner dashboard</Text>
            <Text style={styles.dashArrow}>›</Text>
          </Pressable>
        )}

        {/* Claim this business — only shown when no claim has been submitted */}
        {!claim.loading && !claim.isClaimed && claim.myClaimStatus === 'none' && (
          <Pressable
            style={({ pressed }) => [styles.claimBtn, pressed && { opacity: 0.8 }]}
            onPress={() => setShowClaimModal(true)}>
            <Text style={styles.claimIcon}>🏢</Text>
            <Text style={styles.claimText}>Claim this business</Text>
            <Text style={styles.claimArrow}>›</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Watchlist sheet */}
      <WatchlistSheet
        visible={showWatchlist}
        placeName={location.name}
        currentWatchLevel={isWatching(location.id)?.alertLevel}
        onClose={() => setShowWatchlist(false)}
        onSelect={async (level) => {
          await addToWatchlist({
            placeId:    location.id,
            placeName:  location.name,
            placeImage: photoUrl ?? undefined,
            address:    location.address,
            latitude:   location.coordinates.lat,
            longitude:  location.coordinates.lng,
            alertLevel: level,
          });
        }}
        onRemove={isWatching(location.id) ? async () => {
          const item = isWatching(location.id);
          if (item) await removeFromWatchlist(item.id);
        } : undefined}
      />

      {/* Toast */}
      <Toast
        message="🚗 Added to your home screen for 4 hours"
        visible={showToast}
        onHide={() => setShowToast(false)}
      />

      {/* Modals */}
      <MapChooserModal
        visible={showMapChooser}
        options={mapOptions}
        onClose={() => setShowMapChooser(false)}
      />
      <ReviewForm
        visible={showReviewForm}
        onClose={() => setShowReviewForm(false)}
        existingReview={myReview}
        onSubmit={submitReview}
      />
      <ClaimModal
        visible={showClaimModal}
        locationName={location.name}
        locationAddress={location.address}
        onClose={() => setShowClaimModal(false)}
        onSubmit={claim.submitClaim}
      />
      {respondTarget && (
        <OwnerResponseModal
          visible={!!respondTarget}
          reviewerName={respondTarget.userName}
          existingResponse={respondTarget.ownerResponse}
          onClose={() => setRespondTarget(null)}
          onSubmit={content => claim.submitOwnerResponse(respondTarget.id, content)}
        />
      )}

      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: COLORS.bg },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn:         { paddingVertical: 4 },
  backText:        { color: COLORS.primary, fontSize: 18, fontWeight: '500' },
  headerActions:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon:      { fontSize: 22 },
  headingBtn:      { backgroundColor: COLORS.card, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.border },
  headingBtnActive:{ backgroundColor: COLORS.primary + '20', borderColor: COLORS.primary },
  headingBtnText:  { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  scroll:          { flex: 1 },
  content:         { padding: 20, paddingTop: 0, gap: 20, paddingBottom: 100 },
  notFound:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText:    { color: COLORS.textSec, fontSize: 16 },
  centerState:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
  centerStateText: { color: COLORS.textMuted, fontSize: 15 },
  errorEmoji:      { fontSize: 44 },
  errorTitle:      { color: COLORS.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  errorSub:        { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },
  retryBtn:        { marginTop: 8, backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 },
  retryText:       { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  infoSection:     { gap: 10 },
  nameRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  nameCol:         { flex: 1, gap: 4, justifyContent: 'center' },
  badgeRow:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingBadge:     { alignSelf: 'flex-start', backgroundColor: COLORS.card, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border },
  ratingBadgeText: { color: COLORS.textSec, fontSize: 12, fontWeight: '500' },
  verifiedBadge:   { backgroundColor: COLORS.primary + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 14, borderWidth: 1, borderColor: COLORS.primary + '50' },
  verifiedText:    { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  pendingBadge:    { backgroundColor: COLORS.moderate + '18', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 14, borderWidth: 1, borderColor: COLORS.moderate + '50' },
  pendingText:     { color: COLORS.moderate, fontSize: 12, fontWeight: '700' },
  name:            { color: COLORS.text, fontSize: 16, fontWeight: '600', lineHeight: 22 },
  address:         { color: COLORS.textSec, fontSize: 12 },
  addressLink:     { color: COLORS.primary, fontSize: 12, textDecorationLine: 'underline' },
  description:     { color: COLORS.textSec, fontSize: 14, lineHeight: 20, marginTop: 4 },
  hoursRow:        { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  hours:           { color: COLORS.textMuted, fontSize: 12 },
  distance:        { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  crowdCard:       { borderRadius: 16, padding: 16, gap: 12, borderWidth: 1 },
  crowdCardMuted:  { borderRadius: 16, padding: 16, gap: 6, borderWidth: 1, backgroundColor: COLORS.surface, borderColor: COLORS.border },
  crowdTitleMuted: { color: COLORS.textMuted, fontSize: 16, fontWeight: '700' },
  reportCountMuted:{ color: COLORS.textMuted, fontSize: 12 },
  crowdHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  liveRow:         { flexDirection: 'row', alignItems: 'center', gap: 7 },
  livePulse:       { width: 9, height: 9, borderRadius: 5, backgroundColor: COLORS.empty },
  crowdTitle:      { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  reportCount:     { color: COLORS.textMuted, fontSize: 12 },
  crowdLevelRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  crowdDot:        { width: 16, height: 16, borderRadius: 8 },
  crowdLevelText:  { fontSize: 28, fontWeight: '700' },
  crowdMeter:      { flexDirection: 'row', gap: 3 },
  meterSegment:    { flex: 1, height: 8, opacity: 0.35 },
  meterActive:     { opacity: 1 },
  reportBtn:       { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: COLORS.primary + '50' },
  reportBtnPressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  reportBtnIcon:   { fontSize: 22 },
  reportBtnText:   { flex: 1, color: COLORS.primary, fontSize: 16, fontWeight: '600' },
  reportBtnArrow:  { color: COLORS.primary, fontSize: 22 },
  section:         { gap: 14 },
  sectionHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle:    { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  googleRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.card, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: COLORS.border },
  googleBadge:     { width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.google, alignItems: 'center', justifyContent: 'center' },
  googleBadgeText: { color: COLORS.text, fontSize: 11, fontWeight: '800' },
  googleRowText:   { flex: 1, color: COLORS.textSec, fontSize: 14, fontWeight: '500' },
  googleRowChevron:{ color: COLORS.textMuted, fontSize: 20 },
  writeReviewBtn:  { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.primary + '50' },
  writeReviewText: { color: COLORS.primary, fontSize: 16, fontWeight: '600' },
  listCard:        { backgroundColor: COLORS.card, borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: COLORS.border },
  emptyCard:       { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyEmoji:      { fontSize: 40 },
  emptyTitle:      { color: COLORS.textSec, fontSize: 16, fontWeight: '600' },
  emptySub:        { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  respondBtn:      { paddingHorizontal: 16, paddingVertical: 8, marginTop: -6, marginBottom: 8 },
  respondTxt:      { color: COLORS.primary, fontSize: 14, fontWeight: '500' },
  dashBtn:         { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: COLORS.primary + '40' },
  dashIcon:        { fontSize: 22 },
  dashText:        { flex: 1, color: COLORS.primary, fontSize: 16, fontWeight: '600' },
  dashArrow:       { color: COLORS.primary, fontSize: 22 },
  claimBtn:        { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: COLORS.border },
  claimIcon:       { fontSize: 22 },
  claimText:       { flex: 1, color: COLORS.textSec, fontSize: 16, fontWeight: '600' },
  claimArrow:      { color: COLORS.textMuted, fontSize: 22 },
  claimPending:    { backgroundColor: COLORS.moderate + '15', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: COLORS.moderate + '40' },
  claimPendingIcon: { fontSize: 24 },
  claimPendingTitle: { color: COLORS.moderate, fontSize: 14, fontWeight: '700' },
  claimPendingSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
});
