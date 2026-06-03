import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/crowdColors';
import { useTheme } from '@/context/ThemeContext';
import { useOnboarding } from '@/hooks/useOnboarding';
import { requestNotificationPermission } from '@/hooks/useNotifications';
import * as Location from 'expo-location';

// ── Section data ─────────────────────────────────────────────────────────────

const SECTIONS = [
  {
    id: 'scout',
    icon: '👁️',
    title: 'Scout Ahead',
    description:
      'See real-time crowd levels, wait times, and vibes at any location before you leave the house.',
  },
  {
    id: 'reports',
    icon: '📊',
    title: 'Report What You See',
    description:
      'Submit a quick crowd report when you're at a location. Your report helps others know what to expect — and expires in 60 minutes so it's always fresh.',
  },
  {
    id: 'watchlist',
    icon: '👁️',
    title: 'Watch Your Spots',
    description:
      'Add any location to your watchlist and set your preferred crowd level. We'll notify you the moment it hits that level — so you can go at the perfect time.',
  },
  {
    id: 'heading',
    icon: '🚗',
    title: 'Heading There',
    description:
      'Let Prescout know you're on your way somewhere. It pins to your home screen so you can quickly report the crowd when you arrive — no searching needed.',
  },
  {
    id: 'permissions',
    icon: '📍',
    title: 'One Last Thing',
    description:
      'Prescout needs your location to show nearby places and your notification permission to alert you when watched locations hit your preferred crowd level.',
    isPermissions: true,
  },
];

const SECTION_HEIGHT = 260; // approximate height per section for dot positioning

// ── Animated logo pulse ───────────────────────────────────────────────────────

function LogoPulse({ color }: { color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale,   { toValue: 1.15, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1,    duration: 1200, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale,   { toValue: 1,   duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.6, duration: 1200, useNativeDriver: true }),
        ]),
      ]),
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.logoGlow, { backgroundColor: color + '30', transform: [{ scale }], opacity }]} />
  );
}

// ── Permission button ─────────────────────────────────────────────────────────

