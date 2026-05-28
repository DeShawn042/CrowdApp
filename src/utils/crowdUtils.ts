import { CrowdLevel, Report } from '@/data/mockData';

export const CROWD_LEVELS: CrowdLevel[] = ['empty', 'light', 'moderate', 'packed'];

export const CROWD_LABELS: Record<CrowdLevel, string> = {
  empty: 'Empty',
  light: 'Light',
  moderate: 'Moderate',
  packed: 'Packed',
};

export const CROWD_EMOJIS: Record<CrowdLevel, string> = {
  empty: '😌',
  light: '🟢',
  moderate: '🟡',
  packed: '🔴',
};

export const CROWD_COLORS: Record<CrowdLevel, string> = {
  empty: '#22C55E',
  light: '#84CC16',
  moderate: '#F59E0B',
  packed: '#EF4444',
};

export const CROWD_BG_COLORS: Record<CrowdLevel, string> = {
  empty: 'rgba(34, 197, 94, 0.15)',
  light: 'rgba(132, 204, 22, 0.15)',
  moderate: 'rgba(245, 158, 11, 0.15)',
  packed: 'rgba(239, 68, 68, 0.15)',
};

const CROWD_VALUES: Record<CrowdLevel, number> = {
  empty: 0,
  light: 1,
  moderate: 2,
  packed: 3,
};

export function crowdLevelFromValue(value: number): CrowdLevel {
  const rounded = Math.round(value);
  return CROWD_LEVELS[Math.min(Math.max(rounded, 0), 3)];
}

export function averageReports(reports: Report[]): CrowdLevel {
  if (reports.length === 0) return 'light';
  const avg = reports.reduce((sum, r) => sum + CROWD_VALUES[r.crowdLevel], 0) / reports.length;
  return crowdLevelFromValue(avg);
}

export function isExpired(timestamp: string): boolean {
  return Date.now() - new Date(timestamp).getTime() > 60 * 60 * 1000;
}

export function timeAgo(timestamp: string): string {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin === 1) return '1 min ago';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr === 1) return '1 hr ago';
  if (diffHr < 24) return `${diffHr} hrs ago`;
  const diffDays = Math.floor(diffHr / 24);
  return diffDays === 1 ? 'yesterday' : `${diffDays} days ago`;
}

export function formatDate(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export const BUSY_HOUR_LABELS = ['6a', '7a', '8a', '9a', '10a', '11a', '12p', '1p', '2p', '3p', '4p', '5p', '6p', '7p', '8p', '9p', '10p', '11p'];

export function busyLevelFromPercent(pct: number): CrowdLevel {
  if (pct < 20) return 'empty';
  if (pct < 50) return 'light';
  if (pct < 80) return 'moderate';
  return 'packed';
}
