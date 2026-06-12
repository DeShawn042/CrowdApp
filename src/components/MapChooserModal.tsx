import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { COLORS } from '@/constants/crowdColors';
import { useTheme } from '@/context/ThemeContext';
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
  defaultAppLabel?: string;
  onPick: (option: MapOption) => void;
  onClose: () => void;
}

export default function MapChooserModal({ visible, options, defaultAppLabel, onPick, onClose }: Props) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.title, { color: colors.textMuted }]}>Open in Maps</Text>

          {options.map(opt => (
            <Pressable
              key={opt.label}
              style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
              onPress={() => onPick(opt)}>
              <Text style={styles.optionIcon}>{APP_ICONS[opt.label] ?? '🗺️'}</Text>
              <View style={styles.optionLabelCol}>
                <Text style={[styles.optionLabel, { color: colors.text }]}>{opt.label}</Text>
                {opt.label === defaultAppLabel && (
                  <Text style={[styles.defaultBadge, { color: COLORS.primary }]}>Default</Text>
                )}
              </View>
              <Text style={[styles.optionArrow, { color: colors.textMuted }]}>›</Text>
            </Pressable>
          ))}

          <Pressable
            style={({ pressed }) => [styles.cancel, { borderColor: colors.border }, pressed && styles.optionPressed]}
            onPress={onClose}>
            <Text style={[styles.cancelText, { color: colors.textSec }]}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet:           { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12, gap: 4 },
  handle:          { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title:           { fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 },
  option:          { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, paddingHorizontal: 4, borderRadius: 12 },
  optionPressed:   { backgroundColor: COLORS.border + '40' },
  optionIcon:      { fontSize: 22, width: 28, textAlign: 'center' },
  optionLabelCol:  { flex: 1, gap: 1 },
  optionLabel:     { fontSize: 16, fontWeight: '500' },
  defaultBadge:    { fontSize: 11, fontWeight: '600' },
  optionArrow:     { fontSize: 20 },
  cancel:          { marginTop: 8, paddingVertical: 15, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  cancelText:      { fontSize: 16, fontWeight: '600' },
});
