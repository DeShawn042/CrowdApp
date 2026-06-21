import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/crowdColors';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/themes';
import type { WatchlistItem } from '@/hooks/useWatchlist';
import type { CrowdLevel, LocationType } from '@/data/mockData';
import { CROWD_COLORS, CROWD_LABELS } from '@/utils/crowdUtils';
import LocationPhoto from '@/components/LocationPhoto';
import ConfirmModal from '@/components/ConfirmModal';

interface Props {
  item: WatchlistItem;
  currentCrowd: CrowdLevel | null;
  locationType?: LocationType;
  isOpen?: boolean;
  onPress: () => void;
  onRemove: (id: string) => void;
}

function timeRemaining(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'Expiring…';
  const hrs  = Math.floor(ms / (1000 * 60 * 60));
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hrs === 0) return `${mins}m left`;
  return `${hrs}h left`;
}

export default function WatchlistHomeCard({ item, currentCrowd, locationType, isOpen = true, onPress, onRemove }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [confirming, setConfirming] = useState(false);

  const crowdColor = isOpen ? (currentCrowd ? CROWD_COLORS[currentCrowd] : colors.border) : colors.border;
  const crowdLabel = isOpen ? (currentCrowd ? CROWD_LABELS[currentCrowd] : 'No data') : 'Closed';

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        onPress={onPress}>

        {/* ✕ remove button */}
        <Pressable
          style={styles.removeBtn}
          onPress={e => { e.stopPropagation?.(); setConfirming(true); }}
          hitSlop={8}>
          <Text style={styles.removeTxt}>✕</Text>
        </Pressable>

        <LocationPhoto
          type={locationType ?? 'other'}
          photoUrl={item.placeImage}
          size={48}
          borderRadius={12}
          name={item.placeName}
        />

        <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
          {item.placeName}
        </Text>

        {/* Current crowd level */}
        <View style={[styles.crowdPill, { backgroundColor: crowdColor + '20', borderColor: crowdColor + '60' }]}>
          <View style={[styles.dot, { backgroundColor: crowdColor }]} />
          <Text style={[styles.crowdText, { color: crowdColor }]}>{crowdLabel}</Text>
        </View>

        {/* Alert threshold */}
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          Alerting when: {CROWD_LABELS[item.alertLevel]}
        </Text>

        {/* Expiry */}
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          {timeRemaining(item.expiresAt)}
        </Text>
      </Pressable>

      {/* Confirmation modal */}
      <ConfirmModal
        visible={confirming}
        title="Stop Watching?"
        message={`Stop watching ${item.placeName}?`}
        onClose={() => setConfirming(false)}
        actions={[
          { label: 'Stop Watching', destructive: true, onPress: () => onRemove(item.id) },
          { label: 'Cancel', cancel: true, onPress: () => {} },
        ]}
      />
    </>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    card:      { backgroundColor: c.card, borderRadius: 16, padding: 14, width: 160, gap: 7, borderWidth: 1, borderColor: c.border },
    pressed:   { opacity: 0.75, transform: [{ scale: 0.98 }] },
    removeBtn: { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', zIndex: 1 },
    removeTxt: { color: '#fff', fontSize: 9, fontWeight: '800', lineHeight: 11 },
    name:      { fontSize: 14, fontWeight: '600', lineHeight: 20, paddingRight: 18 },
    crowdPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 14, paddingHorizontal: 6, paddingVertical: 3, alignSelf: 'flex-start' },
    dot:       { width: 5, height: 5, borderRadius: 3 },
    crowdText: { fontSize: 12, fontWeight: '600' },
    meta:      { fontSize: 11 },
  });
}
