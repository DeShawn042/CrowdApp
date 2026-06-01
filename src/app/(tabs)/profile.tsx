import { router, useFocusEffect } from 'expo-router';
import React, { useCallback } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CrowdLevelBadge from '@/components/CrowdLevelBadge';
import WatchlistCard from '@/components/WatchlistCard';
import { COLORS } from '@/constants/crowdColors';
import { useAppContext } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useWatchlist } from '@/hooks/useWatchlist';
import { formatDate, timeAgo } from '@/utils/crowdUtils';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { myReports, getLocationById } = useAppContext();
  const { items: watchlistItems, removeFromWatchlist, renewWatchlistItem, reload: reloadWatchlist } = useWatchlist();

  useFocusEffect(useCallback(() => { reloadWatchlist(); }, [reloadWatchlist]));

  const initials = (user?.name ?? 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  function confirmLogout() {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <Pressable onPress={confirmLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>
        </View>

        {/* User card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <Text style={styles.joinDate}>Member since {user?.joinDate}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{user?.totalReports ?? 0}</Text>
            <Text style={styles.statLabel}>Total{'\n'}Reports</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>{user?.weeklyReports ?? 0}</Text>
            <Text style={styles.statLabel}>This{'\n'}Week</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>{myReports.length}</Text>
            <Text style={styles.statLabel}>In App{'\n'}Reports</Text>
          </View>
        </View>

        {/* Favorite venue */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Favorite Venue</Text>
          <View style={styles.favCard}>
            <Text style={styles.favEmoji}>⭐</Text>
            <Text style={styles.favName}>{user?.favoriteVenue}</Text>
          </View>
        </View>

        {/* Watchlist */}
        {watchlistItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👁️ Watchlist</Text>
            <View style={styles.reportList}>
              {watchlistItems.map(item => (
                <WatchlistCard
                  key={item.id}
                  item={item}
                  onPress={() => router.push(`/location/${item.placeId}`)}
                  onRemove={() => removeFromWatchlist(item.id)}
                  onRenew={() => renewWatchlistItem(item.id)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Recent reports */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Reports</Text>
          {myReports.length === 0 ? (
            <View style={styles.emptyReports}>
              <Text style={styles.emptyEmoji}>📝</Text>
              <Text style={styles.emptyText}>No reports yet. Start reporting crowd levels!</Text>
            </View>
          ) : (
            <View style={styles.reportList}>
              {myReports.map(r => {
                const loc = getLocationById(r.locationId);
                return (
                  <Pressable
                    key={r.id}
                    style={({ pressed }) => [styles.reportCard, pressed && styles.pressed]}
                    onPress={() => router.push(`/location/${r.locationId}`)}>
                    <View style={styles.reportTop}>
                      <Text style={styles.reportLocation} numberOfLines={1}>
                        {loc?.name ?? 'Unknown Location'}
                      </Text>
                      <Text style={styles.reportTime}>{timeAgo(r.timestamp)}</Text>
                    </View>
                    <CrowdLevelBadge level={r.crowdLevel} size="sm" />
                    {r.comment && (
                      <Text style={styles.reportComment} numberOfLines={2}>"{r.comment}"</Text>
                    )}
                    <Text style={styles.reportDate}>{formatDate(r.timestamp)}</Text>
                  </Pressable>
                );
              })}
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
  title: { color: COLORS.text, fontSize: 28, fontWeight: '800' },
  logoutBtn: { backgroundColor: COLORS.card, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  logoutText: { color: COLORS.packed, fontSize: 13, fontWeight: '600' },
  userCard: { backgroundColor: COLORS.card, borderRadius: 20, padding: 20, flexDirection: 'row', gap: 16, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primary + '25', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.primary + '60' },
  avatarText: { color: COLORS.primary, fontSize: 22, fontWeight: '800' },
  userInfo: { flex: 1, gap: 3 },
  userName: { color: COLORS.text, fontSize: 20, fontWeight: '700' },
  userEmail: { color: COLORS.textSec, fontSize: 13 },
  joinDate: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  statsRow: { backgroundColor: COLORS.card, borderRadius: 20, padding: 20, flexDirection: 'row', justifyContent: 'space-around', borderWidth: 1, borderColor: COLORS.border },
  stat: { alignItems: 'center', gap: 6 },
  statNum: { color: COLORS.primary, fontSize: 28, fontWeight: '800' },
  statLabel: { color: COLORS.textSec, fontSize: 12, textAlign: 'center', lineHeight: 16 },
  statDivider: { width: 1, backgroundColor: COLORS.border },
  section: { gap: 12 },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  favCard: { backgroundColor: COLORS.card, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: COLORS.border },
  favEmoji: { fontSize: 28 },
  favName: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  emptyReports: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },
  reportList: { gap: 10 },
  reportCard: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, gap: 8, borderWidth: 1, borderColor: COLORS.border },
  pressed: { opacity: 0.75 },
  reportTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reportLocation: { color: COLORS.text, fontSize: 15, fontWeight: '600', flex: 1 },
  reportTime: { color: COLORS.textMuted, fontSize: 11 },
  reportComment: { color: COLORS.textSec, fontSize: 13, fontStyle: 'italic' },
  reportDate: { color: COLORS.textMuted, fontSize: 11 },
});
