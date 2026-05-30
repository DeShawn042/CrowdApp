import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/crowdColors';
import type { QuickReport } from '@/hooks/useQuickReports';
import type { ReportType } from '@/utils/quickReportConfig';

// ─── Helpers ────────────────────────────────────────────────────────────────

function minutesAgo(reports: QuickReport[]): number {
  if (!reports.length) return 0;
  const latest = Math.max(...reports.map(r => new Date(r.createdAt).getTime()));
  return Math.floor((Date.now() - latest) / 60_000);
}

function ageLabel(mins: number): string {
  if (mins < 1) return 'just now';
  if (mins === 1) return '1 min ago';
  return `${mins} min ago`;
}

function majority(reports: QuickReport[]): string | null {
  if (!reports.length) return null;
  const counts = new Map<string, number>();
  for (const r of reports) counts.set(r.value, (counts.get(r.value) ?? 0) + 1);
  let best = ''; let max = 0;
  counts.forEach((n, v) => { if (n > max) { max = n; best = v; } });
  return best;
}

function topN(reports: QuickReport[], n: number): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of reports) counts.set(r.value, (counts.get(r.value) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([value, count]) => ({ value, count }));
}

// ─── Scale bar ──────────────────────────────────────────────────────────────

interface ScaleProps {
  position: number; // 0–1
  leftLabel: string;
  rightLabel: string;
}

function ScaleBar({ position, leftLabel, rightLabel }: ScaleProps) {
  return (
    <View>
      <View style={scaleStyles.track}>
        <View style={[scaleStyles.fill, { width: `${Math.round(position * 100)}%` as any }]} />
        <View style={[scaleStyles.thumb, { left: `${Math.round(position * 100)}%` as any }]} />
      </View>
      <View style={scaleStyles.labels}>
        <Text style={scaleStyles.labelText}>{leftLabel}</Text>
        <Text style={scaleStyles.labelText}>{rightLabel}</Text>
      </View>
    </View>
  );
}

const scaleStyles = StyleSheet.create({
  track:     { height: 6, backgroundColor: COLORS.border, borderRadius: 3, marginVertical: 8, position: 'relative', overflow: 'visible' },
  fill:      { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: COLORS.primary + '60', borderRadius: 3 },
  thumb:     { position: 'absolute', top: -5, width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.primary, marginLeft: -8 },
  labels:    { flexDirection: 'row', justifyContent: 'space-between' },
  labelText: { color: COLORS.textMuted, fontSize: 11 },
});

// ─── Shared card shell ───────────────────────────────────────────────────────

interface CardProps {
  icon: string;
  label: string;
  count: number;
  updatedMins: number;
  children: React.ReactNode;
}

function SummaryCard({ icon, label, count, updatedMins, children }: CardProps) {
  const countStr = count === 1 ? '1 report' : `${count} reports`;
  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.header}>
        <Text style={cardStyles.headerLabel}>{icon} {label} · {countStr}</Text>
        <Text style={cardStyles.age}>{ageLabel(updatedMins)}</Text>
      </View>
      {children}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card:        { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 8 },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLabel: { color: COLORS.textSec, fontSize: 12, fontWeight: '600' },
  age:         { color: COLORS.textMuted, fontSize: 11 },
});

// ─── Per-type summaries ──────────────────────────────────────────────────────

const SERVICE_SCORES: Record<string, number> = {
  'Fast': 1, 'Average': 2, 'Slow': 3, 'Short staffed': 3.5,
};
const WAIT_SCORES: Record<string, number> = {
  'No wait': 0, 'Under 15 min': 1, '15–30 min': 2, '30–45 min': 3, '45+ min': 4,
};
const CLEAN_SCORES: Record<string, number> = {
  'Clean': 0, 'Average': 1, 'Needs attention': 2,
};

function avgScore(reports: QuickReport[], scores: Record<string, number>): number {
  const scored = reports.filter(r => scores[r.value] !== undefined);
  if (!scored.length) return 0;
  return scored.reduce((s, r) => s + scores[r.value], 0) / scored.length;
}

