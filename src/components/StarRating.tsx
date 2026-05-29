import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native';

interface Props {
  rating: number;       // 0-5, decimals shown as rounded for display
  size?: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
}

export default function StarRating({ rating, size = 16, interactive = false, onChange }: Props) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map(star => {
        const filled = star <= Math.round(rating);
        if (interactive && onChange) {
          return (
            <Pressable key={star} onPress={() => onChange(star)} hitSlop={8}>
              <Text style={{ fontSize: size, color: filled ? '#F59E0B' : '#4A4A5A' }}>
                {filled ? '★' : '☆'}
              </Text>
            </Pressable>
          );
        }
        return (
          <Text key={star} style={{ fontSize: size, color: filled ? '#F59E0B' : '#4A4A5A' }}>
            {filled ? '★' : '☆'}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 2 },
});
