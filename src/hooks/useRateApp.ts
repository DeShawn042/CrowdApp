import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const KEY_RATED        = 'prescout_has_rated';
const KEY_REPORT_COUNT = 'prescout_rate_report_count';
const PROMPT_AT        = 3; // show after 3rd crowd report

export function useRateApp() {
  const [showPrompt, setShowPrompt] = useState(false);

  // Call this every time the user submits a crowd report
  const onReportSubmitted = useCallback(async () => {
    const alreadyRated = await AsyncStorage.getItem(KEY_RATED);
    if (alreadyRated) return;

    const raw   = await AsyncStorage.getItem(KEY_REPORT_COUNT);
    const count = parseInt(raw ?? '0', 10) + 1;
    await AsyncStorage.setItem(KEY_REPORT_COUNT, String(count));

    if (count >= PROMPT_AT) setShowPrompt(true);
  }, []);

  const dismiss = useCallback(async () => {
    // "Maybe Later" — mark as rated so it never shows again
    await AsyncStorage.setItem(KEY_RATED, 'true');
    setShowPrompt(false);
  }, []);

  const rated = useCallback(async () => {
    await AsyncStorage.setItem(KEY_RATED, 'true');
    setShowPrompt(false);
  }, []);

  return { showPrompt, onReportSubmitted, dismiss, rated };
}