// SERVICE
export function ServiceSummary({ reports }: { reports: QuickReport[] }) {
  if (reports.length < 2) return null;
  const avg  = avgScore(reports, SERVICE_SCORES);
  const pos  = Math.min((avg - 1) / 2.5, 1); // range 1–3.5 → 0–1
  const mins = minutesAgo(reports);
  return (
    <SummaryCard icon="⚡" label="Service" count={reports.length} updatedMins={mins}>
      <ScaleBar position={pos} leftLabel="Fast" rightLabel="Slow" />
    </SummaryCard>
  );
}

// VIBE
export function VibeSummary({ reports }: { reports: QuickReport[] }) {
  if (reports.length < 2) return null;
  const top  = topN(reports, 2);
  const mins = minutesAgo(reports);
  return (
    <SummaryCard icon="✨" label="Vibe" count={reports.length} updatedMins={mins}>
      <View style={summaryStyles.pillRow}>
        {top.map(t => (
          <View key={t.value} style={summaryStyles.pill}>
            <Text style={summaryStyles.pillText}>{t.value} ({t.count})</Text>
          </View>
        ))}
      </View>
    </SummaryCard>
  );
}

// WAIT TIME
export function WaitTimeSummary({ reports }: { reports: QuickReport[] }) {
  if (reports.length < 2) return null;
  const avg  = avgScore(reports, WAIT_SCORES);
  const pos  = Math.min(avg / 4, 1); // range 0–4 → 0–1
  const mins = minutesAgo(reports);
  return (
    <SummaryCard icon="⏱️" label="Wait" count={reports.length} updatedMins={mins}>
      <ScaleBar position={pos} leftLabel="No wait" rightLabel="45+ min" />
    </SummaryCard>
  );
}

// COVER CHARGE
export function CoverChargeSummary({ reports }: { reports: QuickReport[] }) {
  if (reports.length < 1) return null;
  const yes  = reports.filter(r => r.value === 'Yes').length;
  const no   = reports.filter(r => r.value === 'No').length;
  const top  = yes >= no ? 'Yes' : 'No';
  const mins = minutesAgo(reports);
  return (
    <SummaryCard icon="👮" label="Cover charge" count={reports.length} updatedMins={mins}>
      <View style={summaryStyles.pillRow}>
        <View style={[summaryStyles.pill, top === 'Yes' && summaryStyles.pillActive]}>
          <Text style={[summaryStyles.pillText, top === 'Yes' && summaryStyles.pillTextActive]}>
            Yes ({yes})
          </Text>
        </View>
        <View style={[summaryStyles.pill, top === 'No' && summaryStyles.pillActive]}>
          <Text style={[summaryStyles.pillText, top === 'No' && summaryStyles.pillTextActive]}>
            No ({no})
          </Text>
        </View>
      </View>
    </SummaryCard>
  );
}

// PARKING
export function ParkingSummary({ reports }: { reports: QuickReport[] }) {
  if (reports.length < 2) return null;
  const top  = majority(reports);
  const mins = minutesAgo(reports);
  if (!top) return null;
  const COLOR: Record<string, string> = {
    'Available': COLORS.empty,
    'Limited':   COLORS.moderate,
    'None':      COLORS.packed,
  };
  return (
    <SummaryCard icon="🅿️" label="Parking" count={reports.length} updatedMins={mins}>
      <Text style={[summaryStyles.majorityText, { color: COLOR[top] ?? COLORS.text }]}>{top}</Text>
    </SummaryCard>
  );
}

// CLEANLINESS
export function CleanlinesssSummary({ reports }: { reports: QuickReport[] }) {
  if (reports.length < 2) return null;
  const avg  = avgScore(reports, CLEAN_SCORES);
  const pos  = Math.min(avg / 2, 1);
  const mins = minutesAgo(reports);
  return (
    <SummaryCard icon="🧼" label="Cleanliness" count={reports.length} updatedMins={mins}>
      <ScaleBar position={pos} leftLabel="Clean" rightLabel="Needs attention" />
    </SummaryCard>
  );
}

