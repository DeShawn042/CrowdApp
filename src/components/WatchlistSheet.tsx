import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/crowdColors';
import type { AlertLevel } from '@/hooks/useWatchlist';

const LEVELS: { level: AlertLevel; emoji: string; label: string; desc: string }[] = [
  { level: 'empty',    emoji: '🟢', label: 'Empty',    desc: 'Notify when nearly empty' },
  { level: 'light',    emoji: '🟡', label: 'Light',    desc: 'Notify when lightly busy' },
  { level: 'moderate', emoji: '🟠', label: 'Moderate', desc: 'Notify when moderately busy' },
  { level: 'packed',   emoji: '🔴', label: 'Packed',   desc: 'Notify when packed' },
];

interface Props {
  visible: boolean;
  placeName: string;
  currentWatchLevel?: AlertLevel; // if already watching
  onClose: () => void;
  onSelect: (level: AlertLevel) => Promise<void>;
  onRemove?: () => Promise<void>;
}

export default function WatchlistSheet({
  visible, placeName, currentWatchLevel, onClose, onSelect, onRemove,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [confirmed,  setConfirmed]  = useState<AlertLevel | null>(null);

  async function handleSelect(level: AlertLevel) {
    setSubmitting(true);
    await onSelect(level);
    setSubmitting(false);
    setConfirmed(level);
    setTimeout(() => { setConfirmed(null); onClose(); }, 1200);
  }

  async function handleRemove() {
    if (!onRemove) return;
    setSubmitting(true);
    await onRemove();
    setSubmitting(false);
    onClose();
  }

  function handleClose() {
    setConfirmed(null);
    onClose();
  }

  const LABEL: Record<AlertLevel, string> = {
    empty: 'Empty', light: 'Light', moderate: 'Moderate', packed: 'Packed',
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.titleRow}>
            <Text style={styles.titleIcon}>👁️</Text>
            <Text style={styles.title}>Watch {placeName}</Text>
          </View>
          <Text style={styles.subtitle}>Get notified when the crowd reaches your selected level</Text>

          {confirmed ? (
            <View style={styles.confirmBox}>
              <Text style={styles.confirmText}>
                ✓  We'll notify you when {placeName} reaches {LABEL[confirmed]}
              </Text>
            </View>
          ) : submitting ? (
            <View style={styles.confirmBox}>
              <ActivityIndicator color={COLORS.primary} />
            </View>
          ) : (
            <>
              {LEVELS.map(({ level, emoji, label, desc }) => (
                <Pressable
                  key={level}
                  style={({ pressed }) => [
                    styles.option,
                    currentWatchLevel === level && styles.optionSelected,
                    pressed && styles.optionPressed,
                  ]}
                  onPress={() => handleSelect(level)}>
                  <Text style={styles.optionEmoji}>{emoji}</Text>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionLabel, currentWatchLevel === level && styles.optionLabelSelected]}>
                      {label}
                    </Text>
                    <Text style={styles.optionDesc}>{desc}</Text>
                  </View>
                  {currentWatchLevel === level && <Text style={styles.check}>✓</Text>}
                </Pressable>
              ))}

              {currentWatchLevel && onRemove && (
                <Pressable
                  style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.7 }]}
                  onPress={handleRemove}>
                  <Text style={styles.removeBtnText}>Remove from Watchlist</Text>
                </Pressable>
              )}
            </>
          )}

          <Pressable style={({ pressed }) => [styles.cancel, pressed && { opacity: 0.6 }]} onPress={handleClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop:            { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet:               { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12, gap: 8 },
  handle:              { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 8 },
  titleRow:            { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleIcon:           { fontSize: 22 },
  title:               { color: COLORS.text, fontSize: 18, fontWeight: '700', flex: 1 },
  subtitle:            { color: COLORS.textMuted, fontSize: 13, marginBottom: 4 },
  option:              { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border },
  optionSelected:      { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '15' },
  optionPressed:       { backgroundColor: COLORS.border + '40' },
  optionEmoji:         { fontSize: 22 },
  optionText:          { flex: 1, gap: 2 },
  optionLabel:         { color: COLORS.textSec, fontSize: 15, fontWeight: '600' },
  optionLabelSelected: { color: COLORS.primary },
  optionDesc:          { color: COLORS.textMuted, fontSize: 12 },
  check:               { color: COLORS.primary, fontSize: 16, fontWeight: '700' },
  confirmBox:          { alignItems: 'center', paddingVertical: 28 },
  confirmText:         { color: COLORS.primary, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  removeBtn:           { alignItems: 'center', paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: COLORS.packed + '60', backgroundColor: COLORS.packed + '10' },
  removeBtnText:       { color: COLORS.packed, fontSize: 14, fontWeight: '600' },
  cancel:              { marginTop: 4, paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  cancelText:          { color: COLORS.textSec, fontSize: 15, fontWeight: '600' },
});
