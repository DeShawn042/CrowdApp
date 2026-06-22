import { useEffect, useState } from 'react';
import { CrowdLevel } from '@/data/mockData';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MIN_REPORTS = 10; // minimum reports per hour to surface Prescout data

// Returns hour → dominant CrowdLevel for the current day-of-week,
// but only for hours where we have ≥ MIN_REPORTS total reports.
export function usePrescoutHourly(locationId: string) {
  const [hourlyData, setHourlyData] = useState<Partial<Record<number, CrowdLevel>>>({});

  useEffect(() => {
    if (!isSupabaseConfigured || !locationId) return;

    const dayOfWeek = DAYS[new Date().getDay()];

    supabase
      .from('historical_reports')
      .select('hour, crowd_level')
      .eq('location_id', locationId)
      .eq('day_of_week', dayOfWeek)
      .then(({ data }) => {
        if (!data || data.length === 0) return;

        // Count reports per (hour, crowd_level)
        const counts: Record<number, Record<string, number>> = {};
        for (const row of data) {
          const h = row.hour as number;
          const lvl = row.crowd_level as string;
          if (!counts[h]) counts[h] = {};
          counts[h][lvl] = (counts[h][lvl] ?? 0) + 1;
        }

        const result: Partial<Record<number, CrowdLevel>> = {};
        for (const [hourStr, levelCounts] of Object.entries(counts)) {
          const hour = Number(hourStr);
          const total = Object.values(levelCounts).reduce((s, n) => s + n, 0);
          if (total < MIN_REPORTS) continue;

          // Pick the plurality level
          const dominant = Object.entries(levelCounts)
            .sort(([, a], [, b]) => b - a)[0][0] as CrowdLevel;
          result[hour] = dominant;
        }
        setHourlyData(result);
      })
      .catch(() => {});
  }, [locationId]);

  return hourlyData;
}
