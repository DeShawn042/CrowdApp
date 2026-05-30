import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/crowdColors';
import QuickReportSheet from '@/components/QuickReportSheet';
import { REPORT_TYPE_ICONS } from '@/utils/quickReportConfig';
import type { AggregatedReport, ReportType } from '@/hooks/useQuickReports';
import type { QuickReportConfig } from '@/utils/quickReportConfig';

interface Props {
  configs: QuickReportConfig[];           // ordered list for this location type
  aggregated: AggregatedReport[];
  myLast: Record<ReportType, string | null>;
  cooldownFor: (type: ReportType) => number;
  onSubmit: (type: ReportType, value: string) => Promise<boolean>;
}

export default function QuickReportsSection({
  configs,
  aggregated,
  myLast,
  cooldownFor,
  onSubmit,
}: Props) {
  const [activeType, setActiveType] = useState<ReportType | null>(null);

  // Multiple configs can share the same type (e.g. two vibe variants).
  // Find the config whose type matches the active tap.
  const activeConfig = configs.find(c => c.type === activeType) ?? null;

  async function handleSubmit(value: string) {
    if (!activeType) return;
    await onSubmit(activeType, value);
  }

  // Only show pills for report types present in this location's config set
  const configTypes = new Set(configs.map(c => c.type));
  const visiblePills = aggregated.filter(r => configTypes.has(r.reportType));

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Quick Reports</Text>

      {/* Report type buttons — one per config entry */}
      <View style={styles.buttonRow}>
        {configs.map(cfg => {
          const onCooldown = cooldownFor(cfg.type) > 0;
          const hasReport  = !!myLast[cfg.type];
          return (
            <Pressable
              key={cfg.type}
              style={({ pressed }) => [
                styles.typeBtn,
                hasReport && styles.typeBtnActive,
                onCooldown && styles.typeBtnCooldown,
                pressed && styles.typeBtnPressed,
              ]}
              onPress={() => setActiveType(cfg.type)}>
              <Text style={styles.typeBtnIcon}>{cfg.icon}</Text>
              <Text style={[styles.typeBtnLabel, hasReport && styles.typeBtnLabelActive]}>
                {cfg.label}
              </Text>
              {hasReport && <View style={styles.activeDot} />}
            </Pressable>
          );
        })}
      </View>

      {/* Active report pills */}
      {visiblePills.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsRow}>
          {visiblePills.map((r, i) => (
            <View key={`${r.reportType}-${r.value}-${i}`} style={styles.pill}>
              <Text style={styles.pillIcon}>{REPORT_TYPE_ICONS[r.reportType]}</Text>
              <Text style={styles.pillText}>
                {r.value}{r.count > 1 ? ` (${r.count})` : ''}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      <QuickReportSheet
        visible={!!activeType}
        config={activeConfig}
        myCurrentValue={activeType ? myLast[activeType] : null}
        onClose={() => setActiveType(null)}
        onSubmit={handleSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:          { gap: 14 },
  sectionTitle:       { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  buttonRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeBtn:            { alignItems: 'center', gap: 6, backgroundColor: COLORS.card, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.border, minWidth: 72 },
  typeBtnActive:      { borderColor: COLORS.primary + '80', backgroundColor: COLORS.primary + '12' },
  typeBtnCooldown:    { opacity: 0.6 },
  typeBtnPressed:     { opacity: 0.75, transform: [{ scale: 0.97 }] },
  typeBtnIcon:        { fontSize: 20 },
  typeBtnLabel:       { color: COLORS.textSec, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  typeBtnLabelActive: { color: COLORS.primary },
  activeDot:          { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary, position: 'absolute', top: 8, right: 8 },
  pillsRow:           { gap: 8, paddingVertical: 2 },
  pill:               { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.surface, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: COLORS.border },
  pillIcon:           { fontSize: 13 },
  pillText:           { color: COLORS.textSec, fontSize: 13, fontWeight: '500' },
});
