import { Redirect, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AppProvider } from '@/context/AppContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { useOnboarding } from '@/hooks/useOnboarding';

function ThemedStack() {
  const { colors } = useTheme();
  const { checked, hasSeenIt } = useOnboarding();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Wait for both AsyncStorage and auth session to resolve
  if (!checked || authLoading) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  // Priority 1: logged in → home (no onboarding, no login)
  // Priority 2: logged out + seen onboarding → login
  // Priority 3: logged out + not seen onboarding → onboarding
  const redirect = isAuthenticated
    ? <Redirect href="/(tabs)/" />
    : !hasSeenIt
      ? <Redirect href="/onboarding" />
      : <Redirect href="/(auth)/login" />;

  return (
    <>
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
      {redirect}
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
