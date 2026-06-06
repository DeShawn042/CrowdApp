import { router } from 'expo-router';
import React, { useState } from 'react';
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
import { COLORS } from '@/constants/crowdColors';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useAdminStats } from '@/hooks/useAdminStats';
import type { TimeFilter } from '@/hooks/useAdminStats';
import { useAdminReviews } from '@/hooks/useAdminReviews';
import type { AppColors } from '@/constants/themes';

const TIME_FILTERS: { key: TimeFilter; label: string }[] = [
  { key: 'today', label: 'Today'      },
  { key: 'week',  label: 'This Week'  },
  { key: 'month', label: 'This Month' },
  { key: 'all',   label: 'All Time'   },
];

const LEVEL_LABELS: Record<string, string> = {
  empty: '🟢 Empty', light: '🟡 Light', moderate: '🟠 Moderate', packed: '🔴 Packed',
};
const TYPE_LABELS: Record<string, string> = {
  wait_time: '⏱️ Wait Time', vibe: '✨ Vibe', service: '⚡ Service',
  event: '🎉 Events', cover_charge: '👮 Cover', parking: '🅿️ Parking',
  cleanliness: '🧼 Clean', price: '💰 Price',
  security_line: '🔵 Security', tsa_precheck: '✅ TSA', baggage_dropoff: '🧳 Bag Drop',
};

// ── Sub-components ──────────────────────────────────────────────────────────

function SectionTitle({ title, colors }: { title: string; colors: AppColors }) {
  return <Text style={[ss.sectionTitle, { color: colors.text }]}>{title}</Text>;
}

