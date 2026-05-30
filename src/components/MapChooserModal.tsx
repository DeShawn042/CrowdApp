import React from 'react';
import {
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { COLORS } from '@/constants/crowdColors';
import type { MapOption } from '@/hooks/useMapLink';

const APP_ICONS: Record<string, string> = {
  'Apple Maps': '🗺️',
  'Google Maps': '📍',
  'Waze': '🚗',
  'Uber': '🚙',
  'Google Maps (Browser)': '🌐',
};

interface Props {
  visible: boolean;
  options: MapOption[];
  onClose: () => void;
}

export default function MapChooserModal({ visible, options, onClose }: Props) {
  function handlePick(url: string) {
    onClose();
    Linking.openURL(url);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Open in Maps</Text>

          {options.map(opt => (
            <Pressable
              key={opt.label}
              style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
              onPress={() => handlePick(opt.url)}>
              <Text style={styles.optionIcon}>{APP_ICONS[opt.label] ?? '🗺️'}</Text>
              <Text style={styles.optionLabel}>{opt.label}</Text>
              <Text style={styles.optionArrow}>›</Text>
            </Pressable>
          ))}

          <Pressable
            style={({ pressed }) => [styles.cancel, pressed && styles.optionPressed]}
            onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet:         { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12, gap: 4 },
  handle:        { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 16 },
  title:         { color: COLORS.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 },
  option:        { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, paddingHorizontal: 4, borderRadius: 12 },
  optionPressed: { backgroundColor: COLORS.border + '40' },
  optionIcon:    { fontSize: 22, width: 28, textAlign: 'center' },
  optionLabel:   { flex: 1, color: COLORS.text, fontSize: 16, fontWeight: '500' },
  optionArrow:   { color: COLORS.textMuted, fontSize: 20 },
  cancel:        { marginTop: 8, paddingVertical: 15, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  cancelText:    { color: COLORS.textSec, fontSize: 16, fontWeight: '600' },
});
