import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/crowdColors';
import { BUSY_HOUR_LABELS, busyLevelFromPercent, CROWD_COLORS } from '@/utils/crowdUtils';

interface Props {
  data: number[]; // 18 values 0-100, each representing an hour 6AM-12AM
  currentHourIndex?: number; // Which hour slot is "now"
}

export default function BusyTimesChart({ data, currentHourIndex }: Props) {
  const maxVal = Math.max(...data, 1);
  // Show every 3rd label to avoid crowding
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

          return (
            <View key={i} style={styles.barWrapper}>
              <View style={styles.barContainer}>
                {isNow && <View style={[styles.nowIndicator, { backgroundColor: COLORS.primary }]} />}
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(pct * 80, val > 0 ? 4 : 0),
                      backgroundColor: isNow ? COLORS.primary : color,
                      opacity: val === 0 ? 0.2 : 1,
                    },
                  ]}
                />
              </View>
              {showLabel(i) && (
                <Text style={[styles.label, isNow && { color: COLORS.primary }]}>
                  {BUSY_HOUR_LABELS[i]}
                </Text>
              )}
            </View>
          );
        })}
      </View>
      <View style={styles.legend}>
        {(['empty', 'light', 'moderate', 'packed'] as const).map(level => (
          <View key={level} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: CROWD_COLORS[level] }]} />
            <Text style={styles.legendText}>{level.charAt(0).toUpperCase() + level.slice(1)}</Text>
          </View>
        ))}
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
  nowIndicator: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: 4,
    borderRadius: 1,
  },
  label: {
    color: COLORS.textMuted,
    fontSize: 9,
    marginTop: 4,
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
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