function StatCard({ icon, label, value, sub, colors }: {
  icon: string; label: string; value: string | number; sub?: string; colors: AppColors;
}) {
  return (
    <View style={[ss.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={ss.statIcon}>{icon}</Text>
      <Text style={[ss.statValue, { color: COLORS.primary }]}>{value}</Text>
      <Text style={[ss.statLabel, { color: colors.textSec }]}>{label}</Text>
      {sub ? <Text style={[ss.statSub, { color: colors.textMuted }]}>{sub}</Text> : null}
    </View>
  );
}

function BarRow({ label, count, total, colors }: {
  label: string; count: number; total: number; colors: AppColors;
}) {
  const pct = total > 0 ? count / total : 0;
  return (
    <View style={ss.barRow}>
      <Text style={[ss.barLabel, { color: colors.textSec }]}>{label}</Text>
      <View style={[ss.barTrack, { backgroundColor: colors.surface }]}>
        <View style={[ss.barFill, { width: `${Math.round(pct * 100)}%` as any, backgroundColor: COLORS.primary }]} />
      </View>
      <Text style={[ss.barCount, { color: colors.textMuted }]}>{count}</Text>
    </View>
  );
}

function Card({ children, colors }: { children: React.ReactNode; colors: AppColors }) {
  return (
    <View style={[ss.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {children}
    </View>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [filter, setFilter] = useState<TimeFilter>('week');
  const { stats, loading, reload } = useAdminStats(filter);
  const adminReviews = useAdminReviews();

  // Guard: only admins
  if (!user?.isAdmin) {
    return (
      <SafeAreaView style={[ss.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <Pressable onPress={() => router.back()} style={ss.backBtn}>
          <Text style={ss.backText}>‹ Back</Text>
        </Pressable>
        <View style={ss.center}>
          <Text style={{ fontSize: 48 }}>🔒</Text>
          <Text style={[ss.centerTitle, { color: colors.text }]}>Admin Only</Text>
          <Text style={[ss.centerSub, { color: colors.textMuted }]}>You don't have access to this page.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalReportLevels = Object.values(stats.reportsByLevel).reduce((a, b) => a + b, 0);
  const totalQuickTypes   = Object.values(stats.quickReportsByType).reduce((a, b) => a + b, 0);

  return (
    <SafeAreaView style={[ss.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[ss.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={ss.backText}>‹ Back</Text>
        </Pressable>
        <Text style={[ss.headerTitle, { color: colors.text }]}>Admin Dashboard</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={ss.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={COLORS.primary} />}>

        {/* Time filter */}
        <View style={ss.filterRow}>
          {TIME_FILTERS.map(f => (
            <Pressable
              key={f.key}
              style={[ss.filterBtn, { backgroundColor: colors.card, borderColor: colors.border },
                filter === f.key && { backgroundColor: COLORS.primary + '20', borderColor: COLORS.primary }]}
              onPress={() => setFilter(f.key)}>
              <Text style={[ss.filterText, { color: colors.textSec },
                filter === f.key && { color: COLORS.primary, fontWeight: '700' }]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading && (
          <View style={ss.loadingBox}>
            <ActivityIndicator color={COLORS.primary} size="large" />
            <Text style={[ss.loadingText, { color: colors.textMuted }]}>Loading stats…</Text>
          </View>
        )}

        {!loading && (
          <>
            {/* ── Users ── */}
            <SectionTitle title="👤  Users" colors={colors} />
            <View style={ss.statGrid}>
              <StatCard icon="👥" label="Total Users"   value={stats.totalUsers}        colors={colors} />
              <StatCard icon="🆕" label="New This Week" value={stats.newUsersThisWeek}  colors={colors} />
              <StatCard icon="📅" label="New This Month"value={stats.newUsersThisMonth} colors={colors} />
              <StatCard icon="⚡" label="Active Users"  value={stats.activeUsers} sub="Submitted ≥1 report" colors={colors} />
            </View>

            {/* ── Crowd Reports ── */}
            <SectionTitle title="📊  Crowd Reports" colors={colors} />
            <View style={ss.statGrid}>
              <StatCard icon="📋" label="Total Reports"  value={stats.totalReports}      colors={colors} />
              <StatCard icon="🕐" label="Today"          value={stats.reportsToday}      colors={colors} />
              <StatCard icon="📆" label="This Week"      value={stats.reportsThisWeek}   colors={colors} />
              <StatCard icon="🗓️" label="This Month"     value={stats.reportsThisMonth}  colors={colors} />
            </View>

            {totalReportLevels > 0 && (
              <Card colors={colors}>
                <Text style={[ss.cardTitle, { color: colors.text }]}>Reports by Crowd Level</Text>
                {Object.entries(stats.reportsByLevel)
                  .sort((a, b) => b[1] - a[1])
                  .map(([level, count]) => (
                    <BarRow
                      key={level}
                      label={LEVEL_LABELS[level] ?? level}
                      count={count}
                      total={totalReportLevels}
                      colors={colors}
                    />
                  ))}
              </Card>
            )}

            {stats.topReportedLocations.length > 0 && (
              <Card colors={colors}>
                <Text style={[ss.cardTitle, { color: colors.text }]}>Most Reported Locations</Text>
                {stats.topReportedLocations.map((loc, i) => (
                  <View key={loc.place_id} style={[ss.listRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                    <Text style={[ss.listRank, { color: colors.textMuted }]}>#{i + 1}</Text>
                    <Text style={[ss.listName, { color: colors.textSec, flex: 1 }]} numberOfLines={1}>
                      {loc.name.length > 20 ? loc.place_id : loc.name}
                    </Text>
                    <Text style={[ss.listCount, { color: COLORS.primary }]}>{loc.count} reports</Text>
                  </View>
                ))}
              </Card>
            )}

            {/* ── Quick Reports ── */}
            <SectionTitle title="⚡  Quick Reports" colors={colors} />
            <View style={ss.statGrid}>
              <StatCard icon="📌" label="Total Quick Reports" value={stats.totalQuickReports} colors={colors} />
              <StatCard icon="🗂️" label="Types Reported" value={Object.keys(stats.quickReportsByType).length} colors={colors} />
            </View>

            {totalQuickTypes > 0 && (
              <Card colors={colors}>
                <Text style={[ss.cardTitle, { color: colors.text }]}>Quick Reports by Type</Text>
                {Object.entries(stats.quickReportsByType)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => (
                    <BarRow
                      key={type}
                      label={TYPE_LABELS[type] ?? type}
                      count={count}
                      total={totalQuickTypes}
                      colors={colors}
                    />
                  ))}
              </Card>
            )}

            {/* ── Engagement ── */}
            <SectionTitle title="💬  Engagement" colors={colors} />
            <View style={ss.statGrid}>
              <StatCard icon="⭐" label="Reviews"       value={stats.totalReviews}      colors={colors} />
              <StatCard icon="❤️" label="Favorites"      value={stats.totalFavorites}    colors={colors} />
              <StatCard icon="👁️" label="Watchlist"      value={stats.totalWatchlist}    colors={colors} />
              <StatCard icon="🚗" label="Heading There"  value={stats.totalHeadingThere} colors={colors} />
            </View>

            {/* ── Review Moderation ── */}
            <SectionTitle title="🚩  Review Moderation" colors={colors} />

            {/* Filter row */}
            <View style={ss.filterRow}>
              {(['flagged', 'newest'] as const).map(f => (
                <Pressable
                  key={f}
                  style={[ss.filterBtn, { backgroundColor: colors.card, borderColor: colors.border },
                    adminReviews.filter === f && { backgroundColor: COLORS.primary + '20', borderColor: COLORS.primary }]}
                  onPress={() => adminReviews.setFilter(f)}>
                  <Text style={[ss.filterText, { color: colors.textSec },
                    adminReviews.filter === f && { color: COLORS.primary, fontWeight: '700' }]}>
                    {f === 'flagged' ? '🚩 Most Flagged' : '🆕 Newest'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {adminReviews.loading ? (
              <View style={ss.loadingBox}>
                <ActivityIndicator color={COLORS.primary} />
              </View>
            ) : adminReviews.reviews.length === 0 ? (
              <View style={[ss.card, { backgroundColor: colors.card, borderColor: colors.border, alignItems: 'center', paddingVertical: 24 }]}>
                <Text style={{ fontSize: 32 }}>✅</Text>
                <Text style={[ss.cardTitle, { color: colors.textMuted, marginTop: 8 }]}>No reviews to moderate</Text>
              </View>
            ) : (
              adminReviews.reviews.map((r, i) => (
                <View key={r.id} style={[ss.card, { backgroundColor: colors.card, borderColor: r.isHidden ? COLORS.packed + '60' : colors.border }]}>
                  {/* Review header */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[ss.cardTitle, { color: colors.text, fontSize: 14 }]}>
                        {r.displayName ?? r.userName ?? 'Unknown'}
                        {r.isHidden && <Text style={{ color: COLORS.packed }}> · Hidden</Text>}
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                        {r.locationId} · {new Date(r.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    {r.flagCount > 0 && (
                      <View style={ss.flagBadge}>
                        <Text style={ss.flagBadgeText}>🚩 {r.flagCount}</Text>
                      </View>
                    )}
                    {'⭐'.repeat(r.rating)}
                  </View>

                  {/* Content */}
                  <Text style={{ color: colors.textSec, fontSize: 13, lineHeight: 18 }} numberOfLines={3}>
                    {r.content}
                  </Text>

                  {/* Actions */}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {r.isHidden && (
                      <Pressable
                        style={[ss.modBtn, { borderColor: COLORS.empty, backgroundColor: COLORS.empty + '15' }]}
                        onPress={() => adminReviews.restoreReview(r.id)}>
                        <Text style={[ss.modBtnText, { color: COLORS.empty }]}>✓ Restore</Text>
                      </Pressable>
                    )}
                    <Pressable
                      style={[ss.modBtn, { borderColor: COLORS.packed, backgroundColor: COLORS.packed + '15' }]}
                      onPress={() => adminReviews.deleteReview(r.id)}>
                      <Text style={[ss.modBtnText, { color: COLORS.packed }]}>🗑 Delete</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const ss = StyleSheet.create({
  safe:        { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn:     { paddingVertical: 4, paddingHorizontal: 20 },
  backText:    { color: COLORS.primary, fontSize: 18, fontWeight: '500' },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  centerTitle: { fontSize: 20, fontWeight: '700' },
  centerSub:   { fontSize: 14, textAlign: 'center' },
  content:     { padding: 16, gap: 14, paddingBottom: 80 },

  filterRow:   { flexDirection: 'row', gap: 8 },
  filterBtn:   { flex: 1, paddingVertical: 8, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  filterText:  { fontSize: 12, fontWeight: '600' },

  loadingBox:  { alignItems: 'center', paddingVertical: 60, gap: 14 },
  loadingText: { fontSize: 14 },

  sectionTitle:{ fontSize: 18, fontWeight: '700', marginTop: 8 },

  statGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard:    { width: '47%', borderRadius: 16, padding: 14, gap: 4, borderWidth: 1, alignItems: 'center' },
  statIcon:    { fontSize: 22 },
  statValue:   { fontSize: 28, fontWeight: '800' },
  statLabel:   { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  statSub:     { fontSize: 10, textAlign: 'center' },

  card:        { borderRadius: 16, padding: 16, gap: 10, borderWidth: 1 },
  cardTitle:   { fontSize: 16, fontWeight: '700', marginBottom: 2 },

  barRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel:    { fontSize: 12, width: 120 },
  barTrack:    { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill:     { height: '100%', borderRadius: 4, minWidth: 4 },
  barCount:    { fontSize: 12, width: 36, textAlign: 'right' },

  listRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  listRank:    { fontSize: 13, fontWeight: '700', width: 24 },
  listName:    { fontSize: 13 },
  listCount:   { fontSize: 12, fontWeight: '600' },

  flagBadge:     { backgroundColor: COLORS.packed + '20', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: COLORS.packed + '50' },
  flagBadgeText: { color: COLORS.packed, fontSize: 12, fontWeight: '700' },
  modBtn:        { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  modBtnText:    { fontSize: 13, fontWeight: '700' },
});
