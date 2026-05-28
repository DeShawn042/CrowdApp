import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CrowdLevel } from '@/data/mockData';
import { CROWD_BG_COLORS, CROWD_COLORS, CROWD_EMOJIS, CROWD_LABELS } from '@/utils/crowdUtils';

interface Props {
  level: CrowdLevel;
  size?: 'sm' | 'md' | 'lg';
  showEmoji?: boolean;
}

export default function CrowdLevelBadge({ level, size = 'md', showEmoji = true }: Props) {
  const color = CROWD_COLORS[level];
  const bg = CROWD_BG_COLORS[level];
  const label = CROWD_LABELS[level];
  const emoji = CROWD_EMOJIS[level];

  const textSize = size === 'sm' ? 11 : size === 'lg' ? 15 : 13;
  const paddingH = size === 'sm' ? 8 : size === 'lg' ? 16 : 12;
  const paddingV = size === 'sm' ? 3 : size === 'lg' ? 8 : 5;
  const radius = size === 'sm' ? 8 : size === 'lg' ? 12 : 10;
  const dotSize = size === 'sm' ? 6 : size === 'lg' ? 10 : 8;

  return (
    <View style={[styles.badge, { backgroundColor: bg, paddingHorizontal: paddingH, paddingVertical: paddingV, borderRadius: radius, borderColor: color }]}>
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
  dot: {},
  label: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
