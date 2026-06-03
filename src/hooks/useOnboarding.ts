import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const KEY = 'prescout_has_seen_onboarding';

export function useOnboarding() {
  const [checked,     setChecked]     = useState(false);
  const [hasSeenIt,   setHasSeenIt]   = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then(val => {
      setHasSeenIt(val === 'true');
      setChecked(true);
    });
  }, []);

  async function markSeen() {
    await AsyncStorage.setItem(KEY, 'true');
    setHasSeenIt(true);
  }

  // Dev helper — call this to reset onboarding
  async function reset() {
    await AsyncStorage.removeItem(KEY);
    setHasSeenIt(false);
  }

  return { checked, hasSeenIt, markSeen, reset };
}
