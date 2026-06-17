import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const BIOMETRIC_PREF_KEY = 'prescout_biometric_enabled';

export interface BiometricAvailability {
  available: boolean;
  label: string; // 'Face ID' | 'Touch ID / Fingerprint' | 'Biometrics'
}

export async function checkBiometricAvailability(): Promise<BiometricAvailability> {
  if (Platform.OS === 'web') return { available: false, label: 'Biometrics' };
  try {
    const LocalAuth = await import('expo-local-authentication');
    const hasHardware = await LocalAuth.hasHardwareAsync();
    if (!hasHardware) return { available: false, label: 'Biometrics' };
    const isEnrolled = await LocalAuth.isEnrolledAsync();
    if (!isEnrolled) return { available: false, label: 'Biometrics' };
    const types = await LocalAuth.supportedAuthenticationTypesAsync();
    const label = types.includes(LocalAuth.AuthenticationType.FACIAL_RECOGNITION)
      ? 'Face ID'
      : types.includes(LocalAuth.AuthenticationType.FINGERPRINT)
        ? 'Touch ID / Fingerprint'
        : 'Biometrics';
    return { available: true, label };
  } catch {
    return { available: false, label: 'Biometrics' };
  }
}

export async function getBiometricEnabled(): Promise<boolean> {
  const val = await AsyncStorage.getItem(BIOMETRIC_PREF_KEY);
  return val === 'true';
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(BIOMETRIC_PREF_KEY, String(enabled));
}

export async function authenticateWithBiometric(promptMessage?: string): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const LocalAuth = await import('expo-local-authentication');
    const result = await LocalAuth.authenticateAsync({
      promptMessage: promptMessage ?? 'Verify your identity to access Prescout',
      fallbackLabel: 'Use Password',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });
    return result.success;
  } catch {
    return false;
  }
}
