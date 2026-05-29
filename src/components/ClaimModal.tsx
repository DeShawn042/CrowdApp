import React, { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform,
  Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { COLORS } from '@/constants/crowdColors';

interface Props {
  visible: boolean;
  locationName: string;
  onClose: () => void;
  onSubmit: (name: string, email: string, role: string) => Promise<string | null>;
}

const ROLES = ['Owner', 'Manager', 'Authorized Representative'];

export default function ClaimModal({ visible, locationName, onClose, onSubmit }: Props) {
  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleSubmit() {
    if (!name.trim() || !email.trim() || !role) { setError('Please fill in all fields.'); return; }
    if (!email.includes('@')) { setError('Please enter a valid email address.'); return; }
    setLoading(true); setError(null);
    const err = await onSubmit(name.trim(), email.trim(), role);
    setLoading(false);
    if (err) setError(err);
    else { setName(''); setEmail(''); setRole(''); onClose(); }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12}><Text style={styles.cancel}>Cancel</Text></Pressable>
          <Text style={styles.title}>Claim Business</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.body}>
          <Text style={styles.sub}>Submitting a claim for</Text>
          <Text style={styles.locName}>{locationName}</Text>
          <Text style={styles.note}>
            Our team will review your request. You'll receive a verified owner badge after approval.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Full name"
            placeholderTextColor={COLORS.textMuted}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="Business email"
            placeholderTextColor={COLORS.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.roleLabel}>Your role</Text>
          <View style={styles.roleRow}>
            {ROLES.map(r => (
              <Pressable
                key={r}
                style={[styles.roleChip, role === r && styles.roleChipActive]}
                onPress={() => setRole(r)}>
                <Text style={[styles.roleChipTxt, role === r && styles.roleChipTxtActive]}>{r}</Text>
              </Pressable>
            ))}
          </View>

          {error && <Text style={styles.error}>⚠️  {error}</Text>}

          <Pressable
            style={[styles.submitBtn, (!name.trim() || !email.trim() || !role) && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={loading || !name.trim() || !email.trim() || !role}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitTxt}>Submit Claim</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex:              { flex: 1, backgroundColor: COLORS.surface },
  handle:            { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  header:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  cancel:            { color: COLORS.primary, fontSize: 16 },
  title:             { color: COLORS.text, fontSize: 17, fontWeight: '600' },
  body:              { padding: 20, gap: 14 },
  sub:               { color: COLORS.textMuted, fontSize: 13 },
  locName:           { color: COLORS.text, fontSize: 20, fontWeight: '700', marginTop: -8 },
  note:              { color: COLORS.textSec, fontSize: 13, lineHeight: 19, backgroundColor: COLORS.card, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  input:             { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 14, color: COLORS.text, fontSize: 15 },
  roleLabel:         { color: COLORS.textSec, fontSize: 14, fontWeight: '600' },
  roleRow:           { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  roleChip:          { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  roleChipActive:    { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  roleChipTxt:       { color: COLORS.textSec, fontSize: 13, fontWeight: '500' },
  roleChipTxtActive: { color: '#fff' },
  error:             { color: '#EF4444', fontSize: 13 },
  submitBtn:         { backgroundColor: COLORS.primary, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 4 },
  submitDisabled:    { opacity: 0.45 },
  submitTxt:         { color: '#fff', fontSize: 16, fontWeight: '700' },
});
