import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/context/AuthContext';
import { AppProvider } from '@/context/AppContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0F0F13' } }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="location/[id]"
            options={{ headerShown: false, animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="location/reviews/[id]"
            options={{ headerShown: false, animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="submit/[id]"
            options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom' }}
          />
        </Stack>
      </AppProvider>
    </AuthProvider>
  );
}
