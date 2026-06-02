import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeadingThereCard from '@/components/HeadingThereCard';
import TrendingCard from '@/components/TrendingCard';
import { COLORS } from '@/constants/crowdColors';
import { useAppContext } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useGeofencing } from '@/hooks/useGeofencing';
import { useHeadingThere } from '@/hooks/useHeadingThere';
import { useWatchlist } from '@/hooks/useWatchlist';
import { requestNotificationPermission, setupNotificationCategories, useNotificationResponse } from '@/hooks/useNotifications';
import { useTrending } from '@/hooks/useTrending';
import type { TrendingLocation } from '@/hooks/useTrending';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { locations, savedLocationIds, recentLocationIds, addRecentLocation, submitReport } = useAppContext();

  const { trending, loading: trendingLoading } = useTrending(locations);
  const { destination, clearDestination, reload: reloadDestination } = useHeadingThere();
  const { items: watchlistItems, reload: reloadWatchlist } = useWatchlist();

  useFocusEffect(useCallback(() => {
    reloadDestination();
    reloadWatchlist();
  }, [reloadDestination, reloadWatchlist]));
  const isLive = trending.some(t => t.recentReports > 0);

  useGeofencing([...savedLocationIds, ...recentLocationIds.slice(0, 5)], locations);
  useNotificationResponse((locationId, level) => { submitReport(locationId, level); });

  useEffect(() => {
    async function setup() {
      await requestNotificationPermission();
      await setupNotificationCategories();
    }
    setup();
  }, []);

  const favoriteLocations = useMemo<TrendingLocation[]>(
    () => savedLocationIds.slice(0, 6).flatMap(id => {
      const loc = locations.find(l => l.id === id);
      return loc ? [{ ...loc, recentReports: 0 }] : [];
    }),
    [savedLocationIds, locations],
  );

  function handleLocationPress(id: string) {
    addRecentLocation(id);
    router.push(`/location/${id}`);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
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

        {/* Watchlist indicator */}
        {watchlistItems.length > 0 && (
          <Pressable
            style={({ pressed }) => [styles.watchlistRow, pressed && { opacity: 0.75 }]}
            onPress={() => router.push('/(tabs)/profile')}>
            <Text style={styles.watchlistText}>
              👁️ Watching {watchlistItems.length} {watchlistItems.length === 1 ? 'place' : 'places'}
            </Text>
            <Text style={styles.watchlistChevron}>›</Text>
          </Pressable>
        )}

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
              <Text style={[styles.emptyText, { color: COLORS.textSec, fontWeight: '600', fontSize: 16 }]}>No trending places yet</Text>
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
                />
              ))}
            </ScrollView>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.bg },
  scroll:  { flex: 1 },
  content: { padding: 20, gap: 24, paddingBottom: 80 },

  header:   { gap: 2 },
  greeting: { color: COLORS.textSec, fontSize: 14 },
  userName: { color: COLORS.text, fontSize: 24, fontWeight: '700' },

  watchlistRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: COLORS.border },
  watchlistText:   { flex: 1, color: COLORS.textSec, fontSize: 14, fontWeight: '600' },
  watchlistChevron:{ color: COLORS.textMuted, fontSize: 18 },
  section:    { gap: 14 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  sectionSub:   { color: COLORS.textMuted, fontSize: 12 },

  cardRow: { gap: 10, paddingRight: 4 },

  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 40 },
  loadingText:{ color: COLORS.textMuted, fontSize: 14 },

  emptyBox:  { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { color: COLORS.textMuted, fontSize: 14 },

  emptyFavs: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyFavsIcon: { fontSize: 40 },
  emptyFavsText: { color: COLORS.textSec, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  emptyFavsHint: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center' },
});
