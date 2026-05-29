import React, { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform,
  Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { COLORS } from '@/constants/crowdColors';

interface Props {
  visible: boolean;
  reviewerName: string;
  existingResponse?: string;
  onClose: () => void;
  onSubmit: (content: string) => Promise<string | null>;
}

export default function OwnerResponseModal({ visible, reviewerName, existingResponse, onClose, onSubmit }: Props) {
  const [content, setContent]   = useState(existingResponse ?? '');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSubmit() {
    if (!content.trim()) { setError('Please write a response.'); return; }
    setLoading(true); setError(null);
    const err = await onSubmit(content.trim());
    setLoading(false);
    if (err) setError(err);
    else onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12}><Text style={styles.cancel}>Cancel</Text></Pressable>
          <Text style={styles.title}>{existingResponse ? 'Edit Response' : 'Respond as Owner'}</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.body}>
          <Text style={styles.sub}>Replying to {reviewerName}'s review</Text>
          <TextInput
            style={styles.input}
            placeholder="Thank you for your feedback..."
            placeholderTextColor={COLORS.textMuted}
            value={content}
            onChangeText={c => { setContent(c); setError(null); }}
            multiline
            maxLength={400}
            autoFocus
          />
          <Text style={styles.count}>{content.length}/400</Text>
          {error && <Text style={styles.error}>⚠️  {error}</Text>}
          <Pressable
            style={[styles.submitBtn, !content.trim() && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={loading || !content.trim()}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitTxt}>{existingResponse ? 'Update Response' : 'Post Response'}</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex:           { flex: 1, backgroundColor: COLORS.surface },
  handle:         { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  cancel:         { color: COLORS.primary, fontSize: 16 },
  title:          { color: COLORS.text, fontSize: 17, fontWeight: '600' },
  body:           { padding: 20, gap: 12 },
  sub:            { color: COLORS.textMuted, fontSize: 13 },
  input:          { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.primary, borderRadius: 14, padding: 14, color: COLORS.text, fontSize: 15, minHeight: 120, textAlignVertical: 'top' },
  count:          { color: COLORS.textMuted, fontSize: 11, textAlign: 'right', marginTop: -6 },
  error:          { color: '#EF4444', fontSize: 13 },
  submitBtn:      { backgroundColor: COLORS.primary, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 4 },
  submitDisabled: { opacity: 0.45 },
  submitTxt:      { color: '#fff', fontSize: 16, fontWeight: '700' },
});
