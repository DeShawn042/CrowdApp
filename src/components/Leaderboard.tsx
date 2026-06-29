import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { fetchLeaderboard, LeaderboardEntry } from '@/hooks/useGamification';
import type { AppColors } from '@/constants/themes';

export default function Leaderboard() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [top10,   setTop10]   = useState<LeaderboardEntry[]>([]);
  const [myEntry, setMyEntry] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard().then(({ top10, myEntry }) => {
      setTop10(top10);
      setMyEntry(myEntry);
      setLoading(false);
    });
  }, []);

  const showMyRow = myEntry && !top10.some(e => e.isCurrentUser);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>🏆 This Week's Top Scouts</Text>
      <Text style={styles.sub}>Resets every Monday</Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
      ) : top10.length === 0 ? (
        <Text style={styles.empty}>No reports this week yet — be the first!</Text>
      ) : (
        <>
          {top10.map(entry => (
            <EntryRow key={entry.userId} entry={entry} styles={styles} colors={colors} />
          ))}

          {showMyRow && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <EntryRow entry={myEntry!} styles={styles} colors={colors} />
            </>
          )}
        </>
      )}
    </View>
  );
}

function EntryRow({ entry, styles, colors }: { entry: LeaderboardEntry; styles: any; colors: AppColors }) {
  const initials = entry.displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const isMe = entry.isCurrentUser;
  return (
    <View style={[styles.row, isMe && { backgroundColor: colors.primary + '12', borderRadius: 10, marginHorizontal: -6, paddingHorizontal: 6 }]}>
      <Text style={[styles.rank, isMe && { color: colors.primary }]}>
        {entry.rank <= 3 ? ['🥇','🥈','🥉'][entry.rank - 1] : `#${entry.rank}`}
      </Text>
      <View style={[styles.avatar, { backgroundColor: isMe ? colors.primary + '30' : colors.surface }]}>
        <Text style={[styles.avatarTxt, { color: isMe ? colors.primary : colors.textMuted }]}>{initials}</Text>
      </View>
      <View style={styles.nameCol}>
        <Text style={[styles.name, { color: colors.text }, isMe && { fontWeight: '700' }]} numberOfLines={1}>
          {isMe ? 'You' : entry.displayName}
        </Text>
        <Text style={[styles.level, { color: colors.textMuted }]}>{entry.levelIcon} {entry.levelName}</Text>
      </View>
      <Text style={[styles.pts, { color: isMe ? colors.primary : colors.text }]}>
        {entry.weeklyPoints.toLocaleString()} pts
      </Text>
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 16, gap: 2,
    },
    title: { color: c.text, fontSize: 15, fontWeight: '700', marginBottom: 2 },
    sub:   { color: c.textMuted, fontSize: 11, marginBottom: 8 },
    empty: { color: c.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 12 },

    row:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, gap: 10 },
    rank:   { width: 28, fontSize: 16, textAlign: 'center', color: '#94A3B8' },
    avatar: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
    avatarTxt: { fontSize: 13, fontWeight: '700' },
    nameCol: { flex: 1, gap: 1 },
    name:    { fontSize: 13, fontWeight: '500' },
    level:   { fontSize: 10 },
    pts:     { fontSize: 13, fontWeight: '700' },
    divider: { height: 1, marginVertical: 4 },
  });
}
