import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/crowdColors';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/themes';
import { REPORT_TYPE_ICONS } from '@/utils/quickReportConfig';
import type { AggregatedReport, ReportType } from '@/hooks/useQuickReports';
import type { QuickReportConfig } from '@/utils/quickReportConfig';

interface Props {
  configs: QuickReportConfig[];
  aggregated: AggregatedReport[];
  myLast: Record<ReportType, string | null>;
  cooldownFor: (type: ReportType) => number;
  onSelectType: (cfg: QuickReportConfig) => void;
}

export default function QuickReportsSection({
  configs,
  aggregated,
  myLast,
  cooldownFor,
  onSelectType,
}: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const configTypes = new Set(configs.map(c => c.type));
  const visiblePills = aggregated.filter(r => configTypes.has(r.reportType));

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Quick Reports</Text>

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
              onPress={() => onSelectType(cfg)}>
              <Text style={styles.typeBtnIcon}>{cfg.icon}</Text>
              <Text style={[styles.typeBtnLabel, hasReport && styles.typeBtnLabelActive]}>
                {cfg.label}
              </Text>
              {hasReport && <View style={styles.activeDot} />}
            </Pressable>
          );
        })}
      </View>

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
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    container:          { gap: 14 },
    sectionTitle:       { color: c.text, fontSize: 18, fontWeight: '700' },
    buttonRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    typeBtn:            { alignItems: 'center', gap: 6, backgroundColor: c.card, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 12, borderWidth: 1, borderColor: c.border, minWidth: 72 },
    typeBtnActive:      { borderColor: COLORS.primary + '80', backgroundColor: COLORS.primary + '12' },
    typeBtnCooldown:    { opacity: 0.6 },
    typeBtnPressed:     { opacity: 0.75, transform: [{ scale: 0.97 }] },
    typeBtnIcon:        { fontSize: 20 },
    typeBtnLabel:       { color: c.text, fontSize: 11, fontWeight: '600', textAlign: 'center' },
    typeBtnLabelActive: { color: COLORS.primary },
    activeDot:          { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary, position: 'absolute', top: 8, right: 8 },
    pillsRow:           { gap: 8, paddingVertical: 2 },
    pill:               { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: c.surface, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: c.border },
    pillIcon:           { fontSize: 13 },
    pillText:           { color: c.textSec, fontSize: 13, fontWeight: '500' },
  });
}
