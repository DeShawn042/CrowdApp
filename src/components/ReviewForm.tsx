import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Review } from '@/data/mockData';
import { COLORS } from '@/constants/crowdColors';
import StarRating from './StarRating';

const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

interface Props {
  visible: boolean;
  onClose: () => void;
  existingReview?: Review | null;
  onSubmit: (
    rating: number,
    content: string,
    newPhotos: ImagePicker.ImagePickerAsset[],
    keptPhotoUrls: string[]
  ) => Promise<string | null>;
}

export default function ReviewForm({ visible, onClose, existingReview, onSubmit }: Props) {
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [keptUrls, setKeptUrls] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (visible) {
      setRating(existingReview?.rating ?? 0);
      setContent(existingReview?.content ?? '');
      setKeptUrls(existingReview?.photos ?? []);
      setNewPhotos([]);
      setError(null);
    }
  }, [visible]);

  const totalPhotos = keptUrls.length + newPhotos.length;
  const canAddPhoto  = totalPhotos < 3;

  async function pickFromGallery() {
    if (!canAddPhoto) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) setNewPhotos(p => [...p, result.assets[0]]);
  }

  async function takeWithCamera() {
    if (!canAddPhoto) return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { setError('Camera permission required.'); return; }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) setNewPhotos(p => [...p, result.assets[0]]);
  }

  async function handleSubmit() {
    if (rating === 0) { setError('Please select a star rating.'); return; }
    if (!content.trim()) { setError('Please write a review.'); return; }
    setLoading(true);
    setError(null);
    const err = await onSubmit(rating, content.trim(), newPhotos, keptUrls);
    setLoading(false);
    if (err) setError(err);
    else onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
          <Text style={styles.title}>{existingReview ? 'Edit Review' : 'Write a Review'}</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {/* Stars */}
          <View style={styles.section}>
            <Text style={styles.label}>Your rating</Text>
            <StarRating rating={rating} size={42} interactive onChange={setRating} />
            {rating > 0 && <Text style={styles.ratingHint}>{RATING_LABELS[rating]}</Text>}
          </View>

          {/* Text */}
          <View style={styles.section}>
            <Text style={styles.label}>Your review</Text>
            <TextInput
              style={[styles.input, focused && styles.inputFocused]}
              value={content}
              onChangeText={setContent}
              placeholder="What was your experience? Share the details..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              maxLength={400}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
            <Text style={styles.charCount}>{content.length}/400</Text>
          </View>

          {/* Photos */}
          <View style={styles.section}>
            <Text style={styles.label}>Photos ({totalPhotos}/3)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {/* Existing kept photos */}
              {keptUrls.map((url, i) => (
                <View key={`k${i}`} style={styles.thumb}>
                  <Image source={{ uri: url }} style={styles.thumbImg} />
                  <Pressable
                    style={styles.removeBtn}
                    onPress={() => setKeptUrls(p => p.filter((_, j) => j !== i))}>
                    <Text style={styles.removeTxt}>✕</Text>
                  </Pressable>
                </View>
              ))}
              {/* New photos */}
              {newPhotos.map((a, i) => (
                <View key={`n${i}`} style={styles.thumb}>
                  <Image source={{ uri: a.uri }} style={styles.thumbImg} />
                  <Pressable
                    style={styles.removeBtn}
                    onPress={() => setNewPhotos(p => p.filter((_, j) => j !== i))}>
                    <Text style={styles.removeTxt}>✕</Text>
                  </Pressable>
                </View>
              ))}
              {/* Add buttons */}
              {canAddPhoto && (
                <>
                  <Pressable style={styles.addBtn} onPress={pickFromGallery}>
                    <Text style={styles.addIcon}>🖼️</Text>
                    <Text style={styles.addTxt}>Gallery</Text>
                  </Pressable>
                  <Pressable style={styles.addBtn} onPress={takeWithCamera}>
                    <Text style={styles.addIcon}>📷</Text>
                    <Text style={styles.addTxt}>Camera</Text>
                  </Pressable>
                </>
              )}
            </ScrollView>
          </View>

          {/* Error */}
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>⚠️  {error}</Text>
            </View>
          )}

          {/* Submit */}
          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              (rating === 0 || !content.trim()) && styles.submitDisabled,
              pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
            ]}
            onPress={handleSubmit}
            disabled={loading || rating === 0 || !content.trim()}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitTxt}>{existingReview ? 'Update Review' : 'Post Review'}</Text>
            }
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex:        { flex: 1, backgroundColor: COLORS.surface },
  handle:      { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  cancel:      { color: COLORS.primary, fontSize: 16 },
  title:       { color: COLORS.text, fontSize: 17, fontWeight: '600' },
  body:        { padding: 20, gap: 28, paddingBottom: 60 },
  section:     { gap: 10 },
  label:       { color: COLORS.textSec, fontSize: 14, fontWeight: '600' },
  ratingHint:  { color: COLORS.textMuted, fontSize: 13, marginTop: -4 },
  input: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 14, padding: 14, color: COLORS.text, fontSize: 15,
    minHeight: 120, textAlignVertical: 'top',
  },
  inputFocused: { borderColor: COLORS.primary },
  charCount:   { color: COLORS.textMuted, fontSize: 11, textAlign: 'right', marginTop: -4 },
  thumb:       { position: 'relative', marginRight: 10 },
  thumbImg:    { width: 80, height: 80, borderRadius: 10, backgroundColor: COLORS.surface },
  removeBtn:   { position: 'absolute', top: -6, right: -6, backgroundColor: COLORS.text, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  removeTxt:   { color: COLORS.bg, fontSize: 10, fontWeight: '700' },
  addBtn:      { width: 80, height: 80, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginRight: 10, gap: 4 },
  addIcon:     { fontSize: 22 },
  addTxt:      { color: COLORS.textMuted, fontSize: 10 },
  errorBanner: { backgroundColor: '#EF444420', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#EF4444' },
  errorText:   { color: '#EF4444', fontSize: 14 },
  submitBtn:   { backgroundColor: COLORS.primary, borderRadius: 16, padding: 18, alignItems: 'center' },
  submitDisabled: { opacity: 0.45 },
  submitTxt:   { color: '#fff', fontSize: 17, fontWeight: '700' },
});
