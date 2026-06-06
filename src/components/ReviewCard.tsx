import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Review } from '@/data/mockData';
import { COLORS } from '@/constants/crowdColors';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/constants/themes';
import { formatDate } from '@/utils/crowdUtils';
import StarRating from './StarRating';

interface Props {
  review: Review;
  isOwn?: boolean;
  isVerifiedVisit?: boolean;
  isAdmin?: boolean;
  reviewedLabel?: string;          // e.g. "Reviewed March 2026"
  onFlag?: (id: string) => void;
}

export default function ReviewCard({
  review,
  isOwn = false,
  isVerifiedVisit = false,
  isAdmin = false,
  reviewedLabel,
  onFlag,
}: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [showTooltip, setShowTooltip] = useState(false);

  const name = review.displayName ?? (review.userName || null) ?? 'Prescout User';
  const initials = (name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()) || 'P';

  // Auto-hidden review (3+ flags) — show placeholder unless admin
  if (review.isHidden && !isAdmin) {
    return (
      <View style={[styles.card, { borderBottomColor: colors.border }]}>
        <View style={styles.flaggedBox}>
          <Text style={styles.flaggedIcon}>🚩</Text>
          <Text style={styles.flaggedText}>
            This review has been flagged and is under review by our team.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, { borderBottomColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.avatar, isOwn && styles.avatarOwn]}>
          <Text style={[styles.avatarText, isOwn && styles.avatarTextOwn]}>{initials}</Text>
        </View>

        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.text }]}>
              {name}{isOwn ? ' (you)' : ''}
            </Text>

            {/* Verified Visit badge */}
            {isVerifiedVisit && (
              <Pressable
                style={styles.verifiedBadge}
                onPress={() => setShowTooltip(v => !v)}>
                <Text style={styles.verifiedText}>✅ Verified Visit</Text>
              </Pressable>
            )}
          </View>

          {/* Verified Visit tooltip */}
          {showTooltip && (
            <View style={[styles.tooltip, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.tooltipText, { color: colors.textSec }]}>
                This reviewer has submitted a crowd report at this location.
              </Text>
            </View>
          )}

          <StarRating rating={review.rating} size={13} />
        </View>

        <View style={styles.metaCol}>
          <Text style={styles.date}>{formatDate(review.updatedAt || review.createdAt)}</Text>
          {/* Admin flag count */}
          {isAdmin && review.flagCount > 0 && (
            <Text style={styles.flagCount}>🚩 {review.flagCount}</Text>
          )}
        </View>
      </View>

      {/* Reviewed period label */}
      {reviewedLabel && (
        <Text style={[styles.reviewedLabel, { color: colors.textMuted }]}>{reviewedLabel}</Text>
      )}

      <Text style={[styles.content, { color: colors.textSec }]}>{review.content}</Text>

      {/* Owner response */}
      {review.ownerResponse && (
        <View style={styles.ownerResponse}>
          <View style={styles.ownerBadge}>
            <Text style={styles.ownerBadgeTxt}>✓ Owner</Text>
          </View>
          <Text style={styles.ownerResponseTxt}>{review.ownerResponse}</Text>
        </View>
      )}

      {/* Photos */}
      {review.photos.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photosRow}>
          {review.photos.map((url, i) => (
            <Image key={i} source={{ uri: url }} style={styles.photo} resizeMode="cover" />
          ))}
        </ScrollView>
      )}

      {/* Flag button — hidden for own review */}
      {!isOwn && onFlag && (
        <Pressable
          style={({ pressed }) => [styles.flagBtn, pressed && { opacity: 0.6 }]}
          onPress={() => onFlag(review.id)}>
          <Text style={styles.flagBtnText}>🚩 Flag</Text>
        </Pressable>
      )}
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    card:          { paddingVertical: 16, borderBottomWidth: 1, gap: 10 },
    header:        { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    avatar:        { width: 36, height: 36, borderRadius: 18, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
    avatarOwn:     { backgroundColor: COLORS.primary + '30' },
    avatarText:    { color: c.textSec, fontSize: 13, fontWeight: '700' },
    avatarTextOwn: { color: COLORS.primary },
    headerInfo:    { flex: 1, gap: 4 },
    nameRow:       { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
    name:          { fontSize: 14, fontWeight: '600' },
    metaCol:       { alignItems: 'flex-end', gap: 4 },
    date:          { color: c.textMuted, fontSize: 12 },
    flagCount:     { color: COLORS.packed, fontSize: 11, fontWeight: '700' },
    reviewedLabel: { fontSize: 11, fontStyle: 'italic' },
    content:       { fontSize: 14, lineHeight: 20 },

    // Verified visit
    verifiedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#22C55E18', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: '#22C55E50' },
    verifiedText:  { color: '#16A34A', fontSize: 11, fontWeight: '600' },
    tooltip:       { borderRadius: 10, padding: 10, borderWidth: 1, marginTop: 2 },
    tooltipText:   { fontSize: 12, lineHeight: 16 },

    // Photos
    photosRow:     { paddingBottom: 4, gap: 8 },
    photo:         { width: 88, height: 88, borderRadius: 12, backgroundColor: c.surface },

    // Owner response
    ownerResponse: { backgroundColor: COLORS.primary + '12', borderRadius: 14, padding: 12, gap: 6, borderLeftWidth: 3, borderLeftColor: COLORS.primary },
    ownerBadge:    { alignSelf: 'flex-start', backgroundColor: COLORS.primary + '25', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 14 },
    ownerBadgeTxt: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
    ownerResponseTxt: { color: c.textSec, fontSize: 14, lineHeight: 20 },

    // Flag
    flagBtn:       { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: c.border },
    flagBtnText:   { color: c.textMuted, fontSize: 11, fontWeight: '600' },

    // Hidden/flagged
    flaggedBox:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
    flaggedIcon:   { fontSize: 16 },
    flaggedText:   { flex: 1, color: c.textMuted, fontSize: 13, fontStyle: 'italic' },
  });
}
