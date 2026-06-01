import React, { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { COLORS } from '@/constants/crowdColors';
import { busyLevelFromPercent, CROWD_COLORS } from '@/utils/crowdUtils';
import type { CrowdLevel } from '@/data/mockData';

// ── Layout constants ──────────────────────────────────────────
const MIN_BAR_W = 28;
const BAR_GAP   = 4;
const CHART_H   = 84;
const NOW_H     = 18;
const LBL_H     = 16;
const TOTAL_H_PAD = 72; // outer scroll (20×2) + card padding (16×2)

// ── Data-source colours ───────────────────────────────────────
const PRESCOUT_COLOR = '#22C55E'; // bright green  — Prescout live reports
const GOOGLE_COLOR   = '#3B82F6'; // blue          — Google live / typical-open

// Prescout crowd level → bar height %
const LIVE_PCT: Record<CrowdLevel, number> = {
  empty: 10, light: 35, moderate: 65, packed: 90,
};

// ── Helpers ───────────────────────────────────────────────────

function fmtFull(rawHour: number): string {
  const h = rawHour % 24;
  if (h === 0)  return '12a';
  if (h === 12) return '12p';
  return h < 12 ? `${h}a` : `${h - 12}p`;
}

function fmtShort(rawHour: number): string {
  const h = rawHour % 24;
  if (h === 0)  return '12a';
  if (h === 12) return '12p';
  return h < 12 ? `${h}` : `${h - 12}`;
}

function fmtSubHour(rawHour: number): string {
  const h = rawHour % 24;
  if (h === 0)  return 'Midnight';
  if (h === 12) return 'Noon';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function barValue(rawHour: number, busyHours: number[]): number {
  const h = rawHour % 24;
  if (h >= 6 && h <= 23) return busyHours[h - 6] ?? 0;
  if (rawHour >= 24) {
    const after = rawHour - 24;
    return Math.round((busyHours[17] ?? 0) * Math.max(0, 1 - after / 4));
  }
  return Math.round((busyHours[0] ?? 0) * (h / 6));
}

// ── Component ─────────────────────────────────────────────────

interface Props {
  /** 18 values: index 0 = 6 AM … index 17 = 11 PM, each 0–100. */
  data: number[];
  /** Current real hour 0–23. */
  currentHour: number;
  /**
   * Prescout live crowd level — set when Supabase crowd_reports has active
   * entries for this location within the last 60 minutes.
   * Priority 1 (overrides Google Live).
   */
  liveCrowd?: CrowdLevel;
  /**
   * Google's busyness estimate for the current hour (0–100).
   * Derived from busyHours when the place is confirmed open.
   * Priority 2 (shown only when no Prescout reports).
   */
  googleLivePct?: number;
  /** Venue open hour 0–23. Defaults to 6. */
  openHour?: number;
  /** Venue close hour. > 23 = next day (24 = midnight, 26 = 2 AM…). */
  closeHour?: number;
}

export default function BusyTimesChart({
  data,
  currentHour,
  liveCrowd,
  googleLivePct,
  openHour,
  closeHour,
}: Props) {
  const { width: screenW } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);

  // ── Hour range ───────────────────────────────────────────────
  const start         = openHour  ?? 6;
  const end           = closeHour ?? 24;
  const spanHours     = Math.min(end - start, 24);
  const isTwentyFourH = spanHours >= 24;

  const hours = isTwentyFourH
    ? Array.from({ length: 24 }, (_, i) => i)
    : Array.from({ length: Math.max(spanHours, 0) }, (_, i) => start + i);

  // ── Responsive bar width ─────────────────────────────────────
  const availableW  = Math.max(screenW - TOTAL_H_PAD, 80);
  const totalGaps   = Math.max(hours.length - 1, 0) * BAR_GAP;
  const naturalBarW = hours.length > 0
    ? Math.floor((availableW - totalGaps) / hours.length)
    : MIN_BAR_W;
  const barW      = Math.max(naturalBarW, MIN_BAR_W);
  const canScroll = naturalBarW < MIN_BAR_W;

  const useShortLabel = barW < 32;
  const labelFontSz   = barW < 34 ? 8 : 9;

  // ── Chart data ───────────────────────────────────────────────
  const nowIdx = hours.findIndex(h => h % 24 === currentHour);
  const maxVal = hours.length > 0
    ? Math.max(...hours.map(h => barValue(h, data)), 1)
    : 1;

  // Determine which data source is active for the current hour
  type DataSource = 'prescout' | 'google' | 'typical';
  const dataSource: DataSource =
    liveCrowd                     ? 'prescout'
    : googleLivePct != null       ? 'google'
    : 'typical';

  // NOW chip colour reflects the active data source
  const nowColor =
    dataSource === 'prescout' ? PRESCOUT_COLOR
    : dataSource === 'google' ? GOOGLE_COLOR
    : COLORS.primary;

  // Auto-scroll to current bar with 2 bars of lead
  useEffect(() => {
    if (nowIdx < 0) return;
    const x = Math.max(0, (nowIdx - 2) * (barW + BAR_GAP));
    const t = setTimeout(() => scrollRef.current?.scrollTo({ x, animated: false }), 200);
    return () => clearTimeout(t);
  }, [nowIdx, barW]);

  // ── Subtitle ─────────────────────────────────────────────────
  const hoursLabel = isTwentyFourH
    ? '24 hours'
    : `${fmtSubHour(start)} – ${fmtSubHour(end)}${end > 24 ? ' (next day)' : ''}`;

  const sourceLabel =
    dataSource === 'prescout' ? 'Prescout Live'
    : dataSource === 'google' ? 'Google Live'
    : 'Typical pattern';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Busy Times</Text>
      <Text style={styles.subtitle}>{hoursLabel}  ·  {sourceLabel}</Text>

      {/* Chart with right-edge fade */}
      <View style={styles.chartWrapper}>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>

          {hours.map((rawHour, i) => {
            const val   = barValue(rawHour, data);
            const pct   = val / maxVal;
            const level = busyLevelFromPercent(val);
            const color = CROWD_COLORS[level];
            const isNow = i === nowIdx;

            const typH = Math.max(pct * CHART_H, val > 0 ? 3 : 0);

            // Typical bar is always rendered; dim it when a live source is active
            const typOpacity = isNow
              ? (dataSource !== 'typical' ? 0.14 : 0.90)
              : (val === 0 ? 0.08 : 0.28);

            // Heights for the two live-source overlays
            const prescoutH = liveCrowd
              ? Math.max((LIVE_PCT[liveCrowd] / 100) * CHART_H, 4)
              : 0;
            const googleH = googleLivePct != null
              ? Math.max((googleLivePct / 100) * CHART_H, 4)
              : 0;

            return (
              <View
                key={rawHour}
                style={[
                  styles.col,
                  { width: barW },
                  i < hours.length - 1 && { marginRight: BAR_GAP },
                ]}>

                {/* NOW chip — colour tracks data source */}
                <View style={styles.nowArea}>
                  {isNow && (
                    <View style={[styles.nowChip, { backgroundColor: nowColor + '28' }]}>
                      <Text style={[styles.nowText, { color: nowColor }]}>NOW</Text>
                    </View>
                  )}
                </View>

                {/* Bar area */}
                <View style={[styles.barArea, { width: barW }]}>
                  {/* Column background highlight */}
                  {isNow && (
                    <View
                      style={[
                        styles.colHighlight,
                        {
                          backgroundColor: nowColor,
                          borderRadius: Math.max(Math.floor(barW / 6), 3),
                        },
                      ]}
                    />
                  )}

                  {/* ① Typical (historical) bar — always present */}
                  <View
                    style={[
                      styles.bar,
                      { height: typH, width: barW - 6, backgroundColor: color, opacity: typOpacity },
                    ]}
                  />

                  {/* ② Prescout Live overlay (priority 1) */}
                  {isNow && liveCrowd && (
                    <View
                      style={[
                        styles.liveBar,
                        { height: prescoutH, width: barW - 6, backgroundColor: PRESCOUT_COLOR },
                      ]}
                    />
                  )}

                  {/* ③ Google Live overlay (priority 2 — only when no Prescout data) */}
                  {isNow && googleLivePct != null && !liveCrowd && (
                    <View
                      style={[
                        styles.liveBar,
                        { height: googleH, width: barW - 6, backgroundColor: GOOGLE_COLOR },
                      ]}
                    />
                  )}

                  {/* Dot above the active live bar */}
                  {isNow && liveCrowd && (
                    <View style={[styles.liveDot, { bottom: prescoutH + 5, backgroundColor: PRESCOUT_COLOR }]} />
                  )}
                  {isNow && googleLivePct != null && !liveCrowd && (
                    <View style={[styles.liveDot, { bottom: googleH + 5, backgroundColor: GOOGLE_COLOR }]} />
                  )}
                </View>

                {/* Time label */}
                <Text
                  style={[
                    styles.label,
                    { width: barW, fontSize: labelFontSz },
                    isNow && { color: nowColor, fontWeight: '700' },
                  ]}
                  numberOfLines={1}>
                  {useShortLabel ? fmtShort(rawHour) : fmtFull(rawHour)}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        {/* Right-edge fade hint (stepped, visible only when chart scrolls) */}
        {canScroll && (
          <View style={styles.fadeRight} pointerEvents="none">
            <View style={[styles.fadeSlice, { opacity: 0.00 }]} />
            <View style={[styles.fadeSlice, { opacity: 0.20 }]} />
            <View style={[styles.fadeSlice, { opacity: 0.45 }]} />
            <View style={[styles.fadeSlice, { opacity: 0.70 }]} />
            <View style={[styles.fadeSlice, { opacity: 0.92 }]} />
          </View>
        )}
      </View>

      {/* ── Legend ─────────────────────────────────────────────── */}
      <View style={styles.legendRow}>
        {/* Typical — always shown */}
        <View style={styles.legendItem}>
          <View style={[styles.legendBar, { backgroundColor: COLORS.textMuted, opacity: 0.28 }]} />
          <Text style={styles.legendText}>Typical</Text>
        </View>

        <View style={styles.legendDivider} />

        {/* Google Live — shown when place is open and no Prescout reports */}
        {googleLivePct != null && !liveCrowd && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: GOOGLE_COLOR }]} />
            <Text style={[styles.legendText, { color: GOOGLE_COLOR, fontWeight: '600' }]}>
              Google Live
            </Text>
          </View>
        )}

        {/* Prescout Live — shown when Supabase reports are active */}
        {liveCrowd && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: PRESCOUT_COLOR }]} />
            <Text style={[styles.legendText, { color: PRESCOUT_COLOR, fontWeight: '600' }]}>
              Prescout Live
            </Text>
          </View>
        )}

        {/* Crowd-level colour key — only shown in pure-Typical mode */}
        {dataSource === 'typical' && (
          <>
            {(['empty', 'light', 'moderate', 'packed'] as const).map(l => (
              <View key={l} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: CROWD_COLORS[l] }]} />
                <Text style={styles.legendText}>
                  {l.charAt(0).toUpperCase() + l.slice(1)}
                </Text>
              </View>
            ))}
          </>
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
  title:    { color: COLORS.text,      fontSize: 15, fontWeight: '600' },
  subtitle: { color: COLORS.textMuted, fontSize: 11, marginBottom: 8  },

  chartWrapper:  { overflow: 'hidden' },
  scrollContent: { paddingBottom: 2   },

  col:     { alignItems: 'center' },
  nowArea: { height: NOW_H, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 3 },
  nowChip: { borderRadius: 4, paddingHorizontal: 3, paddingVertical: 1 },
  nowText: { fontSize: 7, fontWeight: '800', letterSpacing: 0.4 },

  barArea: {
    height: CHART_H,
    justifyContent: 'flex-end',
    alignItems: 'center',
    position: 'relative',
  },
  colHighlight: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    opacity: 0.07,
  },
  bar:     { borderRadius: 3, alignSelf: 'center' },
  liveBar: { position: 'absolute', bottom: 0, borderRadius: 3, alignSelf: 'center' },
  liveDot: { position: 'absolute', width: 5, height: 5, borderRadius: 3, alignSelf: 'center' },

  label:    { height: LBL_H, color: COLORS.textMuted, marginTop: 3, textAlign: 'center' },

  fadeRight: { position: 'absolute', top: 0, bottom: 0, right: 0, width: 36, flexDirection: 'row' },
  fadeSlice: { flex: 1, backgroundColor: COLORS.card },

  legendRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  legendItem:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendBar:     { width: 8, height: 12, borderRadius: 2 },
  legendDivider: { width: 1, height: 12, backgroundColor: COLORS.border },
  legendDot:     { width: 6, height: 6, borderRadius: 3 },
  legendText:    { color: COLORS.textMuted, fontSize: 10 },
});
