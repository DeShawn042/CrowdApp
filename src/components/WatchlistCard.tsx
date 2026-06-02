import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/crowdColors';
import type { WatchlistItem } from '@/hooks/useWatchlist';

const LEVEL_EMOJI: Record<string, string> = {
  empty: '🟢', light: '🟡', moderate: '🟠', packed: '🔴',
};
const LEVEL_LABEL: Record<string, string> = {
  empty: 'Empty', light: 'Light', moderate: 'Moderate', packed: 'Packed',
};

function hoursRemaining(expiresAt: string): string {
  const ms   = new Date(expiresAt).getTime() - Date.now();
  const hrs  = Math.floor(ms / (60 * 60 * 1000));
  const mins = Math.floor((ms % (60 * 60 * 1000)) / 60_000);
  if (hrs <= 0 && mins <= 0) return 'Expiring…';
  if (hrs === 0) return `${mins}m remaining`;
  return `${hrs}h ${mins}m remaining`;
}

function isExpiringSoon(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() - Date.now() < 2 * 60 * 60 * 1000;
}

interface Props {
  item: WatchlistItem;
  onPress: () => void;
  onRemove: () => void;
  onRenew: () => void;
}

export default function WatchlistCard({ item, onPress, onRemove, onRenew }: Props) {
  const expiringSoon = isExpiringSoon(item.expiresAt);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}>
      {item.placeImage ? (
        <Image source={{ uri: item.placeImage }} style={styles.image} />
      ) : (
        <View style={styles.imageFallback}>
          <Text style={styles.imageFallbackText}>
            {item.placeName.trim()[0]?.toUpperCase() ?? '?'}
          </Text>
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.placeName}</Text>
        <View style={styles.alertRow}>
          <Text style={styles.alertEmoji}>{LEVEL_EMOJI[item.alertLevel]}</Text>
          <Text style={styles.alertText}>Notify at {LEVEL_LABEL[item.alertLevel]}</Text>
        </View>
        <Text style={[styles.expiry, expiringSoon && styles.expirySoon]}>
          {expiringSoon ? '⚠️ ' : ''}{hoursRemaining(item.expiresAt)}
        </Text>
      </View>

      <View style={styles.actions}>
        {expiringSoon && (
          <Pressable onPress={onRenew} style={styles.renewBtn} hitSlop={8}>
            <Text style={styles.renewText}>Renew</Text>
          </Pressable>
        )}
        <Pressable onPress={onRemove} hitSlop={10}>
          <Text style={styles.removeText}>✕</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card:              { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: COLORS.border },
  cardPressed:       { opacity: 0.75, transform: [{ scale: 0.98 }] },
  image:             { width: 48, height: 48, borderRadius: 12, backgroundColor: COLORS.surface },
  imageFallback:     { width: 48, height: 48, borderRadius: 12, backgroundColor: COLORS.primary + '25', alignItems: 'center', justifyContent: 'center' },
  imageFallbackText: { fontSize: 20, color: COLORS.primary, fontWeight: '700' },
  info:              { flex: 1, gap: 3 },
  name:              { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  alertRow:          { flexDirection: 'row', alignItems: 'center', gap: 5 },
  alertEmoji:        { fontSize: 13 },
  alertText:         { color: COLORS.textSec, fontSize: 12 },
  expiry:            { color: COLORS.textMuted, fontSize: 12 },
  expirySoon:        { color: COLORS.moderate },
  actions:           { alignItems: 'center', gap: 8 },
  renewBtn:          { backgroundColor: COLORS.primary + '20', borderRadius: 14, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: COLORS.primary + '50' },
  renewText:         { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  removeText:        { color: COLORS.textMuted, fontSize: 18, fontWeight: '600' },
});
