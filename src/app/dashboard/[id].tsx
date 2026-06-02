import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StarRating from '@/components/StarRating';
import { COLORS } from '@/constants/crowdColors';
import { useAppContext } from '@/context/AppContext';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { CROWD_COLORS, CROWD_LABELS } from '@/utils/crowdUtils';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/themes';
import type { CrowdLevel } from '@/data/mockData';

interface DashboardStats {
  totalReports30d:  number;
  totalReports7d:   number;
  crowdBreakdown:   Record<CrowdLevel, number>;
  totalReviews:     number;
  averageRating:    number | null;
  recentReviews:    { userName: string; rating: number; content: string; createdAt: string }[];
}

const LEVEL_NUMS: Record<CrowdLevel, number> = { empty: 0, light: 1, moderate: 2, packed: 3 };

export default function OwnerDashboard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getLocationById } = useAppContext();
  const location = getLocationById(id ?? '');

  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [stats, setStats]   = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchStats(id);
  }, [id]);

  async function fetchStats(locationId: string) {
    if (!isSupabaseConfigured) {
      // Provide illustrative mock stats when Supabase isn't connected
      setStats({
        totalReports30d: 0, totalReports7d: 0,
        crowdBreakdown: { empty: 0, light: 0, moderate: 0, packed: 0 },
        totalReviews: 0, averageRating: null, recentReviews: [],
      });
      setLoading(false);
      return;
    }

    const now = new Date();
    const d7  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000).toISOString();
    const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [{ data: reports30 }, { data: reports7 }, { data: reviewData }] = await Promise.all([
      supabase.from('crowd_reports').select('crowd_level').eq('location_id', locationId).gte('created_at', d30),
      supabase.from('crowd_reports').select('crowd_level').eq('location_id', locationId).gte('created_at', d7),
      supabase.from('reviews')
        .select('user_name, rating, content, created_at')
        .eq('location_id', locationId)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    const breakdown: Record<CrowdLevel, number> = { empty: 0, light: 0, moderate: 0, packed: 0 };
    (reports30 ?? []).forEach(r => {
      const lvl = r.crowd_level as CrowdLevel;
      if (lvl in breakdown) breakdown[lvl]++;
    });

    const ratings = (reviewData ?? []).map(r => r.rating);
    const avgRating = ratings.length > 0
      ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10
      : null;

    setStats({
      totalReports30d: (reports30 ?? []).length,
      totalReports7d:  (reports7 ?? []).length,
      crowdBreakdown:  breakdown,
      totalReviews:    (reviewData ?? []).length,
      averageRating:   avgRating,
      recentReviews:   (reviewData ?? []).map(r => ({
        userName: r.user_name, rating: r.rating, content: r.content, createdAt: r.created_at,
      })),
    });
    setLoading(false);
  }

  if (!location) {
    return (
      <SafeAreaView style={styles.safe}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <View style={styles.center}><Text style={styles.muted}>Location not found.</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Owner Dashboard</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Location name + verified badge */}
        <View style={styles.locHeader}>
          <Text style={styles.locName}>{location.name}</Text>
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedTxt}>✓ Verified Owner</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={COLORS.primary} size="large" />
            <Text style={styles.loadingText}>Loading dashboard…</Text>
          </View>
        ) : stats ? (
          <>
            {/* Report stats */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Crowd Reports</Text>
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={styles.statNum}>{stats.totalReports7d}</Text>
                  <Text style={styles.statLabel}>Last 7 days</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={styles.statNum}>{stats.totalReports30d}</Text>
                  <Text style={styles.statLabel}>Last 30 days</Text>
                </View>
              </View>
            </View>

            {/* Crowd distribution */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Crowd Distribution (30 days)</Text>
              {stats.totalReports30d === 0 ? (
                <Text style={styles.muted}>No reports yet in this period.</Text>
              ) : (
                <View style={styles.breakdown}>
                  {(Object.entries(stats.crowdBreakdown) as [CrowdLevel, number][]).map(([level, count]) => {
                    const pct = stats.totalReports30d > 0 ? count / stats.totalReports30d : 0;
                    return (
                      <View key={level} style={styles.breakdownRow}>
                        <Text style={[styles.breakdownLabel, { color: CROWD_COLORS[level] }]}>
                          {CROWD_LABELS[level]}
                        </Text>
                        <View style={styles.barTrack}>
                          <View style={[styles.barFill, { width: `${pct * 100}%` as any, backgroundColor: CROWD_COLORS[level] }]} />
                        </View>
                        <Text style={styles.breakdownCount}>{count}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Review summary */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Reviews</Text>
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={styles.statNum}>{stats.totalReviews}</Text>
                  <Text style={styles.statLabel}>Total reviews</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  {stats.averageRating !== null ? (
                    <>
                      <Text style={styles.statNum}>{stats.averageRating.toFixed(1)}</Text>
                      <StarRating rating={stats.averageRating} size={13} />
                    </>
                  ) : (
                    <Text style={styles.muted}>No ratings</Text>
                  )}
                  <Text style={styles.statLabel}>Avg rating</Text>
                </View>
              </View>
            </View>

            {/* Recent reviews */}
            {stats.recentReviews.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Recent Reviews</Text>
                {stats.recentReviews.map((r, i) => (
                  <View key={i} style={[styles.reviewRow, i > 0 && styles.reviewBorder]}>
                    <View style={styles.reviewTop}>
                      <Text style={styles.reviewName}>{r.userName}</Text>
                      <StarRating rating={r.rating} size={12} />
                    </View>
                    <Text style={styles.reviewContent} numberOfLines={2}>{r.content}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) { return StyleSheet.create({
  safe:           { flex: 1, backgroundColor: c.bg },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn:        { paddingVertical: 4, paddingHorizontal: 20 },
  backText:       { color: COLORS.primary, fontSize: 18, fontWeight: '500' },
  headerTitle:    { color: c.text, fontSize: 16, fontWeight: '700' },
  content:        { padding: 20, gap: 16, paddingBottom: 80 },
  loadingBox:     { alignItems: 'center', paddingVertical: 40, gap: 14 },
  loadingText:    { color: c.textMuted, fontSize: 14 },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  locHeader:      { gap: 6 },
  locName:        { color: c.text, fontSize: 16, fontWeight: '600' },
  verifiedBadge:  { alignSelf: 'flex-start', backgroundColor: COLORS.primary + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14, borderWidth: 1, borderColor: COLORS.primary + '50' },
  verifiedTxt:    { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  card:           { backgroundColor: c.card, borderRadius: 16, padding: 16, gap: 14, borderWidth: 1, borderColor: c.border },
  cardTitle:      { color: c.text, fontSize: 18, fontWeight: '700' },
  statsRow:       { flexDirection: 'row', justifyContent: 'space-around' },
  stat:           { alignItems: 'center', gap: 4 },
  statNum:        { color: COLORS.primary, fontSize: 28, fontWeight: '700' },
  statLabel:      { color: c.textMuted, fontSize: 12, textAlign: 'center' },
  statDivider:    { width: 1, backgroundColor: c.border },
  muted:          { color: c.textMuted, fontSize: 14 },
  breakdown:      { gap: 10 },
  breakdownRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  breakdownLabel: { width: 68, fontSize: 12, fontWeight: '600' },
  barTrack:       { flex: 1, height: 8, backgroundColor: c.surface, borderRadius: 4, overflow: 'hidden' },
  barFill:        { height: '100%', borderRadius: 4, minWidth: 4 },
  breakdownCount: { color: c.textMuted, fontSize: 12, width: 24, textAlign: 'right' },
  reviewRow:      { gap: 4 },
  reviewBorder:   { paddingTop: 12, borderTopWidth: 1, borderTopColor: c.border },
  reviewTop:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewName:     { color: c.text, fontSize: 14, fontWeight: '600', flex: 1 },
  reviewContent:  { color: c.textSec, fontSize: 14, lineHeight: 20 },
}); }
