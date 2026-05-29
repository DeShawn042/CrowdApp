import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/crowdColors';
import { BUSY_HOUR_LABELS, busyLevelFromPercent, CROWD_COLORS } from '@/utils/crowdUtils';
import type { CrowdLevel } from '@/data/mockData';

// Representative chart percentages for each live crowd level
const LIVE_CROWD_PCT: Record<CrowdLevel, number> = {
  empty: 10,
  light: 35,
  moderate: 65,
  packed: 90,
};

interface Props {
  data: number[]; // 18 values 0-100, each representing an hour 6AM-12AM
  currentHourIndex?: number; // Which hour slot is "now"
  liveCrowd?: CrowdLevel; // Current live crowd level to overlay at the current hour
}

export default function BusyTimesChart({ data, currentHourIndex, liveCrowd }: Props) {
  const maxVal = Math.max(...data, 1);
  const showLabel = (i: number) => i % 3 === 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Typical Busy Times</Text>
      <Text style={styles.subtitle}>Based on historical Google data</Text>
      <View style={styles.chart}>
        {data.map((val, i) => {
          const pct = val / maxVal;
          const level = busyLevelFromPercent(val);
          const color = CROWD_COLORS[level];
          const isNow = i === currentHourIndex;
          const liveHeight = liveCrowd
            ? Math.max((LIVE_CROWD_PCT[liveCrowd] / maxVal) * 80, 4)
            : 0;

          return (
            <View key={i} style={styles.barWrapper}>
              <View style={styles.barContainer}>
                {/* Typical historical bar — always ghosted */}
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(pct * 80, val > 0 ? 4 : 0),
                      backgroundColor: color,
                      opacity: val === 0 ? 0.1 : 0.28,
                    },
                  ]}
                />
                {/* Live crowd overlay at current hour */}
                {isNow && liveCrowd && (
                  <View
                    style={[
                      styles.bar,
                      styles.liveBar,
                      {
                        height: liveHeight,
                        backgroundColor: CROWD_COLORS[liveCrowd],
                      },
                    ]}
                  />
                )}
                {/* Dot above the live bar */}
                {isNow && liveCrowd && (
                  <View
                    style={[
                      styles.liveDot,
                      {
                        bottom: liveHeight + 5,
                        backgroundColor: CROWD_COLORS[liveCrowd],
                      },
                    ]}
                  />
                )}
              </View>
              {showLabel(i) && (
                <Text
                  style={[
                    styles.label,
                    isNow && { color: COLORS.primary, fontWeight: '700' },
                  ]}>
                  {BUSY_HOUR_LABELS[i]}
                </Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendTypical}>
          <View style={[styles.legendBar, { backgroundColor: COLORS.textMuted, opacity: 0.28 }]} />
          <Text style={styles.legendText}>Typical</Text>
        </View>
        <View style={styles.legendDivider} />
        {liveCrowd ? (
          <View style={styles.legendLive}>
            <View style={[styles.legendDot, { backgroundColor: CROWD_COLORS[liveCrowd] }]} />
            <Text style={[styles.legendText, { color: CROWD_COLORS[liveCrowd], fontWeight: '600' }]}>
              Live now
            </Text>
          </View>
        ) : (
          (['empty', 'light', 'moderate', 'packed'] as const).map(l => (
            <View key={l} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: CROWD_COLORS[l] }]} />
              <Text style={styles.legendText}>{l.charAt(0).toUpperCase() + l.slice(1)}</Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  title: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginBottom: 12,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 100,
    paddingBottom: 16,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  barContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
    position: 'relative',
  },
  bar: {
    width: '80%',
    borderRadius: 3,
    minHeight: 0,
  },
  liveBar: {
    position: 'absolute',
    bottom: 0,
    width: '80%',
    borderRadius: 3,
  },
  liveDot: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  label: {
    color: COLORS.textMuted,
    fontSize: 9,
    marginTop: 4,
    textAlign: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  legendTypical: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendBar: {
    width: 8,
    height: 12,
    borderRadius: 2,
  },
  legendDivider: {
    width: 1,
    height: 12,
    backgroundColor: COLORS.border,
  },
  legendLive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
});
