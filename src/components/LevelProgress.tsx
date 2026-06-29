import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import type { LevelInfo } from '@/hooks/useGamification';

interface Props {
  levelInfo: LevelInfo;
  totalPoints: number;
  weeklyPoints: number;
}

export default function LevelProgress({ levelInfo, totalPoints, weeklyPoints }: Props) {
  const { colors } = useTheme();
  const { current, next, progress, pointsToNext } = levelInfo;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Level badge row */}
      <View style={styles.row}>
        <View style={[styles.badge, { backgroundColor: current.color + '20', borderColor: current.color + '60' }]}>
          <Text style={styles.badgeIcon}>{current.icon}</Text>
          <Text style={[styles.badgeName, { color: current.color }]}>{current.name}</Text>
        </View>
        <View style={styles.pointsCol}>
          <Text style={[styles.pointsNum, { color: colors.text }]}>{totalPoints.toLocaleString()}</Text>
          <Text style={[styles.pointsLabel, { color: colors.textMuted }]}>total points</Text>
        </View>
        <View style={styles.pointsCol}>
          <Text style={[styles.pointsNum, { color: colors.text }]}>{weeklyPoints.toLocaleString()}</Text>
          <Text style={[styles.pointsLabel, { color: colors.textMuted }]}>this week</Text>
        </View>
      </View>

      {/* Progress bar */}
      {next ? (
        <>
          <View style={[styles.track, { backgroundColor: colors.border }]}>
            <View style={[styles.fill, { width: `${Math.round(progress * 100)}%`, backgroundColor: current.color }]} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={[styles.progressTxt, { color: colors.textMuted }]}>{current.name}</Text>
            <Text style={[styles.progressTxt, { color: colors.textMuted }]}>
              {pointsToNext} pts to {next.icon} {next.name}
            </Text>
          </View>
        </>
      ) : (
        <Text style={[styles.maxLevel, { color: current.color }]}>Max level reached 🎉</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16, borderWidth: 1, padding: 16, gap: 12,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
    flex: 1,
  },
  badgeIcon: { fontSize: 16 },
  badgeName: { fontSize: 13, fontWeight: '700' },

  pointsCol: { alignItems: 'center', flex: 0.7 },
  pointsNum: { fontSize: 18, fontWeight: '800' },
  pointsLabel: { fontSize: 10, marginTop: 1 },

  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill:  { height: 6, borderRadius: 3 },

  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressTxt:    { fontSize: 10 },

  maxLevel: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
});