// EVENTS
export function EventsSummary({ reports }: { reports: QuickReport[] }) {
  if (reports.length < 1) return null;
  const top  = topN(reports, 3);
  const mins = minutesAgo(reports);
  return (
    <SummaryCard icon="🎉" label="Tonight" count={reports.length} updatedMins={mins}>
      <View style={summaryStyles.pillRow}>
        {top.map(t => (
          <View key={t.value} style={[summaryStyles.pill, summaryStyles.pillEvent]}>
            <Text style={summaryStyles.pillText}>{t.value}{t.count > 1 ? ` (${t.count})` : ''}</Text>
          </View>
        ))}
      </View>
    </SummaryCard>
  );
}

// PRICE (60-day reports, separate fetch)
export function PriceSummary({ reports }: { reports: QuickReport[] }) {
  if (reports.length < 2) return null;
  const top  = majority(reports);
  const mins = minutesAgo(reports);
  if (!top) return null;
  const SYMBOL: Record<string, string> = {
    'Reasonable': '$',
    'Moderate':   '$$',
    'Expensive':  '$$$',
  };
  return (
    <SummaryCard icon="💰" label="Price" count={reports.length} updatedMins={mins}>
      <Text style={summaryStyles.priceText}>
        <Text style={summaryStyles.priceSymbol}>{SYMBOL[top] ?? top}</Text>
        {'  '}{top}
      </Text>
    </SummaryCard>
  );
}

// ─── Shared styles ───────────────────────────────────────────────────────────

const summaryStyles = StyleSheet.create({
  pillRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill:             { backgroundColor: COLORS.surface, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.border },
  pillActive:       { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '18' },
  pillEvent:        { borderColor: COLORS.border },
  pillText:         { color: COLORS.textSec, fontSize: 13, fontWeight: '500' },
  pillTextActive:   { color: COLORS.primary, fontWeight: '700' },
  majorityText:     { fontSize: 16, fontWeight: '700' },
  priceText:        { color: COLORS.text, fontSize: 15, fontWeight: '500' },
  priceSymbol:      { color: COLORS.primary, fontWeight: '800', fontSize: 16 },
});

// ─── Orchestrator: picks which summaries to show based on active configs ─────

interface Props {
  reports: QuickReport[];
  priceReports: QuickReport[];
  activeTypes: Set<ReportType>; // report types relevant to this location
}

export default function QuickReportSummaries({ reports, priceReports, activeTypes }: Props) {
  const byType = (type: ReportType) => reports.filter(r => r.reportType === type);

  const serviceR     = activeTypes.has('service')      ? byType('service')     : [];
  const vibeR        = activeTypes.has('vibe')          ? byType('vibe')        : [];
  const waitR        = activeTypes.has('wait_time')     ? byType('wait_time')   : [];
  const coverR       = activeTypes.has('cover_charge')  ? byType('cover_charge'): [];
  const parkingR     = activeTypes.has('parking')       ? byType('parking')     : [];
  const cleanR       = activeTypes.has('cleanliness')   ? byType('cleanliness') : [];
  const eventR       = activeTypes.has('event')         ? byType('event')       : [];
  const showPrice    = activeTypes.has('price') && priceReports.length >= 2;

  const hasAnything =
    serviceR.length >= 2 || vibeR.length >= 2 || waitR.length >= 2 ||
    coverR.length >= 1   || parkingR.length >= 2 || cleanR.length >= 2 ||
    eventR.length >= 1   || showPrice;

  if (!hasAnything) return null;

  return (
    <View style={styles.container}>
      <VibeSummary        reports={vibeR} />
      <WaitTimeSummary    reports={waitR} />
      <ServiceSummary     reports={serviceR} />
      <EventsSummary      reports={eventR} />
      <CoverChargeSummary reports={coverR} />
      <ParkingSummary     reports={parkingR} />
      <CleanlinesssSummary reports={cleanR} />
      {showPrice && <PriceSummary reports={priceReports} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
});
