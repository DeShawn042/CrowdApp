import { router } from 'expo-router';
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
import { COLORS } from '@/constants/crowdColors';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

export default function SignupScreen() {
  const { signup } = useAuth();
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState<string | null>(null);

  async function handleSignup() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { needsEmailConfirmation } = await signup(name.trim(), email.trim(), password);
      if (needsEmailConfirmation) {
        setError('✅ Account created! Check your email and click the confirmation link, then log in.');
        return;
      }
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.message ?? 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = (field: string) => [
    styles.input,
    focused === field && styles.inputFocused,
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Back</Text>
          </Pressable>

          <View style={styles.header}>
            <Text style={[styles.heading, { color: colors.text }]}>Create account</Text>
            <Text style={[styles.sub, { color: colors.textSec }]}>Start sharing crowd levels with your community.</Text>
          </View>

          <View style={styles.form}>
            {error ? <Text style={[styles.error, { color: COLORS.packed, backgroundColor: COLORS.packed + '1A' }]}>{error}</Text> : null}

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSec }]}>Full Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }, focused === 'name' && styles.inputFocused]}
                value={name}
                onChangeText={setName}
                placeholder="Jane Smith"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="words"
                onFocus={() => setFocused('name')}
                onBlur={() => setFocused(null)}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSec }]}>Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }, focused === 'email' && styles.inputFocused]}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSec }]}>Password</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }, focused === 'pass' && styles.inputFocused]}
                value={password}
                onChangeText={setPassword}
                placeholder="Min. 6 characters"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry
                onFocus={() => setFocused('pass')}
                onBlur={() => setFocused(null)}
              />
            </View>

            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              onPress={handleSignup}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color={COLORS.text} />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </Pressable>

            <View style={styles.loginRow}>
              <Text style={[styles.loginText, { color: colors.textSec }]}>Already have an account?</Text>
              <Pressable onPress={() => router.replace('/(auth)/login')}>
                <Text style={styles.loginLink}> Log in</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  flex: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, gap: 32 },
  backBtn: { alignSelf: 'flex-start' },
  backText: { color: COLORS.primary, fontSize: 18, fontWeight: '500' },
  header: { gap: 8 },
  heading: { color: COLORS.text, fontSize: 24, fontWeight: '700' },
  sub: { color: COLORS.textSec, fontSize: 14, lineHeight: 20 },
  form: { gap: 16 },
  error: { color: COLORS.packed, backgroundColor: COLORS.packed + '1A', padding: 12, borderRadius: 14, fontSize: 14 },
  field: { gap: 6 },
  label: { color: COLORS.textSec, fontSize: 12, fontWeight: '500' },
  input: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 12,
    padding: 14,
    color: COLORS.text,
    fontSize: 16,
  },
  inputFocused: { borderColor: COLORS.primary },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonPressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  buttonText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  loginRow: { flexDirection: 'row', justifyContent: 'center' },
  loginText: { color: COLORS.textSec, fontSize: 14 },
  loginLink: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
});
