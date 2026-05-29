import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Review } from '@/data/mockData';
import { COLORS } from '@/constants/crowdColors';
import { formatDate } from '@/utils/crowdUtils';
import StarRating from './StarRating';

interface Props {
  review: Review;
  isOwn?: boolean;
}

export default function ReviewCard({ review, isOwn = false }: Props) {
  const initials = review.userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.avatar, isOwn && styles.avatarOwn]}>
          <Text style={[styles.avatarText, isOwn && styles.avatarTextOwn]}>{initials}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.name}>
            {review.userName}{isOwn ? ' (you)' : ''}
          </Text>
          <StarRating rating={review.rating} size={13} />
        </View>
        <Text style={styles.date}>{formatDate(review.updatedAt || review.createdAt)}</Text>
      </View>
      <Text style={styles.content}>{review.content}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOwn: { backgroundColor: '#7C6FFF30' },
  avatarText: { color: COLORS.textSec, fontSize: 13, fontWeight: '700' },
  avatarTextOwn: { color: '#7C6FFF' },
  headerInfo: { flex: 1, gap: 3 },
  name: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  date: { color: COLORS.textMuted, fontSize: 11 },
  content: { color: COLORS.textSec, fontSize: 14, lineHeight: 20 },
  photosRow: { paddingBottom: 4, gap: 8 },
  photo: { width: 88, height: 88, borderRadius: 10, backgroundColor: COLORS.surface },
});
