import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { BADGES } from '@/constants/gamification';

interface Props {
  earnedIds: Set<string>;
}

export default function BadgeGrid({ earnedIds }: Props) {
  const { colors } = useTheme();
  const [selected, setSelected] = useState<(typeof BADGES)[0] | null>(null);

  return (
    <>
      <View style={styles.grid}>
        {BADGES.map(badge => {
          const earned = earnedIds.has(badge.id);
          return (
            <Pressable
              key={badge.id}
              style={[
                styles.badge,
                { backgroundColor: colors.card, borderColor: earned ? colors.primary + '80' : colors.border },
                earned && { backgroundColor: colors.primary + '10' },
              ]}
              onPress={() => setSelected(badge)}>
              <Text style={[styles.icon, !earned && styles.locked]}>{earned ? badge.icon : '🔒'}</Text>
              <Text
                style={[styles.name, { color: earned ? colors.text : colors.textMuted }]}
                numberOfLines={2}>
                {badge.name}
              </Text>
              {earned && <View style={[styles.earnedDot, { backgroundColor: colors.primary }]} />}
            </Pressable>
          );
        })}
      </View>

      {/* Detail modal */}
      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.overlay} onPress={() => setSelected(null)}>
          <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {selected && (() => {
              const earned = earnedIds.has(selected.id);
              return (
                <>
                  <Text style={styles.sheetIcon}>{earned ? selected.icon : '🔒'}</Text>
                  <Text style={[styles.sheetName, { color: colors.text }]}>{selected.name}</Text>
                  <Text style={[styles.sheetDesc, { color: colors.textMuted }]}>{selected.description}</Text>
                  <View style={[styles.sheetStatus, { backgroundColor: earned ? '#22C55E20' : colors.surface, borderColor: earned ? '#22C55E60' : colors.border }]}>
                    <Text style={{ color: earned ? '#22C55E' : colors.textMuted, fontWeight: '600', fontSize: 12 }}>
                      {earned ? '✓ Earned' : 'Not yet earned'}
                    </Text>
                  </View>
                </>
              );
            })()}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  badge: {
    width: 76, alignItems: 'center', padding: 10, borderRadius: 12, borderWidth: 1, gap: 4,
    position: 'relative',
  },
  icon:   { fontSize: 28 },
  locked: { opacity: 0.4 },
  name:   { fontSize: 10, textAlign: 'center', fontWeight: '500', lineHeight: 13 },
  earnedDot: { position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: 3 },

  overlay: { flex: 1, backgroundColor: '#00000060', justifyContent: 'center', alignItems: 'center', padding: 32 },
  sheet: {
    borderRadius: 20, borderWidth: 1, padding: 24, alignItems: 'center', gap: 8, width: '100%',
  },
  sheetIcon: { fontSize: 52 },
  sheetName: { fontSize: 18, fontWeight: '700' },
  sheetDesc: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  sheetStatus: { marginTop: 4, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
});
