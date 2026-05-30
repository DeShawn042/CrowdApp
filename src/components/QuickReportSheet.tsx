import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { COLORS } from '@/constants/crowdColors';
import type { QuickReportConfig } from '@/utils/quickReportConfig';

interface Props {
  visible: boolean;
  config: QuickReportConfig | null;
  myCurrentValue: string | null;
  onClose: () => void;
  onSubmit: (value: string) => Promise<void>;
}

export default function QuickReportSheet({
  visible,
  config,
  myCurrentValue,
  onClose,
  onSubmit,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);

  async function handlePick(value: string) {
    setSubmitting(true);
    await onSubmit(value);
    setSubmitting(false);
    setSubmitted(true);
    setTimeout(() => { setSubmitted(false); onClose(); }, 900);
  }

  function handleClose() {
    setSubmitted(false);
    onClose();
  }

  if (!config) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.titleRow}>
            <Text style={styles.titleIcon}>{config.icon}</Text>
            <Text style={styles.title}>{config.label}</Text>
          </View>

          {submitted ? (
            <View style={styles.statusBox}>
              <Text style={styles.successText}>✓  Thanks for reporting!</Text>
            </View>
          ) : submitting ? (
            <View style={styles.statusBox}>
              <ActivityIndicator color={COLORS.primary} />
            </View>
          ) : (
            <>
              {myCurrentValue && (
                <Text style={styles.currentHint}>
                  Your current report:{' '}
                  <Text style={styles.currentVal}>{myCurrentValue}</Text>
                </Text>
              )}
              {config.options.map(opt => (
                <Pressable
                  key={opt}
                  style={({ pressed }) => [
                    styles.option,
                    myCurrentValue === opt && styles.optionSelected,
                    pressed && styles.optionPressed,
                  ]}
                  onPress={() => handlePick(opt)}>
                  <Text style={[styles.optionText, myCurrentValue === opt && styles.optionTextSelected]}>
                    {opt}
                  </Text>
                  {myCurrentValue === opt && <Text style={styles.checkmark}>✓</Text>}
                </Pressable>
              ))}
            </>
          )}

          <Pressable
            style={({ pressed }) => [styles.cancel, pressed && { opacity: 0.6 }]}
            onPress={handleClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop:           { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet:              { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12, gap: 6 },
  handle:             { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 12 },
  titleRow:           { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  titleIcon:          { fontSize: 24 },
  title:              { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  currentHint:        { color: COLORS.textMuted, fontSize: 12, marginBottom: 4 },
  currentVal:         { color: COLORS.primary, fontWeight: '600' },
  option:             { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row', alignItems: 'center' },
  optionSelected:     { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '18' },
  optionPressed:      { backgroundColor: COLORS.border + '40' },
  optionText:         { flex: 1, color: COLORS.textSec, fontSize: 15, fontWeight: '500' },
  optionTextSelected: { color: COLORS.primary, fontWeight: '700' },
  checkmark:          { color: COLORS.primary, fontSize: 16, fontWeight: '700' },
  statusBox:          { alignItems: 'center', paddingVertical: 32 },
  successText:        { color: COLORS.primary, fontSize: 16, fontWeight: '700' },
  cancel:             { marginTop: 6, paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  cancelText:         { color: COLORS.textSec, fontSize: 15, fontWeight: '600' },
});
