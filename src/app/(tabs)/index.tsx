import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LocationCard from '@/components/LocationCard';
import { COLORS } from '@/constants/crowdColors';
import { useAppContext } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useGeofencing } from '@/hooks/useGeofencing';
import { requestNotificationPermission, setupNotificationCategories, useNotificationResponse } from '@/hooks/useNotifications';
import { CROWD_COLORS, CROWD_LABELS } from '@/utils/crowdUtils';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { locations, savedLocationIds, recentLocationIds, addRecentLocation, submitReport } = useAppContext();
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  useGeofencing([...savedLocationIds, ...recentLocationIds.slice(0, 5)]);

  useNotificationResponse((locationId, level) => {
    submitReport(locationId, level);
  });

  useEffect(() => {
    async function setup() {
      await requestNotificationPermission();
      await setupNotificationCategories();
    }
    setup();
  }, []);

  const nearbyLocations = useMemo(() => {
    return locations.filter(l =>
      !search || l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.type.toLowerCase().includes(search.toLowerCase())
    );
  }, [locations, search]);

  function handleLocationPress(id: string) {
    addRecentLocation(id);
    router.push(`/location/${id}`);
  }

  function handleSearch() {
    if (search) {
      router.push({ pathname: '/(tabs)/search', params: { q: search } });
    }
  }

  const busyCounts = useMemo(() => {
    return locations.filter(l => l.currentCrowd === 'packed' || l.currentCrowd === 'moderate').length;
  }, [locations]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{user?.name ?? 'there'} 👋</Text>
          </View>
          <View style={styles.statBubble}>
            <View style={[styles.statDot, { backgroundColor: CROWD_COLORS.packed }]} />
            <Text style={styles.statText}>{busyCounts} busy nearby</Text>
          </View>
        </View>

        {/* Search bar */}
        <Pressable onPress={handleSearch}>
          <View style={[styles.searchBar, searchFocused && styles.searchFocused]}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search gyms, bars, restaurants..."
              placeholderTextColor={COLORS.textMuted}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </View>
        </Pressable>

        {/* Quick crowd status strip */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stripScroll} contentContainerStyle={styles.stripContent}>
          {(['empty', 'light', 'moderate', 'packed'] as const).map(level => {
            const count = locations.filter(l => l.currentCrowd === level).length;
            return (
              <View key={level} style={[styles.strip, { borderColor: CROWD_COLORS[level] + '50', backgroundColor: CROWD_COLORS[level] + '15' }]}>
                <Text style={[styles.stripCount, { color: CROWD_COLORS[level] }]}>{count}</Text>
                <Text style={styles.stripLabel}>{CROWD_LABELS[level]}</Text>
              </View>
            );
          })}
        </ScrollView>

        {/* Nearby locations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nearby</Text>
          {nearbyLocations.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No locations found.</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {nearbyLocations.map(loc => (
                <LocationCard
                  key={loc.id}
                  location={loc}
                  onPress={() => handleLocationPress(loc.id)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { color: COLORS.textSec, fontSize: 14 },
  userName: { color: COLORS.text, fontSize: 24, fontWeight: '700' },
  statBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statDot: { width: 8, height: 8, borderRadius: 4 },
  statText: { color: COLORS.textSec, fontSize: 12, fontWeight: '500' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchFocused: { borderColor: COLORS.primary },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 15 },
  stripScroll: { marginHorizontal: -20 },
  stripContent: { paddingHorizontal: 20, gap: 10 },
  strip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 80,
  },
  stripCount: { fontSize: 22, fontWeight: '800' },
  stripLabel: { color: COLORS.textSec, fontSize: 11, marginTop: 2 },
  section: { gap: 12 },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  list: { gap: 10 },
  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { color: COLORS.textMuted, fontSize: 15 },
});
