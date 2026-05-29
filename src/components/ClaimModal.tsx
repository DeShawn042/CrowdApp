import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator, Image, KeyboardAvoidingView, Modal,
  Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { COLORS } from '@/constants/crowdColors';
import { domainsMatch, extractDomain, fetchBusinessWebsite } from '@/utils/placesApi';

type DomainState = 'idle' | 'checking' | 'match' | 'no_match' | 'no_website';

const ROLES = ['Owner', 'Manager', 'Authorized Representative'];

interface Props {
  visible:         boolean;
  locationName:    string;
  locationAddress: string;
  onClose:         () => void;
  onSubmit:        (name: string, email: string, role: string, docUri?: string) => Promise<string | null>;
}

export default function ClaimModal({ visible, locationName, locationAddress, onClose, onSubmit }: Props) {
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [role, setRole]       = useState('');
  const [docAsset, setDocAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [domainState, setDomainState] = useState<DomainState>('idle');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  function reset() {
    setName(''); setEmail(''); setRole('');
    setDocAsset(null); setDomainState('idle');
    setError(null);
  }

  async function checkDomain() {
    const emailDomain = extractDomain(email.trim());
    if (!emailDomain) { setDomainState('idle'); return; }
    setDomainState('checking');
    const website     = await fetchBusinessWebsite(locationName, locationAddress);
    const siteDomain  = website ? extractDomain(website) : null;
    if (!siteDomain) { setDomainState('no_website'); return; }
    setDomainState(domainsMatch(emailDomain, siteDomain) ? 'match' : 'no_match');
  }

  async function pickDoc() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.9,
    });
    if (!result.canceled) setDocAsset(result.assets[0]);
  }

  async function takeDoc() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { setError('Camera permission required.'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
    if (!result.canceled) setDocAsset(result.assets[0]);
  }

  const needsDoc   = domainState === 'no_match' || domainState === 'no_website';
  const canSubmit  = !!name.trim() && !!email.includes('@') && !!role &&
                     domainState !== 'idle' && domainState !== 'checking' &&
                     (!needsDoc || !!docAsset);

  function submitLabel() {
    if (domainState === 'checking') return 'Checking domain…';
    if (domainState === 'match')    return 'Submit — Auto-verify';
    if (needsDoc && !docAsset)      return 'Upload proof to continue';
    return 'Submit for Admin Review';
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true); setError(null);
    const err = await onSubmit(name.trim(), email.trim(), role, docAsset?.uri);
    setLoading(false);
    if (err) setError(err);
    else { reset(); onClose(); }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Pressable onPress={() => { reset(); onClose(); }} hitSlop={12}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
          <Text style={styles.title}>Claim Business</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {/* Location */}
          <View>
            <Text style={styles.sub}>Submitting a claim for</Text>
            <Text style={styles.locName}>{locationName}</Text>
          </View>

          {/* Name */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Full name</Text>
            <TextInput
              style={styles.input}
              placeholder="Jane Smith"
              placeholderTextColor={COLORS.textMuted}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Email + domain check */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Business email</Text>
            <TextInput
              style={[styles.input, domainState === 'match' && styles.inputMatch, needsDoc && styles.inputWarn]}
              placeholder="you@yourbusiness.com"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={t => { setEmail(t); setDomainState('idle'); }}
              keyboardType="email-address"
              autoCapitalize="none"
              onBlur={checkDomain}
              returnKeyType="next"
            />
            <DomainBadge state={domainState} />
          </View>

          {/* Role */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Your role</Text>
            <View style={styles.roleRow}>
              {ROLES.map(r => (
                <Pressable
                  key={r}
                  style={[styles.chip, role === r && styles.chipActive]}
                  onPress={() => setRole(r)}>
                  <Text style={[styles.chipTxt, role === r && styles.chipTxtActive]}>{r}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Document upload — only when domain doesn't match */}
          {needsDoc && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Proof of Ownership</Text>
              <Text style={styles.docNote}>
                Your email domain doesn't match the business website.
                Please upload your business license, official letterhead, or a utility bill showing the business name.
              </Text>
              {docAsset ? (
                <View style={styles.docPreview}>
                  <Image source={{ uri: docAsset.uri }} style={styles.docThumb} resizeMode="cover" />
                  <View style={styles.docInfo}>
                    <Text style={styles.docReady}>✓ Document attached</Text>
                    <Pressable onPress={() => setDocAsset(null)}>
                      <Text style={styles.docRemove}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={styles.docBtns}>
                  <Pressable style={styles.docBtn} onPress={pickDoc}>
                    <Text style={styles.docBtnIcon}>🖼️</Text>
                    <Text style={styles.docBtnTxt}>Choose from gallery</Text>
                  </Pressable>
                  <Pressable style={styles.docBtn} onPress={takeDoc}>
                    <Text style={styles.docBtnIcon}>📷</Text>
                    <Text style={styles.docBtnTxt}>Take a photo</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}

          {/* Error */}
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorTxt}>⚠️  {error}</Text>
            </View>
          )}

          {/* Submit */}
          <Pressable
            style={[styles.submitBtn, !canSubmit && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={loading || !canSubmit}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitTxt}>{submitLabel()}</Text>}
          </Pressable>

          <Text style={styles.legal}>
            By submitting, you confirm you are authorized to manage this business listing.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function DomainBadge({ state }: { state: DomainState }) {
  if (state === 'idle') return null;
  if (state === 'checking') {
    return (
      <View style={[badge.pill, badge.neutral]}>
        <ActivityIndicator size="small" color={COLORS.textMuted} style={{ transform: [{ scale: 0.7 }] }} />
        <Text style={[badge.txt, { color: COLORS.textMuted }]}>Checking domain…</Text>
      </View>
    );
  }
  if (state === 'match') {
    return (
      <View style={[badge.pill, badge.green]}>
        <Text style={[badge.txt, badge.greenTxt]}>✓ Email domain matches — you'll be automatically verified</Text>
      </View>
    );
  }
  if (state === 'no_match') {
    return (
      <View style={[badge.pill, badge.amber]}>
        <Text style={[badge.txt, badge.amberTxt]}>⚠ Domain doesn't match business website — proof of ownership required</Text>
      </View>
    );
  }
  // no_website
  return (
    <View style={[badge.pill, badge.amber]}>
      <Text style={[badge.txt, badge.amberTxt]}>ℹ No website found on Google Places — proof of ownership required</Text>
    </View>
  );
}

const badge = StyleSheet.create({
  pill:     { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginTop: 6 },
  neutral:  { backgroundColor: COLORS.surface },
  green:    { backgroundColor: '#22C55E18', borderWidth: 1, borderColor: '#22C55E40' },
  amber:    { backgroundColor: '#F59E0B18', borderWidth: 1, borderColor: '#F59E0B40' },
  txt:      { fontSize: 12, lineHeight: 17, flex: 1 },
  greenTxt: { color: '#22C55E' },
  amberTxt: { color: '#F59E0B' },
});

const styles = StyleSheet.create({
  flex:        { flex: 1, backgroundColor: COLORS.surface },
  handle:      { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  cancel:      { color: COLORS.primary, fontSize: 16 },
  title:       { color: COLORS.text, fontSize: 17, fontWeight: '600' },
  body:        { padding: 20, gap: 20, paddingBottom: 60 },
  sub:         { color: COLORS.textMuted, fontSize: 13 },
  locName:     { color: COLORS.text, fontSize: 20, fontWeight: '700', marginTop: 2 },
  field:       { gap: 8 },
  fieldLabel:  { color: COLORS.textSec, fontSize: 14, fontWeight: '600' },
  input:       { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 14, color: COLORS.text, fontSize: 15 },
  inputMatch:  { borderColor: '#22C55E' },
  inputWarn:   { borderColor: '#F59E0B' },
  roleRow:     { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  chipActive:  { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipTxt:     { color: COLORS.textSec, fontSize: 13, fontWeight: '500' },
  chipTxtActive: { color: '#fff' },
  docNote:     { color: COLORS.textSec, fontSize: 13, lineHeight: 19 },
  docPreview:  { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: COLORS.card, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#22C55E40' },
  docThumb:    { width: 64, height: 64, borderRadius: 10, backgroundColor: COLORS.surface },
  docInfo:     { flex: 1, gap: 6 },
  docReady:    { color: '#22C55E', fontSize: 14, fontWeight: '600' },
  docRemove:   { color: COLORS.primary, fontSize: 13 },
  docBtns:     { gap: 10 },
  docBtn:      { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed' },
  docBtnIcon:  { fontSize: 22 },
  docBtnTxt:   { color: COLORS.textSec, fontSize: 14, fontWeight: '500' },
  errorBanner: { backgroundColor: '#EF444418', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#EF444460' },
  errorTxt:    { color: '#EF4444', fontSize: 13 },
  submitBtn:   { backgroundColor: COLORS.primary, borderRadius: 14, padding: 16, alignItems: 'center' },
  submitDisabled: { opacity: 0.45 },
  submitTxt:   { color: '#fff', fontSize: 16, fontWeight: '700' },
  legal:       { color: COLORS.textMuted, fontSize: 11, textAlign: 'center', lineHeight: 16 },
});
