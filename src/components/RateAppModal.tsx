import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import * as StoreReview from 'expo-store-review';
import { COLORS } from '@/constants/crowdColors';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/themes';

interface Props {
  visible: boolean;
  onRate: () => void;
  onDismiss: () => void;
}

export default function RateAppModal({ visible, onRate, onDismiss }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  async function handleRate() {
    onRate();
    if (await StoreReview.isAvailableAsync()) {
      await StoreReview.requestReview();
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent hardwareAccelerated>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.emoji}>⭐</Text>
          <Text style={styles.title}>Enjoying Prescout?</Text>
          <Text style={styles.body}>
            Rate us on the App Store to help others discover Prescout!
          </Text>
          <Pressable
            style={({ pressed }) => [styles.rateBtn, pressed && { opacity: 0.8 }]}
            onPress={handleRate}>
            <Text style={styles.rateBtnText}>Rate Now</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.laterBtn, pressed && { opacity: 0.7 }]}
            onPress={onDismiss}>
            <Text style={styles.laterText}>Maybe Later</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    backdrop:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 32 },
    card:       { backgroundColor: c.card, borderRadius: 24, padding: 28, alignItems: 'center', gap: 12, width: '100%', borderWidth: 1, borderColor: c.border },
    emoji:      { fontSize: 48 },
    title:      { color: c.text, fontSize: 20, fontWeight: '700', textAlign: 'center' },
    body:       { color: c.textSec, fontSize: 14, textAlign: 'center', lineHeight: 20 },
    rateBtn:    { width: '100%', backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
    rateBtnText:{ color: '#fff', fontSize: 16, fontWeight: '700' },
    laterBtn:   { paddingVertical: 8 },
    laterText:  { color: c.textMuted, fontSize: 14, fontWeight: '500' },
  });
}
