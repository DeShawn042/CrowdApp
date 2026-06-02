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
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.message ?? 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Text style={styles.logo}>📍</Text>
            <Text style={styles.appName}>Prescout</Text>
            <Text style={styles.tagline}>Know before you go.</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.heading}>Welcome back</Text>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, emailFocused && styles.inputFocused]}
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
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={[styles.input, passFocused && styles.inputFocused]}
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

            <View style={styles.signupRow}>
              <Text style={styles.signupText}>Don't have an account?</Text>
              <Pressable onPress={() => router.push('/(auth)/signup')}>
                <Text style={styles.signupLink}> Sign up</Text>
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
  container: { flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center', gap: 40, paddingVertical: 40 },
  hero: { alignItems: 'center', gap: 8 },
  logo: { fontSize: 56 },
  appName: { color: COLORS.text, fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  tagline: { color: COLORS.textSec, fontSize: 16 },
  form: { gap: 16 },
  heading: { color: COLORS.text, fontSize: 24, fontWeight: '700', marginBottom: 4 },
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
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 4 },
  signupText: { color: COLORS.textSec, fontSize: 14 },
  signupLink: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
});
