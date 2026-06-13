import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/crowdColors';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/themes';
import type { ActiveDestination } from '@/hooks/useHeadingThere';

interface Props {
  destination: ActiveDestination;
  onPress: () => void;
  onDismiss: () => void;
}

function LetterAvatar({ name, colors }: { name: string; colors: AppColors }) {
  const letter = name.trim()[0]?.toUpperCase() ?? '?';
  return (
    <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: COLORS.primary + '25', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 22, color: COLORS.primary, fontWeight: '700' }}>{letter}</Text>
    </View>
  );
}

function useCountdown(expiresAt: string): string {
  const [label, setLabel] = useState(() => getLabel(expiresAt));

  useEffect(() => {
    setLabel(getLabel(expiresAt));
    const id = setInterval(() => setLabel(getLabel(expiresAt)), 30_000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return label;
}

function getLabel(expiresAt: string): string {
  const msLeft = new Date(expiresAt).getTime() - Date.now();
  if (msLeft <= 0) return 'Expiring soon';
  const totalSeconds = Math.floor(msLeft / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 1) return 'Expiring soon';
  if (totalMinutes < 60) return `Active for ${totalMinutes} more minute${totalMinutes !== 1 ? 's' : ''}`;
  const hours = Math.floor(totalMinutes / 60);
  return `Active for ${hours} more hour${hours !== 1 ? 's' : ''}`;
}

export default function HeadingThereCard({ destination, onPress, onDismiss }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const expiryLabel = useCountdown(destination.expiresAt);

  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow}>
        <Text style={styles.sectionLabel}>🚗  Heading There</Text>
        <Pressable onPress={onDismiss} hitSlop={10} style={styles.dismissBtn}>
          <Text style={styles.dismissText}>✕ Remove</Text>
        </Pressable>
      </View>

      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={onPress}>
        {destination.placeImage ? (
          <Image source={{ uri: destination.placeImage }} style={styles.image} />
        ) : (
          <LetterAvatar name={destination.placeName} colors={colors} />
        )}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{destination.placeName}</Text>
          {destination.address ? (
            <Text style={styles.address} numberOfLines={1}>{destination.address}</Text>
          ) : null}
          <Text style={styles.expiry}>{expiryLabel}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    wrapper:      { gap: 10 },
    labelRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sectionLabel: { color: c.text, fontSize: 18, fontWeight: '700' },
    dismissBtn:   { paddingVertical: 2, paddingHorizontal: 4 },
    dismissText:  { color: c.textMuted, fontSize: 12, fontWeight: '600' },
    card:         { backgroundColor: c.card, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: COLORS.primary + '50' },
    cardPressed:  { opacity: 0.75, transform: [{ scale: 0.98 }] },
    image:        { width: 48, height: 48, borderRadius: 12, backgroundColor: c.surface },
    info:         { flex: 1, gap: 3 },
    name:         { color: c.text, fontSize: 16, fontWeight: '600' },
    address:      { color: c.textSec, fontSize: 12 },
    expiry:       { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
    chevron:      { color: c.textMuted, fontSize: 20 },
  });
}
