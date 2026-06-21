import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SocialAuthButtons from '@/components/SocialAuthButtons';
import { COLORS } from '@/constants/crowdColors';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import {
  authenticateWithBiometric,
  checkBiometricAvailability,
  getBiometricAsked,
  setBiometricAsked,
  setBiometricEnabled,
} from '@/hooks/useBiometric';

const LOGO_DARK  = require('../../../assets/prescout-logo-dark.png');
const LOGO_LIGHT = require('../../../assets/prescout-logo-light.png');

export default function LoginScreen() {
  const { login, loginWithApple, loginWithGoogle, isBiometricRequired, unlockWithBiometric, cancelBiometric } = useAuth();
  const { colors, preference } = useTheme();
  const systemScheme = useColorScheme();
  const isDark = preference === 'dark' || (preference === 'system' && systemScheme === 'dark');
  const logoSource = isDark ? LOGO_DARK : LOGO_LIGHT;

  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused,  setPassFocused]  = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometrics');

  // Auto-prompt biometric if gated on mount
  useEffect(() => {
    if (!isBiometricRequired) return;
    checkBiometricAvailability().then(({ label }) => setBiometricLabel(label));
    // Auto-trigger after a short delay so the screen renders first
    const t = setTimeout(() => handleBiometricUnlock(), 400);
    return () => clearTimeout(t);
  }, [isBiometricRequired]);

  async function handleBiometricUnlock() {
    const success = await unlockWithBiometric();
    if (success) {
      router.replace('/(tabs)');
    } else {
      setError(`${biometricLabel} failed. Use your password instead.`);
    }
  }

  async function offerBiometricEnrollment() {
    const { available, label } = await checkBiometricAvailability();
    if (!available) return;
    const alreadyAsked = await getBiometricAsked();
    if (alreadyAsked) return;
    // Mark as asked before showing the alert so it never appears again
    await setBiometricAsked();
    Alert.alert(
      `Enable ${label}?`,
      `Sign in faster next time using ${label}.`,
      [
        { text: 'Enable', onPress: () => setBiometricEnabled(true) },
        { text: 'Not Now', style: 'cancel' },
      ],
    );
  }

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      await offerBiometricEnrollment();
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.message ?? 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  async function handleApple() {
    setError('');
    try {
      await loginWithApple();
      await offerBiometricEnrollment();
      router.replace('/(tabs)');
    } catch (e: any) {
      if (e.message !== 'CANCELLED') setError(e.message ?? 'Apple Sign-In failed.');
    }
  }

  async function handleGoogle() {
    setError('');
    try {
      await loginWithGoogle();
      await offerBiometricEnrollment();
      router.replace('/(tabs)');
    } catch (e: any) {
      if (e.message !== 'CANCELLED') setError(e.message ?? 'Google Sign-In failed.');
    }
  }

  // ── Biometric gate screen ─────────────────────────────────────
  if (isBiometricRequired) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
        <View style={styles.biometricGate}>
          <Image source={logoSource} style={styles.gateLogo} resizeMode="contain" />
          <Text style={[styles.gateTitle, { color: colors.text }]}>Welcome back</Text>
          <Text style={[styles.gateSub, { color: colors.textSec }]}>
            Verify your identity to continue
          </Text>

          {error ? (
            <Text style={[styles.error, { color: COLORS.packed, backgroundColor: COLORS.packed + '1A' }]}>{error}</Text>
          ) : null}

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={handleBiometricUnlock}>
            <Text style={styles.buttonText}>🔒 Use {biometricLabel}</Text>
          </Pressable>

          <Pressable onPress={cancelBiometric} style={styles.fallbackLink}>
            <Text style={[styles.fallbackText, { color: colors.textMuted }]}>
              Use password instead
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Normal login screen ───────────────────────────────────────
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Image source={logoSource} style={styles.logoImg} resizeMode="contain" />
          </View>

          <View style={styles.formWrap}>
            <View style={styles.form}>
              <Text style={[styles.heading, { color: colors.text }]}>Welcome back</Text>

              {error ? (
                <Text style={[styles.error, { color: COLORS.packed, backgroundColor: COLORS.packed + '1A' }]}>{error}</Text>
              ) : null}

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textSec }]}>Email</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }, emailFocused && styles.inputFocused]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textSec }]}>Password</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }, passFocused && styles.inputFocused]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry
                  onFocus={() => setPassFocused(true)}
                  onBlur={() => setPassFocused(false)}
                />
              </View>

              <Pressable
                style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
                onPress={handleLogin}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={COLORS.text} />
                ) : (
                  <Text style={styles.buttonText}>Log In</Text>
                )}
              </Pressable>

              <SocialAuthButtons
                onApple={handleApple}
                onGoogle={handleGoogle}
                disabled={loading}
              />

              <View style={styles.signupRow}>
                <Text style={[styles.signupText, { color: colors.textSec }]}>Don't have an account?</Text>
                <Pressable onPress={() => router.push('/(auth)/signup')}>
                  <Text style={styles.signupLink}> Sign up</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1 },
  flex:          { flex: 1 },
  container:     { flexGrow: 1, justifyContent: 'center', gap: 40, paddingVertical: 40 },
  formWrap:      { paddingHorizontal: 24 },
  hero:          { alignSelf: 'center', paddingBottom: 20 },
  logoImg:       { width: Dimensions.get('window').width, height: 250, alignSelf: 'center' },
  form:          { gap: 16 },
  heading:       { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  error:         { padding: 12, borderRadius: 14, fontSize: 14 },
  field:         { gap: 6 },
  label:         { fontSize: 12, fontWeight: '500' },
  input:         { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16 },
  inputFocused:  { borderColor: COLORS.primary },
  button:        { backgroundColor: COLORS.primary, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonPressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  buttonText:    { color: '#fff', fontSize: 16, fontWeight: '600' },
  signupRow:     { flexDirection: 'row', justifyContent: 'center', marginTop: 4 },
  signupText:    { fontSize: 14 },
  signupLink:    { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  // Biometric gate
  biometricGate: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  gateLogo:      { width: Dimensions.get('window').width * 0.7, height: 140, marginBottom: 8 },
  gateTitle:     { fontSize: 26, fontWeight: '700' },
  gateSub:       { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  fallbackLink:  { marginTop: 8, paddingVertical: 8 },
  fallbackText:  { fontSize: 14, textDecorationLine: 'underline' },
});
