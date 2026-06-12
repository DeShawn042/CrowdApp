import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CrowdLevel } from '@/data/mockData';
import { CrowdSource, CROWD_BG_COLORS, CROWD_COLORS, CROWD_EMOJIS, CROWD_LABELS } from '@/utils/crowdUtils';
import { useTheme } from '@/context/ThemeContext';

interface Props {
  level?: CrowdLevel;
  size?: 'sm' | 'md' | 'lg';
  showEmoji?: boolean;
  source?: CrowdSource;
}

export default function CrowdLevelBadge({ level, size = 'md', showEmoji = true, source }: Props) {
  const { colors } = useTheme();
  const textSize = size === 'sm' ? 11 : size === 'lg' ? 15 : 13;
  const paddingH = size === 'sm' ? 8  : size === 'lg' ? 16 : 12;
  const paddingV = size === 'sm' ? 3  : size === 'lg' ? 8  : 5;
  const radius   = size === 'sm' ? 8  : size === 'lg' ? 12 : 10;
  const dotSize  = size === 'sm' ? 6  : size === 'lg' ? 10 : 8;

  // ── No-data states ───────────────────────────────────────────
  if (source === 'closed') {
    return (
      <View style={[styles.badge, { backgroundColor: colors.surface, borderColor: colors.border, paddingHorizontal: paddingH, paddingVertical: paddingV, borderRadius: radius }]}>
        <Text style={[styles.mutedLabel, { fontSize: textSize, color: colors.textMuted }]}>Closed</Text>
      </View>
    );
  }
  if (source === 'none') {
    return (
      <View style={[styles.badge, { backgroundColor: colors.surface, borderColor: colors.border, paddingHorizontal: paddingH, paddingVertical: paddingV, borderRadius: radius }]}>
        <Text style={[styles.mutedLabel, { fontSize: textSize, color: colors.textMuted }]}>No data yet</Text>
      </View>
    );
  }

  // ── Live / Typical ───────────────────────────────────────────
  if (!level) return null;

  const color = CROWD_COLORS[level];
  const bg    = CROWD_BG_COLORS[level];
  const label = CROWD_LABELS[level];
  const emoji = CROWD_EMOJIS[level];

  return (
    <View style={[styles.badge, { backgroundColor: bg, paddingHorizontal: paddingH, paddingVertical: paddingV, borderRadius: radius, borderColor: color }]}>
      {source === 'live' && (
        <View style={[styles.liveDot, { width: dotSize, height: dotSize, borderRadius: dotSize / 2 }]} />
      )}
      {source === 'typical' && (
        <Text style={[styles.typicalTilde, { color, fontSize: textSize }]}>~</Text>
      )}
      {showEmoji ? (
        <Text style={{ fontSize: textSize }}>{emoji}</Text>
      ) : (
        <View style={[styles.dot, { width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: color }]} />
      )}
      <Text style={[styles.label, { color, fontSize: textSize }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  mutedLabel:   { fontWeight: '500' },
  liveDot:      { backgroundColor: '#22C55E' },
  typicalTilde: { fontWeight: '700', lineHeight: 16 },
  dot:          {},
  label:        { fontWeight: '600', letterSpacing: 0.3 },
});
