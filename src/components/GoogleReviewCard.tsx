import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { GoogleReview } from '@/data/mockData';
import { COLORS } from '@/constants/crowdColors';
import StarRating from './StarRating';

interface Props {
  review: GoogleReview;
}

export default function GoogleReviewCard({ review }: Props) {
  const initials = review.authorName
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {review.authorPhotoUri ? (
          <Image source={{ uri: review.authorPhotoUri }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{review.authorName}</Text>
          <StarRating rating={review.rating} size={12} />
        </View>
        <Text style={styles.relativeTime}>{review.relativeTime}</Text>
      </View>
      {!!review.text && (
        <Text style={styles.text} numberOfLines={4}>{review.text}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.surface,
  },
  avatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.google + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: COLORS.google, fontSize: 12, fontWeight: '700' },
  headerInfo: { flex: 1, gap: 3 },
  name: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  relativeTime: { color: COLORS.textMuted, fontSize: 12 },
  text: { color: COLORS.textSec, fontSize: 14, lineHeight: 20 },
});
