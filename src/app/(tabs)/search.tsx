import { useLocalSearchParams, router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { Location } from '@/data/mockData';
import { searchNearby, searchText } from '@/utils/googlePlaces';
import { CROWD_COLORS, CROWD_LABELS } from '@/utils/crowdUtils';

interface PlaceCategory {
  id: string;
  label: string;
  emoji: string;
  types: string[];
  color: string;
}

const CATEGORIES: PlaceCategory[] = [
  { id: 'restaurants',    label: 'Restaurants',     emoji: '🍔', types: ['restaurant', 'fast_food_restaurant', 'meal_takeaway', 'bakery'], color: '#EF4444' },
  { id: 'cafes',          label: 'Coffee & Cafes',  emoji: '☕', types: ['cafe'],                                                          color: '#F59E0B' },
  { id: 'bars',           label: 'Bars & Nightlife', emoji: '🍺', types: ['bar', 'night_club'],                                            color: '#8B5CF6' },
  { id: 'gyms',           label: 'Gyms & Fitness',  emoji: '💪', types: ['gym', 'fitness_center'],                                        color: '#22C55E' },
  { id: 'shopping',       label: 'Shopping',         emoji: '🛍️', types: ['shopping_mall', 'clothing_store', 'department_store', 'shoe_store'], color: '#EC4899' },
  { id: 'entertainment',  label: 'Entertainment',    emoji: '🎬', types: ['movie_theater', 'bowling_alley', 'amusement_park', 'casino'],  color: '#0EA5E9' },
  { id: 'spas',           label: 'Salons & Spas',    emoji: '💆', types: ['spa', 'beauty_salon', 'hair_care'],                            color: '#D946EF' },
  { id: 'medical',        label: 'Medical',          emoji: '🏥', types: ['hospital', 'pharmacy', 'doctor', 'dentist'],                   color: '#06B6D4' },
  { id: 'parks',          label: 'Parks',            emoji: '🌳', types: ['park'],                                                        color: '#16A34A' },
  { id: 'gas',            label: 'Gas Stations',     emoji: '⛽', types: ['gas_station'],                                                 color: '#64748B' },
  { id: 'hotels',         label: 'Hotels',           emoji: '🏨', types: ['lodging'],                                                     color: '#D97706' },
];

const CROWD_FILTERS = (['all', 'empty', 'light', 'moderate', 'packed'] as const);

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const { locations, userLocation, addRecentLocation, registerLocation } = useAppContext();

  const [query,             setQuery]             = useState(params.q ?? '');
  const [crowdFilter,       setCrowdFilter]       = useState<'all' | 'empty' | 'light' | 'moderate' | 'packed'>('all');
  const [textResults,       setTextResults]       = useState<Location[]>([]);
  const [textSearching,     setTextSearching]     = useState(false);
  const [selectedCategory,  setSelectedCategory]  = useState<PlaceCategory | null>(null);
  const [categoryResults,   setCategoryResults]   = useState<Location[]>([]);
  const [categorySearching, setCategorySearching] = useState(false);

  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (params.q) {
      setQuery(params.q);
      setSelectedCategory(null);
    }
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [params.q]);

  // Debounced text search — clears category selection while typing
  useEffect(() => {
    if (!query.trim()) {
      setTextResults([]);
      setTextSearching(false);
      return;
    }
    setSelectedCategory(null);
    setTextSearching(true);
    const timer = setTimeout(async () => {
      const results = await searchText(query, userLocation?.lat, userLocation?.lng);
      setTextResults(results);
      setTextSearching(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [query, userLocation?.lat, userLocation?.lng]);

  const handleCategoryPress = useCallback(async (cat: PlaceCategory) => {
    if (!userLocation) return;
    setSelectedCategory(cat);
    setCategoryResults([]);
    setCategorySearching(true);
    const results = await searchNearby(userLocation.lat, userLocation.lng, 3000, cat.types);
    setCategoryResults(results);
    setCategorySearching(false);
  }, [userLocation]);

  function clearCategory() {
    setSelectedCategory(null);
    setCategoryResults([]);
    setCrowdFilter('all');
  }

  // Derive active mode from state
  const isTextMode     = query.trim().length > 0;
  const isCategoryMode = !isTextMode && selectedCategory !== null;
  const isBrowseMode   = !isTextMode && !isCategoryMode;

  const baseLocations = isTextMode ? textResults : isCategoryMode ? categoryResults : locations;
  const isLoading     = isTextMode ? textSearching : isCategoryMode ? categorySearching : false;

  const results = useMemo(() => (
    baseLocations.filter(l => crowdFilter === 'all' || l.currentCrowd === crowdFilter)
  ), [baseLocations, crowdFilter]);

  function handlePress(loc: Location) {
    registerLocation(loc);       // ensure detail screen can find it
    addRecentLocation(loc.id);
    router.push(`/location/${loc.id}`);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={[styles.searchBar, isTextMode && styles.searchBarFocused]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search places near you…"
            placeholderTextColor={COLORS.textMuted}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {(textSearching || categorySearching) && (
            <ActivityIndicator size="small" color={COLORS.primary} style={styles.spinner} />
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {isBrowseMode ? (
          /* ── Category grid ─────────────────────────────────── */
          <View style={styles.browseSection}>
            <Text style={styles.browseTitle}>Browse Categories</Text>
            <View style={styles.grid}>
              {CATEGORIES.map(cat => (
                <Pressable
                  key={cat.id}
                  style={({ pressed }) => [
                    styles.tile,
                    { borderColor: cat.color + '50', backgroundColor: cat.color + '14' },
                    pressed && styles.tilePressed,
                  ]}
                  onPress={() => handleCategoryPress(cat)}>
                  <Text style={styles.tileEmoji}>{cat.emoji}</Text>
                  <Text style={[styles.tileLabel, { color: cat.color }]} numberOfLines={2}>
                    {cat.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          /* ── Results view ──────────────────────────────────── */
          <>
            {/* Active category chip */}
            {isCategoryMode && selectedCategory && (
              <View style={styles.catChipRow}>
                <Pressable
                  style={[styles.catChip, { borderColor: selectedCategory.color, backgroundColor: selectedCategory.color + '18' }]}
                  onPress={clearCategory}>
                  <Text style={styles.catChipEmoji}>{selectedCategory.emoji}</Text>
                  <Text style={[styles.catChipLabel, { color: selectedCategory.color }]}>
                    {selectedCategory.label}
                  </Text>
                  <Text style={[styles.catChipClear, { color: selectedCategory.color }]}>✕</Text>
                </Pressable>
              </View>
            )}

            {/* Crowd filter chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}>
              {CROWD_FILTERS.map(cf => (
                <Pressable
                  key={cf}
                  style={[
                    styles.crowdChip,
                    crowdFilter === cf && styles.crowdChipActive,
                    cf !== 'all' && crowdFilter === cf && {
                      borderColor: CROWD_COLORS[cf],
                      backgroundColor: CROWD_COLORS[cf] + '20',
                    },
                  ]}
                  onPress={() => setCrowdFilter(cf)}>
                  <Text style={[
                    styles.crowdChipText,
                    crowdFilter === cf && cf === 'all' && styles.crowdChipTextActive,
                    crowdFilter === cf && cf !== 'all' && { color: CROWD_COLORS[cf] },
                  ]}>
                    {cf === 'all' ? 'Any crowd' : CROWD_LABELS[cf]}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Results list */}
            <View style={styles.results}>
              {isLoading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.loadingText}>Finding places…</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.resultCount}>
                    {results.length} result{results.length !== 1 ? 's' : ''}
                  </Text>
                  {results.length === 0 ? (
                    <View style={styles.empty}>
                      <Text style={styles.emptyEmoji}>🔍</Text>
                      <Text style={styles.emptyTitle}>No locations found</Text>
                      <Text style={styles.emptySubtitle}>
                        {userLocation
                          ? 'Try adjusting your search or filters'
                          : 'Enable location access to find nearby places'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.list}>
                      {results.map(loc => (
                        <LocationCard
                          key={loc.id}
                          location={loc}
                          onPress={() => handlePress(loc)}
                        />
                      ))}
                    </View>
                  )}
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const TILE_GAP = 12;

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: COLORS.bg },
  searchRow:  { paddingHorizontal: 20, paddingVertical: 12 },
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
  searchBarFocused: { borderColor: COLORS.primary },
  searchIcon:  { fontSize: 16 },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 15 },
  spinner:     { marginLeft: 4 },
  scroll:      { flex: 1 },

  /* ── Browse / category grid ── */
  browseSection: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 32 },
  browseTitle:   { color: COLORS.text, fontSize: 20, fontWeight: '700', marginBottom: 16 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: TILE_GAP,
  },
  tile: {
    width: `${(100 - TILE_GAP / 2) / 2}%` as any,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 14,
    gap: 8,
    alignItems: 'flex-start',
  },
  tilePressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
  tileEmoji:   { fontSize: 28 },
  tileLabel:   { fontSize: 13, fontWeight: '600', lineHeight: 18 },

  /* ── Active category chip ── */
  catChipRow:   { paddingHorizontal: 20, paddingBottom: 8 },
  catChip:      { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  catChipEmoji: { fontSize: 15 },
  catChipLabel: { fontSize: 14, fontWeight: '600' },
  catChipClear: { fontSize: 13, fontWeight: '700', marginLeft: 2 },

  /* ── Crowd filter ── */
  filterRow: { paddingHorizontal: 20, paddingBottom: 10, gap: 8 },
  crowdChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  crowdChipActive:    { borderWidth: 1 },
  crowdChipText:      { color: COLORS.textSec, fontSize: 13, fontWeight: '500' },
  crowdChipTextActive:{ color: '#fff' },

  /* ── Results ── */
  results:      { padding: 20, paddingTop: 4, gap: 12 },
  loadingBox:   { alignItems: 'center', paddingTop: 60, gap: 14 },
  loadingText:  { color: COLORS.textMuted, fontSize: 14 },
  resultCount:  { color: COLORS.textMuted, fontSize: 12 },
  list:         { gap: 10 },
  empty:        { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyEmoji:   { fontSize: 48 },
  emptyTitle:   { color: COLORS.textSec, fontSize: 18, fontWeight: '600' },
  emptySubtitle:{ color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },
});
