import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
// Platform still used for device info in openContactSupport
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import CrowdLevelBadge from '@/components/CrowdLevelBadge';
import ConfirmModal from '@/components/ConfirmModal';
import LocationPhoto from '@/components/LocationPhoto';
import StarRating from '@/components/StarRating';
import Toast from '@/components/Toast';
import WatchlistCard from '@/components/WatchlistCard';
import { usePlacesPhoto } from '@/hooks/usePlacesPhoto';
import type { Location } from '@/data/mockData';
import { COLORS } from '@/constants/crowdColors';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/themes';
import type { ThemePreference } from '@/constants/themes';
import { useAppContext } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useMyReviews, type MyReview } from '@/hooks/useMyReviews';
import { useImpactStats, type ImpactStats } from '@/hooks/useImpactStats';
import { useMapOpener } from '@/hooks/useMapOpener';
import { formatDate } from '@/utils/crowdUtils';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
const SUPPORT_EMAIL = 'support@rookstechnologies.com';
const TERMS_URL = 'https://rookstechnologies.com/terms';
const PRIVACY_URL = 'https://rookstechnologies.com/privacy';

export default function ProfileScreen() {
  const { colors, preference, setPreference } = useTheme();
  const styles = makeStyles(colors);
  const { user, logout, deleteAccount } = useAuth();
  const { getLocationById, savedLocationIds, toggleSaved } = useAppContext();
  const { items: watchlistItems, removeFromWatchlist, renewWatchlistItem, reload: reloadWatchlist } = useWatchlist();
  const { reviews: myReviews, deleteMyReview, refresh: reloadMyReviews } = useMyReviews();
  const { stats, refresh: reloadStats } = useImpactStats();

  const mapOpener = useMapOpener();
  const [mapDropdownOpen, setMapDropdownOpen] = useState(false);

  const [modal, setModal] = useState<'logout' | 'delete' | null>(null);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);
  const [removingFav, setRemovingFav] = useState<{ id: string; name: string } | null>(null);
  const [toast, setToast] = useState('');
  const [showToast, setShowToast] = useState(false);

  useFocusEffect(useCallback(() => {
    reloadWatchlist();
    reloadMyReviews();
    reloadStats();
  }, [reloadWatchlist, reloadMyReviews, reloadStats]));

  const initials = (user?.name ?? 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  async function openContactSupport() {
    const deviceInfo = `${Platform.OS} ${Platform.Version}`;
    const body = `App Version: Prescout v${APP_VERSION}\nDevice: ${deviceInfo}\n\nDescribe your issue here:`;
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Prescout Support Request')}&body=${encodeURIComponent(body)}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        throw new Error('Mail not supported');
      }
    } catch {
      await Clipboard.setStringAsync(SUPPORT_EMAIL);
      setToast(`Email copied to clipboard: ${SUPPORT_EMAIL}`);
      setShowToast(true);
    }
  }

  const savedLocations = savedLocationIds
    .map(id => getLocationById(id))
    .filter(Boolean) as NonNullable<ReturnType<typeof getLocationById>>[];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <Pressable onPress={() => setModal('logout')} style={styles.logoutBtn}>
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

        {/* Your Impact */}
        <View style={styles.impactCard}>
          <Text style={styles.impactTitle}>📊 Your Contributions</Text>
          <View style={styles.impactGrid}>
            {IMPACT_TILES.map(tile => (
              <View key={tile.key} style={styles.impactTile}>
                <Text style={styles.impactIcon}>{tile.icon}</Text>
                <Text style={styles.impactNum}>{stats[tile.key]}</Text>
                <Text style={styles.impactLabel}>{tile.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Favorites */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>❤️ Favorites</Text>
          {savedLocations.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>🤍</Text>
              <Text style={styles.emptyText}>No favorites yet. Tap ❤️ on any location to save it.</Text>
            </View>
          ) : (
            <View style={styles.reportList}>
              {savedLocations.map(loc => (
                <FavLocationCard
                  key={loc.id}
                  loc={loc}
                  styles={styles}
                  onRemove={() => setRemovingFav({ id: loc.id, name: loc.name })}
                />
              ))}
            </View>
          )}
        </View>

        {/* Appearance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.themeRow}>
            {THEME_OPTIONS.map(o => (
              <Pressable
                key={o.key}
                style={({ pressed }) => [styles.themeBtn, preference === o.key && styles.themeBtnActive, pressed && { opacity: 0.75 }]}
                onPress={() => setPreference(o.key)}>
                <Text style={styles.themeIcon}>{o.icon}</Text>
                <Text style={[styles.themeLabel, preference === o.key && styles.themeLabelActive]}>{o.label}</Text>
                {preference === o.key && <Text style={styles.themeCheck}>✓</Text>}
              </Pressable>
            ))}
          </View>

          {/* Default Maps App */}
          {mapOpener.installedApps.length > 1 && (
            <View style={styles.mapPrefCard}>
              <Pressable
                style={({ pressed }) => [styles.mapPrefRow, pressed && { opacity: 0.75 }]}
                onPress={() => setMapDropdownOpen(v => !v)}>
                <Text style={styles.mapPrefIcon}>🗺️</Text>
                <View style={styles.mapPrefLabelCol}>
                  <Text style={[styles.mapPrefLabel, { color: colors.text }]}>Default Maps App</Text>
                  <Text style={[styles.mapPrefValue, { color: COLORS.primary }]}>
                    {mapOpener.defaultApp ?? 'Ask every time'}
                  </Text>
                </View>
                <Text style={[styles.mapPrefChevron, { color: colors.textMuted }, mapDropdownOpen && styles.mapPrefChevronOpen]}>›</Text>
              </Pressable>

              {mapDropdownOpen && (
                <View style={[styles.mapDropdown, { borderTopColor: colors.border }]}>
                  {mapOpener.installedApps.map((app, i) => {
                    const isSelected = mapOpener.defaultApp === app.label;
                    return (
                      <React.Fragment key={app.label}>
                        {i > 0 && <View style={[styles.mapDropdownDivider, { backgroundColor: colors.border }]} />}
                        <Pressable
                          style={({ pressed }) => [styles.mapDropdownItem, pressed && { opacity: 0.7 }]}
                          onPress={async () => {
                            await mapOpener.setDefaultDirect(app.label);
                            setMapDropdownOpen(false);
                          }}>
                          <Text style={styles.mapDropdownIcon}>{app.icon}</Text>
                          <Text style={[styles.mapDropdownLabel, { color: colors.text }]}>{app.label}</Text>
                          {isSelected && <Text style={[styles.mapDropdownCheck, { color: COLORS.primary }]}>✓</Text>}
                        </Pressable>
                      </React.Fragment>
                    );
                  })}
                  <View style={[styles.mapDropdownDivider, { backgroundColor: colors.border }]} />
                  <Pressable
                    style={({ pressed }) => [styles.mapDropdownItem, pressed && { opacity: 0.7 }]}
                    onPress={async () => {
                      await mapOpener.clearDefault();
                      setMapDropdownOpen(false);
                    }}>
                    <Text style={styles.mapDropdownIcon}>❓</Text>
                    <Text style={[styles.mapDropdownLabel, { color: colors.textSec }]}>Ask every time</Text>
                    {!mapOpener.defaultApp && <Text style={[styles.mapDropdownCheck, { color: COLORS.primary }]}>✓</Text>}
                  </Pressable>
                </View>
              )}
            </View>
          )}
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

        {/* My Reviews */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Reviews</Text>
          {myReviews.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>⭐</Text>
              <Text style={styles.emptyText}>You haven't written any reviews yet.</Text>
            </View>
          ) : (
            <View style={styles.reportList}>
              {myReviews.map(r => (
                <MyReviewCard
                  key={r.id}
                  review={r}
                  loc={getLocationById(r.locationId)}
                  styles={styles}
                  onDelete={() => setDeletingReviewId(r.id)}
                />
              ))}
            </View>
          )}
        </View>

        {/* Support & Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support & Legal</Text>
          <View style={styles.linkList}>
            <Pressable
              style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.7 }]}
              onPress={openContactSupport}>
              <Text style={styles.linkIcon}>✉️</Text>
              <Text style={styles.linkText}>Contact Support</Text>
              <Text style={styles.linkChevron}>›</Text>
            </Pressable>
            <View style={styles.linkDivider} />
            <Pressable
              style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.7 }]}
              onPress={() => Linking.openURL(TERMS_URL)}>
              <Text style={styles.linkIcon}>📄</Text>
              <Text style={styles.linkText}>Terms of Service</Text>
              <Text style={styles.linkChevron}>›</Text>
            </Pressable>
            <View style={styles.linkDivider} />
            <Pressable
              style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.7 }]}
              onPress={() => Linking.openURL(PRIVACY_URL)}>
              <Text style={styles.linkIcon}>🔒</Text>
              <Text style={styles.linkText}>Privacy Policy</Text>
              <Text style={styles.linkChevron}>›</Text>
            </Pressable>
          </View>
        </View>

        {/* Delete Account */}
        <Pressable
          style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.7 }]}
          onPress={() => setModal('delete')}>
          <Text style={styles.deleteBtnText}>Delete Account</Text>
        </Pressable>

        {/* Version — long press to open admin if is_admin */}
        <Pressable
          onLongPress={() => { if (user?.isAdmin) router.push('/admin'); }}
          delayLongPress={800}
          style={styles.versionRow}>
          <Text style={styles.versionText}>Prescout v{APP_VERSION}</Text>
        </Pressable>

      </ScrollView>

      {/* Logout confirmation */}
      <ConfirmModal
        visible={modal === 'logout'}
        title="Log out"
        message="Are you sure you want to log out?"
        onClose={() => setModal(null)}
        actions={[
          { label: 'Log out', destructive: true, onPress: logout },
          { label: 'Cancel', cancel: true, onPress: () => {} },
        ]}
      />

      {/* Delete account confirmation */}
      <ConfirmModal
        visible={modal === 'delete'}
        title="Delete Account"
        message="Are you sure? This will permanently delete your account and all your data including reports, reviews, and favorites. This cannot be undone."
        onClose={() => setModal(null)}
        actions={[
          {
            label: 'Delete Account',
            destructive: true,
            onPress: async () => {
              await deleteAccount();
              router.replace('/onboarding');
            },
          },
          { label: 'Cancel', cancel: true, onPress: () => {} },
        ]}
      />

      {/* Delete review confirmation */}
      <ConfirmModal
        visible={!!deletingReviewId}
        title="Delete this review?"
        message="This cannot be undone."
        onClose={() => setDeletingReviewId(null)}
        actions={[
          {
            label: 'Delete',
            destructive: true,
            onPress: async () => {
              if (deletingReviewId) await deleteMyReview(deletingReviewId);
              setDeletingReviewId(null);
            },
          },
          { label: 'Cancel', cancel: true, onPress: () => {} },
        ]}
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

      <Toast
        message={toast}
        visible={showToast}
        onHide={() => setShowToast(false)}
      />
    </SafeAreaView>
  );
}

