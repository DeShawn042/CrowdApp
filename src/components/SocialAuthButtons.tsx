import React, { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/crowdColors';
import { useTheme } from '@/context/ThemeContext';

interface Props {
  onApple: () => Promise<void>;
  onGoogle: () => Promise<void>;
  disabled?: boolean;
}

export default function SocialAuthButtons({ onApple, onGoogle, disabled }: Props) {
  const { colors } = useTheme();
  const [appleLoading,  setAppleLoading]  = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const anyLoading = appleLoading || googleLoading || disabled;

  async function handleApple() {
    if (anyLoading) return;
    setAppleLoading(true);
    try { await onApple(); } finally { setAppleLoading(false); }
  }

  async function handleGoogle() {
    if (anyLoading) return;
    setGoogleLoading(true);
    try { await onGoogle(); } finally { setGoogleLoading(false); }
  }

  return (
    <View style={styles.container}>
      {/* ── or divider ── */}
      <View style={styles.dividerRow}>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        <Text style={[styles.dividerText, { color: colors.textMuted }]}>or</Text>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
      </View>

      {/* Apple Sign-In — iOS only, required for App Store */}
      {Platform.OS === 'ios' && (() => {
        // Lazy require keeps the module out of Android bundles
        let AppleBtn: any = null;
        try {
          const mod = require('expo-apple-authentication');
          AppleBtn = mod.AppleAuthenticationButton;
          const { AppleAuthenticationButtonType, AppleAuthenticationButtonStyle } = mod;
          if (appleLoading) {
            return (
              <View style={[styles.socialBtn, { backgroundColor: '#000', borderColor: '#000' }]}>
                <ActivityIndicator color="#fff" />
              </View>
            );
          }
          return (
            <AppleBtn
              buttonType={AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={14}
              style={styles.appleNativeBtn}
              onPress={handleApple}
            />
          );
        } catch { return null; }
      })()}

      {/* Google Sign-In */}
      <Pressable
        style={({ pressed }) => [
          styles.socialBtn,
          { backgroundColor: colors.card, borderColor: colors.border },
          (pressed || anyLoading) && { opacity: 0.7 },
        ]}
        onPress={handleGoogle}
        disabled={!!anyLoading}>
        {googleLoading ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : (
          <>
            <View style={styles.googleBadge}>
              <Text style={styles.googleBadgeText}>G</Text>
            </View>
            <Text style={[styles.socialBtnText, { color: colors.text }]}>Continue with Google</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { gap: 12 },
  dividerRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine:     { flex: 1, height: StyleSheet.hairlineWidth * 2 },
  dividerText:     { fontSize: 13, fontWeight: '500' },
  appleNativeBtn:  { height: 50 },
  socialBtn:       { height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 14, borderWidth: 1 },
  socialBtnText:   { fontSize: 15, fontWeight: '600' },
  googleBadge:     { width: 22, height: 22, borderRadius: 11, backgroundColor: '#4285F4', alignItems: 'center', justifyContent: 'center' },
  googleBadgeText: { color: '#fff', fontSize: 12, fontWeight: '900' },
});
