import { Redirect, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AppProvider } from '@/context/AppContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { useOnboarding } from '@/hooks/useOnboarding';

function ThemedStack() {
  const { colors } = useTheme();
  const { checked, hasSeenIt } = useOnboarding();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const isReady = checked && !authLoading;

  // Determine the initial redirect only once loading is complete
  const redirect = isReady
    ? isAuthenticated
      ? <Redirect href="/(tabs)/" />
      : !hasSeenIt
        ? <Redirect href="/onboarding" />
        : <Redirect href="/(auth)/login" />
    : null;

  // Keep the Stack always mounted so it never unmounts/remounts on resume.
  // The loading overlay sits on top until auth + onboarding are resolved,
  // preventing a black-screen flash during state transitions.
  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar style={colors.statusBar} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="location/[id]"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="reviews/[id]"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="submit/[id]"
          options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="admin/index"
          options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack>

      {/* Overlay masks the empty Stack while auth/onboarding are loading */}
      {!isReady && (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.bg }]} />
      )}

      {redirect}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppProvider>
          <ThemedStack />
        </AppProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
