import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ConfirmModal from '@/components/ConfirmModal';
import HeadingThereCard from '@/components/HeadingThereCard';
import TrendingCard from '@/components/TrendingCard';
import WatchlistHomeCard from '@/components/WatchlistHomeCard';
import RateAppModal from '@/components/RateAppModal';
import { COLORS } from '@/constants/crowdColors';
import { useAppContext } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useGeofencing } from '@/hooks/useGeofencing';
import { useHeadingThere } from '@/hooks/useHeadingThere';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useRateApp } from '@/hooks/useRateApp';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/themes';
import { requestNotificationPermission, setupNotificationCategories, useNotificationResponse } from '@/hooks/useNotifications';
import { useTrending } from '@/hooks/useTrending';
import { getCrowdDisplay, computeIsOpenNow } from '@/utils/crowdUtils';
import type { TrendingLocation } from '@/hooks/useTrending';

const WATCHLIST_HOME_LIMIT = 5;

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { locations, savedLocationIds, recentLocationIds, addRecentLocation, submitReport, getLocationById, getReportsForLocation, toggleSaved, refreshData, refreshLoading } = useAppContext();
  const [removingFav, setRemovingFav] = useState<{ id: string; name: string } | null>(null);

  const { trending, loading: trendingLoading } = useTrending(locations);
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { destination, clearDestination, reload: reloadDestination } = useHeadingThere();
  const { items: watchlistItems, removeFromWatchlist, reload: reloadWatchlist } = useWatchlist();
  const { showPrompt, onReportSubmitted, dismiss, rated } = useRateApp();

  useFocusEffect(useCallback(() => {
    reloadDestination();
    reloadWatchlist();
  }, [reloadDestination, reloadWatchlist]));

  const isLive = trending.some(t => t.recentReports > 0);

  useGeofencing([...savedLocationIds, ...recentLocationIds.slice(0, 5)], locations);

  useNotificationResponse({
    onReport: async (locationId, level) => {
      await submitReport(locationId, level);
      onReportSubmitted();
    },
    onNavigate: (locationId) => {
      addRecentLocation(locationId);
      router.push(`/location/${locationId}`);
    },
  });

  useEffect(() => {
    async function setup() {
      await requestNotificationPermission();
      await setupNotificationCategories();
    }
    setup();
  }, []);

  const favoriteLocations = useMemo<TrendingLocation[]>(
    () => savedLocationIds.flatMap(id => {
      const loc = locations.find(l => l.id === id);
      return loc ? [{ ...loc, recentReports: 0 }] : [];
    }),
    [savedLocationIds, locations],
  );

  function handleLocationPress(id: string) {
    addRecentLocation(id);
    router.push(`/location/${id}`);
  }

  // Active watchlist items only (capped for home screen)
  const visibleWatchlist = watchlistItems.slice(0, WATCHLIST_HOME_LIMIT);
  const hasMoreWatchlist  = watchlistItems.length > WATCHLIST_HOME_LIMIT;

  // New-user empty state: no favorites, no trending, not loading
  const isNewUser = !trendingLoading && trending.length === 0 && favoriteLocations.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshLoading} onRefresh={refreshData} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.userName}>{user?.name ?? 'there'} 👋</Text>
        </View>

        {/* Heading There */}
        {destination && (
          <HeadingThereCard
            destination={destination}
            onPress={() => {
              addRecentLocation(destination.placeId);
              router.push(`/location/${destination.placeId}`);
            }}
            onDismiss={clearDestination}
          />
        )}

        {/* Watching section — hidden when empty */}
        {visibleWatchlist.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>👁️  Watching</Text>
              {hasMoreWatchlist && (
                <Pressable onPress={() => router.push('/(tabs)/profile')}>
                  <Text style={styles.seeAll}>See all ({watchlistItems.length})</Text>
                </Pressable>
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cardRow}>
              {visibleWatchlist.map(item => {
                const loc      = getLocationById(item.placeId);
                const reports  = getReportsForLocation(item.placeId);
                const display  = loc ? getCrowdDisplay(loc, reports) : null;
                const crowd    = display?.level ?? loc?.currentCrowd ?? null;
                const isOpen   = loc ? computeIsOpenNow(loc.openHour, loc.closeHour, loc.openNow) : true;

                return (
                  <WatchlistHomeCard
                    key={item.id}
                    item={item}
                    currentCrowd={crowd}
                    locationType={loc?.type}
                    isOpen={isOpen}
                    onPress={() => handleLocationPress(item.placeId)}
                    onRemove={removeFromWatchlist}
                  />
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* New-user welcome empty state */}
        {isNewUser ? (
          <View style={styles.welcomeBox}>
            <Text style={styles.welcomeEmoji}>👋</Text>
            <Text style={styles.welcomeTitle}>Welcome to Prescout!</Text>
            <Text style={styles.welcomeSub}>
              Search for a place nearby to get started
            </Text>
            <Pressable
              style={({ pressed }) => [styles.exploreBtn, pressed && { opacity: 0.8 }]}
              onPress={() => router.push('/(tabs)/search')}>
              <Text style={styles.exploreBtnText}>Start Exploring</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Trending */}
            <View style={styles.section}>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>🔥  Trending</Text>
                <Text style={styles.sectionSub}>
                  {isLive ? 'Last hour' : 'Top reviewed'}
                </Text>
              </View>

              {trendingLoading && trending.length === 0 ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={COLORS.primary} size="small" />
                  <Text style={styles.loadingText}>Loading…</Text>
                </View>
              ) : trending.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={{ fontSize: 40 }}>🔥</Text>
                  <Text style={[styles.emptyText, { color: colors.textSec, fontWeight: '600', fontSize: 16 }]}>No trending places yet</Text>
                  <Text style={styles.emptyText}>Search for nearby places to get started</Text>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.cardRow}>
                  {trending.map((loc, i) => (
                    <TrendingCard
                      key={loc.id}
                      location={loc}
                      rank={i + 1}
                      onPress={() => handleLocationPress(loc.id)}
                    />
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Favorites */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>❤️  Favorites</Text>

              {favoriteLocations.length === 0 ? (
                <Pressable
                  style={styles.emptyFavs}
                  onPress={() => router.push('/(tabs)/search')}>
                  <Text style={styles.emptyFavsIcon}>🔖</Text>
                  <Text style={styles.emptyFavsText}>
                    Save places you love to see them here
                  </Text>
                  <Text style={styles.emptyFavsHint}>
                    Tap ♡ on any location to save it
                  </Text>
                </Pressable>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.cardRow}>
                  {favoriteLocations.map(loc => (
                    <TrendingCard
                      key={loc.id}
                      location={loc}
                      rank={0}
                      showRank={false}
                      onPress={() => handleLocationPress(loc.id)}
                      onRemove={() => setRemovingFav({ id: loc.id, name: loc.name })}
                    />
                  ))}
                </ScrollView>
              )}
            </View>
          </>
        )}

      </ScrollView>

      {/* Rate App Modal */}
      <RateAppModal
        visible={showPrompt}
        onRate={rated}
        onDismiss={dismiss}
      />

      {/* Remove favorite confirmation */}
      <ConfirmModal
        visible={!!removingFav}
        title="Remove from Favorites?"
        message={removingFav ? `Remove ${removingFav.name} from favorites?` : ''}
        onClose={() => setRemovingFav(null)}
        actions={[
          {
            label: 'Remove',
            destructive: true,
            onPress: async () => {
              if (removingFav) await toggleSaved(removingFav.id);
              setRemovingFav(null);
            },
          },
          { label: 'Cancel', cancel: true, onPress: () => {} },
        ]}
      />
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safe:           { flex: 1, backgroundColor: c.bg },
    scroll:         { flex: 1 },
    content:        { padding: 20, gap: 24, paddingBottom: 80 },
    header:         { gap: 2 },
    greeting:       { color: c.textSec, fontSize: 14 },
    userName:       { color: c.text, fontSize: 24, fontWeight: '700' },
    welcomeBox:     { alignItems: 'center', paddingVertical: 48, gap: 12 },
    welcomeEmoji:   { fontSize: 56 },
    welcomeTitle:   { color: c.text, fontSize: 24, fontWeight: '700', textAlign: 'center' },
    welcomeSub:     { color: c.textSec, fontSize: 15, textAlign: 'center', lineHeight: 22 },
    exploreBtn:     { marginTop: 8, backgroundColor: COLORS.primary, borderRadius: 16, paddingHorizontal: 32, paddingVertical: 14 },
    exploreBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    section:        { gap: 14 },
    sectionRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sectionTitle:   { color: c.text, fontSize: 18, fontWeight: '700' },
    sectionSub:     { color: c.textMuted, fontSize: 12 },
    seeAll:         { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
    cardRow:        { gap: 10, paddingRight: 4 },
    loadingRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 40 },
    loadingText:    { color: c.textMuted, fontSize: 14 },
    emptyBox:       { alignItems: 'center', paddingVertical: 40, gap: 8 },
    emptyText:      { color: c.textMuted, fontSize: 14 },
    emptyFavs:      { backgroundColor: c.card, borderRadius: 16, padding: 16, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: c.border },
    emptyFavsIcon:  { fontSize: 40 },
    emptyFavsText:  { color: c.textSec, fontSize: 16, fontWeight: '600', textAlign: 'center' },
    emptyFavsHint:  { color: c.textMuted, fontSize: 12, textAlign: 'center' },
  });
}