// ── Sub-components (each needs its own hook call) ─────────────────────────

function FavLocationCard({ loc, styles, onRemove }: { loc: Location; styles: ReturnType<typeof makeStyles>; onRemove: () => void }) {
  const photoUrl = usePlacesPhoto(loc);
  return (
    <Pressable
      style={({ pressed }) => [styles.favLocCard, pressed && styles.pressed]}
      onPress={() => router.push(`/location/${loc.id}`)}>
      <LocationPhoto type={loc.type} photoUrl={photoUrl} size={48} borderRadius={12} name={loc.name} />
      <View style={styles.favLocInfo}>
        <Text style={styles.favLocName} numberOfLines={1}>{loc.name}</Text>
        {loc.currentCrowd && <CrowdLevelBadge level={loc.currentCrowd} size="sm" />}
        <Text style={styles.favLocRating}>⭐ {loc.rating}</Text>
      </View>
      <Pressable style={styles.favRemoveBtn} onPress={onRemove} hitSlop={8}>
        <Text style={styles.favRemoveTxt}>✕</Text>
      </Pressable>
    </Pressable>
  );
}

function MyReviewCard({
  review, loc, styles, onDelete,
}: {
  review: MyReview;
  loc: Location | undefined;
  styles: ReturnType<typeof makeStyles>;
  onDelete: () => void;
}) {
  const photoUrl = usePlacesPhoto(loc);
  return (
    <Pressable
      style={({ pressed }) => [styles.reviewCard, pressed && styles.pressed]}
      onPress={() => router.push(`/location/${review.locationId}`)}>
      <View style={styles.reviewCardTop}>
        <LocationPhoto
          type={loc?.type ?? 'other'}
          photoUrl={photoUrl}
          size={44}
          borderRadius={10}
          name={loc?.name ?? review.locationId}
        />
        <View style={styles.reviewCardMeta}>
          <Text style={styles.reviewLocName} numberOfLines={1}>
            {loc?.name ?? 'Unknown Location'}
          </Text>
          <StarRating rating={review.rating} size={13} />
          <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
        </View>
      </View>
      {review.content ? (
        <Text style={styles.reviewPreview} numberOfLines={2}>"{review.content}"</Text>
      ) : null}
      <View style={styles.reviewActions}>
        <Pressable
          style={styles.reviewEditBtn}
          onPress={(e) => { e.stopPropagation?.(); router.push(`/location/${review.locationId}`); }}>
          <Text style={styles.reviewEditTxt}>✏️ Edit</Text>
        </Pressable>
        <Pressable
          style={styles.reviewDeleteBtn}
          onPress={(e) => { e.stopPropagation?.(); onDelete(); }}>
          <Text style={styles.reviewDeleteTxt}>🗑 Delete</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

// ──────────────────────────────────────────────────────────────────────────

const IMPACT_TILES: { key: keyof ImpactStats; icon: string; label: string }[] = [
  { key: 'crowdReports',     icon: '👥', label: 'Crowd\nReports' },
  { key: 'quickReports',     icon: '⚡', label: 'Quick\nReports' },
  { key: 'reviews',          icon: '⭐', label: 'Reviews' },
  { key: 'watchlistUsed',    icon: '👁️', label: 'Watchlist\nUsed' },
  { key: 'headingThereUsed', icon: '🚗', label: 'Heading\nThere' },
];

const THEME_OPTIONS: { key: ThemePreference; icon: string; label: string }[] = [
  { key: 'dark',   icon: '🌙', label: 'Dark'   },
  { key: 'light',  icon: '☀️', label: 'Light'  },
  { key: 'system', icon: '📱', label: 'System' },
];

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    safe:             { flex: 1, backgroundColor: c.bg },
    scroll:           { flex: 1 },
    content:          { padding: 20, gap: 20, paddingBottom: 80 },
    header:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title:            { color: c.text, fontSize: 24, fontWeight: '700' },
    logoutBtn:        { backgroundColor: c.card, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: c.border },
    logoutText:       { color: COLORS.packed, fontSize: 12, fontWeight: '600' },
    userCard:         { backgroundColor: c.card, borderRadius: 16, padding: 16, flexDirection: 'row', gap: 16, alignItems: 'center', borderWidth: 1, borderColor: c.border },
    avatar:           { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primary + '25', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.primary + '60' },
    avatarText:       { color: COLORS.primary, fontSize: 22, fontWeight: '800' },
    userInfo:         { flex: 1, gap: 3 },
    userName:         { color: c.text, fontSize: 16, fontWeight: '600' },
    userEmail:        { color: c.textSec, fontSize: 12 },
    joinDate:         { color: c.textMuted, fontSize: 12, marginTop: 4 },
    // Impact card
    impactCard:       { backgroundColor: c.card, borderRadius: 16, padding: 16, gap: 14, borderWidth: 1, borderColor: c.border },
    impactTitle:      { color: c.text, fontSize: 16, fontWeight: '700' },
    impactGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    impactTile:       { flex: 1, minWidth: '28%', backgroundColor: c.surface, borderRadius: 14, padding: 12, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: c.border },
    impactIcon:       { fontSize: 22 },
    impactNum:        { color: COLORS.primary, fontSize: 22, fontWeight: '700' },
    impactLabel:      { color: c.textSec, fontSize: 11, textAlign: 'center', lineHeight: 14 },
    section:          { gap: 14 },
    sectionTitle:     { color: c.text, fontSize: 18, fontWeight: '700' },
    emptyCard:        { backgroundColor: c.card, borderRadius: 16, padding: 20, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: c.border },
    emptyEmoji:       { fontSize: 32 },
    emptyText:        { color: c.textMuted, fontSize: 14, textAlign: 'center' },
    reportList:       { gap: 10 },
    pressed:          { opacity: 0.75 },
    themeRow:         { flexDirection: 'row', gap: 10 },
    themeBtn:         { flex: 1, alignItems: 'center', gap: 6, backgroundColor: c.card, borderRadius: 16, paddingVertical: 14, borderWidth: 1, borderColor: c.border },
    themeBtnActive:   { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '15' },
    themeIcon:        { fontSize: 20 },
    themeLabel:       { color: c.textSec, fontSize: 12, fontWeight: '600' },
    themeLabelActive: { color: COLORS.primary },
    themeCheck:       { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
    mapPrefCard:      { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
    mapPrefRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
    mapPrefIcon:      { fontSize: 20 },
    mapPrefLabelCol:  { flex: 1, gap: 2 },
    mapPrefLabel:     { fontSize: 14, fontWeight: '600' },
    mapPrefValue:     { fontSize: 12, fontWeight: '500' },
    mapPrefChevron:   { fontSize: 20, fontWeight: '500', transform: [{ rotate: '90deg' }] },
    mapPrefChevronOpen: { transform: [{ rotate: '-90deg' }] },
    mapDropdown:      { borderTopWidth: 1 },
    mapDropdownItem:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
    mapDropdownDivider: { height: 1, marginLeft: 48 },
    mapDropdownIcon:  { fontSize: 18, width: 24, textAlign: 'center' },
    mapDropdownLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
    mapDropdownCheck: { fontSize: 16, fontWeight: '700' },
    linkList:         { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
    linkRow:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
    linkIcon:         { fontSize: 18 },
    linkText:         { flex: 1, color: c.text, fontSize: 15, fontWeight: '500' },
    linkChevron:      { color: c.textMuted, fontSize: 20 },
    linkDivider:      { height: 1, backgroundColor: c.border, marginLeft: 48 },
    deleteBtn:        { borderRadius: 16, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.packed + '60', backgroundColor: COLORS.packed + '10' },
    deleteBtnText:    { color: COLORS.packed, fontSize: 15, fontWeight: '600' },
    versionRow:       { alignItems: 'center', paddingVertical: 8 },
    versionText:      { color: c.textMuted, fontSize: 12 },
    // Favorites
    favLocCard:       { backgroundColor: c.card, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: c.border },
    favLocInfo:       { flex: 1, gap: 4 },
    favRemoveBtn:     { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
    favRemoveTxt:     { color: '#fff', fontSize: 10, fontWeight: '700', lineHeight: 12 },
    favLocName:       { color: c.text, fontSize: 15, fontWeight: '600' },
    favLocRating:     { color: c.textSec, fontSize: 12 },
    // My Reviews
    reviewCard:       { backgroundColor: c.card, borderRadius: 16, padding: 14, gap: 10, borderWidth: 1, borderColor: c.border },
    reviewCardTop:    { flexDirection: 'row', gap: 10, alignItems: 'center' },
    reviewCardMeta:   { flex: 1, gap: 3 },
    reviewLocName:    { color: c.text, fontSize: 15, fontWeight: '600' },
    reviewDate:       { color: c.textMuted, fontSize: 12 },
    reviewPreview:    { color: c.textSec, fontSize: 13, fontStyle: 'italic' },
    reviewActions:    { flexDirection: 'row', gap: 8 },
    reviewEditBtn:    { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.primary + '50', backgroundColor: COLORS.primary + '12' },
    reviewEditTxt:    { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
    reviewDeleteBtn:  { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#EF444430', backgroundColor: '#EF444410' },
    reviewDeleteTxt:  { color: '#EF4444', fontSize: 12, fontWeight: '600' },
  });
}
