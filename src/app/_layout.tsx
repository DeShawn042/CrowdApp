import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { AppProvider } from '@/context/AppContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { useOnboarding } from '@/hooks/useOnboarding';

function OnboardingGate() {
  const { checked, hasSeenIt } = useOnboarding();

  useEffect(() => {
    if (!checked) return;
    if (!hasSeenIt) {
      router.replace('/onboarding');
    }
    // If hasSeenIt, Expo Router handles the default route normally
  }, [checked, hasSeenIt]);

  return null;
}

function ThemedStack() {
  const { colors } = useTheme();
  return (
    <>
      <StatusBar style={colors.statusBar} />
      <OnboardingGate />
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
    </>
  );
}

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
