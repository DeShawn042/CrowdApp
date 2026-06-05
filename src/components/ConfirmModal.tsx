import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/crowdColors';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/themes';

interface Action {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  cancel?: boolean;
}

interface Props {
  visible: boolean;
  title: string;
  message: string;
  actions: Action[];
  onClose: () => void;
}

export default function ConfirmModal({ visible, title, message, actions, onClose }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      hardwareAccelerated
      onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            {actions.map((action, i) => (
              <Pressable
                key={i}
                style={({ pressed }) => [
                  styles.btn,
                  action.destructive && styles.btnDestructive,
                  action.cancel     && styles.btnCancel,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => { action.onPress(); onClose(); }}>
                <Text style={[
                  styles.btnText,
                  action.destructive && styles.btnTextDestructive,
                  action.cancel      && styles.btnTextCancel,
                ]}>
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    backdrop:          { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 32 },
    card:              { backgroundColor: c.card, borderRadius: 20, padding: 24, width: '100%', maxWidth: 400, gap: 16, borderWidth: 1, borderColor: c.border },
    title:             { color: c.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
    message:           { color: c.textSec, fontSize: 14, textAlign: 'center', lineHeight: 20 },
    actions:           { gap: 10, marginTop: 4 },
    btn:               { borderRadius: 14, paddingVertical: 13, alignItems: 'center', backgroundColor: COLORS.primary },
    btnDestructive:    { backgroundColor: COLORS.packed },
    btnCancel:         { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.border },
    btnText:           { color: '#fff', fontSize: 15, fontWeight: '700' },
    btnTextDestructive:{ color: '#fff' },
    btnTextCancel:     { color: c.textSec },
  });
}
