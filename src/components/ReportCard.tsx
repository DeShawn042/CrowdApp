import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Report } from '@/data/mockData';
import { COLORS } from '@/constants/crowdColors';
import { timeAgo } from '@/utils/crowdUtils';
import CrowdLevelBadge from './CrowdLevelBadge';

interface Props {
  report: Report;
}

export default function ReportCard({ report }: Props) {
  const initials = report.userName
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.initials}>{initials}</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name}>{report.userName}</Text>
          <Text style={styles.time}>{timeAgo(report.timestamp)}</Text>
        </View>
        <CrowdLevelBadge level={report.crowdLevel} size="sm" />
        {report.comment && (
          <Text style={styles.comment}>"{report.comment}"</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary + '50',
  },
  initials: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  time: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  comment: {
    color: COLORS.textSec,
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
});
