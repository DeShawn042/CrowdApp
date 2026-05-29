import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CrowdLevelBadge from '@/components/CrowdLevelBadge';
import { COLORS } from '@/constants/crowdColors';
import { useAppContext } from '@/context/AppContext';
import { CrowdLevel } from '@/data/mockData';
import { formatCooldown, useReportLimit } from '@/hooks/useReportLimit';
import { checkToxicity } from '@/utils/perspectiveApi';
import { CROWD_BG_COLORS, CROWD_COLORS, CROWD_EMOJIS, CROWD_LABELS } from '@/utils/crowdUtils';

const CROWD_OPTIONS: { level: CrowdLevel; description: string }[] = [
  { level: 'empty',    description: 'Basically no one here' },
  { level: 'light',    description: 'Few people, easy to move around' },
  { level: 'moderate', description: 'Some wait or a bit crowded' },
  { level: 'packed',   description: 'Very busy, long waits possible' },
];

export default function SubmitReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getLocationById, submitReport } = useAppContext();
  const location = getLocationById(id ?? '');

  const { canReport, cooldownSeconds, lastReportLevel, loading: limitLoading } =
    useReportLimit(id ?? '');

  const [selected, setSelected]           = useState<CrowdLevel | null>(null);
  const [comment, setComment]             = useState('');
  const [loading, setLoading]             = useState(false);
  const [commentFocused, setCommentFocused] = useState(false);
  const [profanityError, setProfanityError] = useState<string | null>(null);

  const isSameAsLast = !!selected && selected === lastReportLevel;
  const canSubmit    = !loading && !!selected && canReport && !isSameAsLast;

  async function handleSubmit() {
    if (!canSubmit || !id) return;

    // Profanity check on comment
    if (comment.trim()) {
      setLoading(true);
      const { flagged } = await checkToxicity(comment.trim());
      if (flagged) {
        setProfanityError('Please keep it clean — your comment was flagged before it could be submitted.');
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setProfanityError(null);
    await submitReport(id, selected!, comment.trim() || undefined);
    setLoading(false);
    router.back();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Report</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Location */}
          <View style={styles.locationRow}>
            <Text style={styles.atText}>Reporting at</Text>
            <Text style={styles.locationName} numberOfLines={1}>
              {location?.name ?? 'Unknown Location'}
            </Text>
          </View>

          {/* Cooldown banner */}
          {!limitLoading && !canReport && (
            <View style={styles.cooldownBanner}>
              <Text style={styles.cooldownTitle}>
                ⏱  Report again in  {formatCooldown(cooldownSeconds)}
              </Text>
              {lastReportLevel && (
                <Text style={styles.cooldownSub}>
                  Your last report here: {CROWD_LABELS[lastReportLevel]}
                </Text>
              )}
            </View>
          )}

          <Text style={styles.question}>How busy is it right now?</Text>

          {/* Crowd level options */}
          <View style={styles.optionList}>
            {CROWD_OPTIONS.map(({ level, description }) => {
              const isSelected  = selected === level;
              const isSame      = level === lastReportLevel && canReport;
              const color       = CROWD_COLORS[level];
              const bg          = CROWD_BG_COLORS[level];

              return (
                <Pressable
                  key={level}
                  style={({ pressed }) => [
                    styles.option,
                    isSelected && { borderColor: color, backgroundColor: bg },
                    pressed && styles.optionPressed,
                  ]}
                  onPress={() => { setSelected(level); setProfanityError(null); }}>
                  <View style={[styles.optionIcon, isSelected && { backgroundColor: color + '30' }]}>
                    <Text style={{ fontSize: 28 }}>{CROWD_EMOJIS[level]}</Text>
                  </View>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionLevel, isSelected && { color }]}>
                      {CROWD_LABELS[level]}
                    </Text>
                    <Text style={styles.optionDesc}>
                      {isSame ? '⚠️ Same as your last report here' : description}
                    </Text>
                  </View>
                  <View style={[styles.radio, isSelected && { borderColor: color }]}>
                    {isSelected && <View style={[styles.radioDot, { backgroundColor: color }]} />}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Comment */}
          <View style={styles.commentSection}>
            <Text style={styles.commentLabel}>Add a comment (optional)</Text>
            <TextInput
              style={[styles.commentInput, commentFocused && styles.commentInputFocused]}
              value={comment}
              onChangeText={t => { setComment(t); setProfanityError(null); }}
              placeholder='"e.g. All treadmills taken" or "Barely anyone here"'
              placeholderTextColor={COLORS.textMuted}
              multiline
              maxLength={150}
              onFocus={() => setCommentFocused(true)}
              onBlur={() => setCommentFocused(false)}
            />
            <Text style={styles.charCount}>{comment.length}/150</Text>
          </View>

          {/* Profanity error */}
          {profanityError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>⚠️  {profanityError}</Text>
            </View>
          )}

          {/* Submit */}
          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              !canSubmit && styles.submitBtnDisabled,
              canSubmit && selected && { backgroundColor: CROWD_COLORS[selected] },
              pressed && canSubmit && styles.submitBtnPressed,
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit || loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : !canReport ? (
              <Text style={styles.submitBtnText}>Come back in {formatCooldown(cooldownSeconds)}</Text>
            ) : isSameAsLast ? (
              <Text style={styles.submitBtnText}>Choose a different level to report</Text>
            ) : selected ? (
              <>
                <CrowdLevelBadge level={selected} size="sm" showEmoji={false} />
                <Text style={styles.submitBtnText}>Submit: {CROWD_LABELS[selected]}</Text>
              </>
            ) : (
              <Text style={styles.submitBtnText}>Select a crowd level</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:               { flex: 1, backgroundColor: COLORS.surface },
  flex:               { flex: 1 },
  handle:             { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  cancelText:         { color: COLORS.primary, fontSize: 16 },
  headerTitle:        { color: COLORS.text, fontSize: 17, fontWeight: '600' },
  scroll:             { flex: 1 },
  content:            { padding: 20, gap: 24, paddingBottom: 40 },
  locationRow:        { gap: 4 },
  atText:             { color: COLORS.textMuted, fontSize: 13 },
  locationName:       { color: COLORS.text, fontSize: 20, fontWeight: '700' },
  cooldownBanner:     { backgroundColor: '#F59E0B18', borderRadius: 14, padding: 14, gap: 4, borderWidth: 1, borderColor: '#F59E0B50' },
  cooldownTitle:      { color: '#F59E0B', fontSize: 15, fontWeight: '700' },
  cooldownSub:        { color: COLORS.textSec, fontSize: 13 },
  question:           { color: COLORS.textSec, fontSize: 16 },
  optionList:         { gap: 10 },
  option:             { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1.5, borderColor: COLORS.border },
  optionPressed:      { opacity: 0.85, transform: [{ scale: 0.99 }] },
  optionIcon:         { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface },
  optionText:         { flex: 1, gap: 3 },
  optionLevel:        { color: COLORS.text, fontSize: 17, fontWeight: '700' },
  optionDesc:         { color: COLORS.textMuted, fontSize: 12 },
  radio:              { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  radioDot:           { width: 10, height: 10, borderRadius: 5 },
  commentSection:     { gap: 8 },
  commentLabel:       { color: COLORS.textSec, fontSize: 14, fontWeight: '500' },
  commentInput:       { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 14, color: COLORS.text, fontSize: 15, minHeight: 88, textAlignVertical: 'top' },
  commentInputFocused: { borderColor: COLORS.primary },
  charCount:          { color: COLORS.textMuted, fontSize: 11, textAlign: 'right' },
  errorBanner:        { backgroundColor: '#EF444420', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#EF4444' },
  errorText:          { color: '#EF4444', fontSize: 14 },
  submitBtn:          { backgroundColor: COLORS.textMuted, borderRadius: 16, padding: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10 },
  submitBtnDisabled:  { opacity: 0.5 },
  submitBtnPressed:   { opacity: 0.85, transform: [{ scale: 0.99 }] },
  submitBtnText:      { color: '#fff', fontSize: 17, fontWeight: '700' },
});
