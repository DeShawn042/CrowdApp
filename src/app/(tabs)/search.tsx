import { useLocalSearchParams, router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { LocationType } from '@/data/mockData';
import { CROWD_COLORS, CROWD_LABELS } from '@/utils/crowdUtils';

const TYPE_FILTERS: { label: string; value: LocationType | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: '🏋️ Gyms', value: 'gym' },
  { label: '🍺 Bars', value: 'bar' },
  { label: '🍽️ Restaurants', value: 'restaurant' },
];

const CROWD_FILTERS = (['all', 'empty', 'light', 'moderate', 'packed'] as const);

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const { locations, addRecentLocation } = useAppContext();
  const [query, setQuery] = useState(params.q ?? '');
  const [typeFilter, setTypeFilter] = useState<LocationType | 'all'>('all');
  const [crowdFilter, setCrowdFilter] = useState<'all' | 'empty' | 'light' | 'moderate' | 'packed'>('all');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (params.q) {
      setQuery(params.q);
    }
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [params.q]);

  const results = useMemo(() => {
    return locations.filter(l => {
      const matchesQuery =
        !query ||
        l.name.toLowerCase().includes(query.toLowerCase()) ||
        l.type.toLowerCase().includes(query.toLowerCase()) ||
        l.address.toLowerCase().includes(query.toLowerCase());
      const matchesType = typeFilter === 'all' || l.type === typeFilter;
      const matchesCrowd = crowdFilter === 'all' || l.currentCrowd === crowdFilter;
      return matchesQuery && matchesType && matchesCrowd;
    });
  }, [locations, query, typeFilter, crowdFilter]);

  function handlePress(id: string) {
    addRecentLocation(id);
    router.push(`/location/${id}`);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search locations..."
            placeholderTextColor={COLORS.textMuted}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Type filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {TYPE_FILTERS.map(f => (
            <Pressable
              key={f.value}
              style={[styles.filterChip, typeFilter === f.value && styles.filterChipActive]}
              onPress={() => setTypeFilter(f.value)}>
              <Text style={[styles.filterChipText, typeFilter === f.value && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Crowd filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {CROWD_FILTERS.map(cf => (
            <Pressable
              key={cf}
              style={[
                styles.crowdChip,
                crowdFilter === cf && styles.crowdChipActive,
                cf !== 'all' && crowdFilter === cf && { borderColor: CROWD_COLORS[cf], backgroundColor: CROWD_COLORS[cf] + '20' },
              ]}
              onPress={() => setCrowdFilter(cf)}>
              <Text style={[
                styles.crowdChipText,
                crowdFilter === cf && cf === 'all' && styles.filterChipTextActive,
                crowdFilter === cf && cf !== 'all' && { color: CROWD_COLORS[cf] },
              ]}>
                {cf === 'all' ? 'Any crowd' : CROWD_LABELS[cf]}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Results */}
        <View style={styles.results}>
          <Text style={styles.resultCount}>{results.length} result{results.length !== 1 ? 's' : ''}</Text>
          {results.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyTitle}>No locations found</Text>
              <Text style={styles.emptySubtitle}>Try adjusting your search or filters</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {results.map(loc => (
                <LocationCard key={loc.id} location={loc} onPress={() => handlePress(loc.id)} />
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
  searchRow: { paddingHorizontal: 20, paddingVertical: 12 },
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
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 15 },
  scroll: { flex: 1 },
  filterRow: { paddingHorizontal: 20, paddingBottom: 8, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { color: COLORS.textSec, fontSize: 13, fontWeight: '500' },
  filterChipTextActive: { color: '#fff' },
  crowdChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  crowdChipActive: { borderWidth: 1 },
  crowdChipText: { color: COLORS.textSec, fontSize: 13, fontWeight: '500' },
  results: { padding: 20, paddingTop: 8, gap: 12 },
  resultCount: { color: COLORS.textMuted, fontSize: 12 },
  list: { gap: 10 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { color: COLORS.textSec, fontSize: 18, fontWeight: '600' },
  emptySubtitle: { color: COLORS.textMuted, fontSize: 14 },
});