function PermissionBtn({
  icon, label, granted, onPress, colors,
}: {
  icon: string; label: string; granted: boolean; onPress: () => void; colors: any;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.permBtn,
        { backgroundColor: colors.card, borderColor: granted ? COLORS.primary : colors.border },
        pressed && { opacity: 0.75 },
      ]}
      onPress={onPress}
      disabled={granted}>
      <Text style={styles.permIcon}>{icon}</Text>
      <Text style={[styles.permLabel, { color: granted ? COLORS.primary : colors.text }]}>{label}</Text>
      {granted && <Text style={styles.permCheck}>✓</Text>}
    </Pressable>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const { markSeen } = useOnboarding();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const [scrollY, setScrollY] = useState(0);
  const [locationGranted, setLocationGranted] = useState(false);
  const [notifGranted,    setNotifGranted]    = useState(false);

  // Estimate which dot is active based on scroll position
  const totalContentHeight = SECTION_HEIGHT * SECTIONS.length;
  const dotIndex = Math.min(
    Math.floor((scrollY / Math.max(totalContentHeight, 1)) * SECTIONS.length),
    SECTIONS.length - 1,
  );

  const finish = useCallback(async (goToSignup = true) => {
    await markSeen();
    if (goToSignup) {
      router.replace('/(auth)/login');
    } else {
      router.replace('/(auth)/login');
    }
  }, [markSeen]);

  async function requestLocation() {
    if (Platform.OS === 'web') { setLocationGranted(true); return; }
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationGranted(status === 'granted');
  }

  async function requestNotifications() {
    const granted = await requestNotificationPermission();
    setNotifGranted(granted);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Skip button */}
      <Pressable
        style={styles.skipBtn}
        onPress={() => finish()}>
        <Text style={[styles.skipText, { color: colors.textMuted }]}>Skip</Text>
      </Pressable>

      {/* Scroll content */}
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: 160 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        onScroll={e => setScrollY(e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <LogoPulse color={COLORS.primary} />
            <Text style={styles.logoEmoji}>📍</Text>
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>Prescout</Text>
          <Text style={[styles.tagline, { color: colors.textSec }]}>Know before you go.</Text>
        </View>

        {/* Feature sections */}
        {SECTIONS.map((s) => (
          <View key={s.id} style={[styles.section, { borderColor: colors.border }]}>
            <View style={[styles.sectionIconWrap, { backgroundColor: COLORS.primary + '18' }]}>
              <Text style={styles.sectionIcon}>{s.icon}</Text>
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{s.title}</Text>
            <Text style={[styles.sectionDesc,  { color: colors.textSec }]}>{s.description}</Text>

            {s.isPermissions && (
              <View style={styles.permRow}>
                <PermissionBtn
                  icon="📍" label={locationGranted ? 'Location Enabled' : 'Enable Location'}
                  granted={locationGranted} onPress={requestLocation} colors={colors} />
                <PermissionBtn
                  icon="🔔" label={notifGranted ? 'Notifications On' : 'Enable Notifications'}
                  granted={notifGranted} onPress={requestNotifications} colors={colors} />
                <Text style={[styles.permNote, { color: colors.textMuted }]}>
                  You can change these anytime in Settings.
                </Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Progress dots */}
      <View style={[styles.dotsWrap, { bottom: 140 + insets.bottom }]}>
        {SECTIONS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === dotIndex ? COLORS.primary : colors.border },
              i === dotIndex && styles.dotActive,
            ]}
          />
        ))}
      </View>

      {/* Bottom fade + fixed CTA */}
      <View style={[styles.bottomPanel, { backgroundColor: colors.bg, paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.85 }]}
          onPress={() => finish()}>
          <Text style={styles.ctaBtnText}>Get Started</Text>
        </Pressable>
        <Pressable onPress={() => finish()}>
          <Text style={[styles.signInText, { color: colors.textMuted }]}>
            Already have an account?{' '}
            <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Sign in</Text>
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1 },
  skipBtn:       { position: 'absolute', top: 56, right: 20, zIndex: 10, padding: 8 },
  skipText:      { fontSize: 14, fontWeight: '600' },
  scroll:        { flex: 1 },
  content:       { paddingHorizontal: 24, paddingTop: 16, gap: 0 },

  // Header
  header:        { alignItems: 'center', paddingVertical: 40, gap: 8 },
  logoWrap:      { width: 88, height: 88, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  logoGlow:      { position: 'absolute', width: 88, height: 88, borderRadius: 44 },
  logoEmoji:     { fontSize: 52, zIndex: 1 },
  appName:       { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  tagline:       { fontSize: 16 },

  // Sections
  section:       { paddingVertical: 36, gap: 12, borderTopWidth: 1 },
  sectionIconWrap:{ width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sectionIcon:   { fontSize: 32 },
  sectionTitle:  { fontSize: 22, fontWeight: '800' },
  sectionDesc:   { fontSize: 15, lineHeight: 24 },

  // Permissions
  permRow:       { gap: 12, marginTop: 4 },
  permBtn:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  permIcon:      { fontSize: 20 },
  permLabel:     { flex: 1, fontSize: 15, fontWeight: '600' },
  permCheck:     { color: COLORS.primary, fontSize: 18, fontWeight: '800' },
  permNote:      { fontSize: 12, textAlign: 'center', marginTop: 4 },

  // Progress dots
  dotsWrap:      { position: 'absolute', right: 16, gap: 6, alignItems: 'center' },
  dot:           { width: 6, height: 6, borderRadius: 3 },
  dotActive:     { width: 8, height: 20, borderRadius: 4 },

  // Bottom panel
  bottomPanel:   { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingTop: 20, gap: 14, borderTopWidth: 0 },
  ctaBtn:        { backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  ctaBtnText:    { color: '#fff', fontSize: 17, fontWeight: '700' },
  signInText:    { textAlign: 'center', fontSize: 14 },
});
