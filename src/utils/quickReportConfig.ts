import type { LocationType } from '@/data/mockData';

export type ReportType =
  | 'vibe'
  | 'price'
  | 'service'
  | 'event'
  | 'cover_charge'
  | 'parking'
  | 'cleanliness'
  | 'wait_time';

export interface QuickReportConfig {
  type: ReportType;
  icon: string;
  label: string;
  options: string[];
}

// ─── All possible report configs ────────────────────────────────────────────

const VIBE_RESTAURANT: QuickReportConfig = {
  type: 'vibe', icon: '✨', label: 'Vibe',
  options: ['Chill & relaxed', 'Loud & energetic', 'Family friendly', 'Romantic', 'Good for groups'],
};

const VIBE_BAR: QuickReportConfig = {
  type: 'vibe', icon: '✨', label: 'Vibe',
  options: ['Chill & relaxed', 'Loud & energetic', 'Romantic', 'Good for groups'],
};

const VIBE_ENTERTAINMENT: QuickReportConfig = {
  type: 'vibe', icon: '✨', label: 'Vibe',
  options: ['Chill & relaxed', 'Loud & energetic', 'Family friendly', 'Good for groups'],
};

const VIBE_DEFAULT: QuickReportConfig = {
  type: 'vibe', icon: '✨', label: 'Vibe',
  options: ['Chill & relaxed', 'Loud & energetic', 'Family friendly', 'Good for groups'],
};

const PRICE: QuickReportConfig = {
  type: 'price', icon: '💰', label: 'Price',
  options: ['Reasonable', 'Moderate', 'Expensive'],
};

const SERVICE_FULL: QuickReportConfig = {
  type: 'service', icon: '⚡', label: 'Service',
  options: ['Fast', 'Average', 'Slow', 'Short staffed'],
};

const EVENT_BAR: QuickReportConfig = {
  type: 'event', icon: '🎉', label: 'Events',
  options: ['Live music', 'DJ / dancing', 'Happy hour', 'Trivia / game night', 'Special event'],
};

const EVENT_ENTERTAINMENT: QuickReportConfig = {
  type: 'event', icon: '🎉', label: 'Events',
  options: ['Special event', 'Private event', 'Live performance'],
};

const COVER_CHARGE: QuickReportConfig = {
  type: 'cover_charge', icon: '👮', label: 'Cover Charge',
  options: ['Yes', 'No'],
};

const PARKING: QuickReportConfig = {
  type: 'parking', icon: '🅿️', label: 'Parking',
  options: ['Available', 'Limited', 'None'],
};

const CLEANLINESS: QuickReportConfig = {
  type: 'cleanliness', icon: '🧼', label: 'Cleanliness',
  options: ['Clean', 'Average', 'Needs attention'],
};

const WAIT_TIME: QuickReportConfig = {
  type: 'wait_time', icon: '⏱️', label: 'Wait Time',
  options: ['No wait', 'Under 15 min', '15–30 min', '30–45 min', '45+ min'],
};

// ─── Category → config list ──────────────────────────────────────────────────

// Maps each LocationType to the ordered list of quick report configs to show.
// null means "show no quick reports section for this type".
const CATEGORY_MAP: Record<LocationType, QuickReportConfig[] | null> = {
  restaurant:    [VIBE_RESTAURANT, PRICE, SERVICE_FULL],
  cafe:          [VIBE_RESTAURANT, PRICE, SERVICE_FULL],
  bar:           [VIBE_BAR, EVENT_BAR, COVER_CHARGE],
  entertainment: [VIBE_ENTERTAINMENT, EVENT_ENTERTAINMENT],
  gym:           [CLEANLINESS],
  shopping:      [PARKING],
  spa:           [WAIT_TIME, SERVICE_FULL],
  medical:       [WAIT_TIME, SERVICE_FULL],
  gas_station:   null,
  park:          [VIBE_DEFAULT],
  hotel:         [VIBE_DEFAULT, SERVICE_FULL],
  transit:       [VIBE_DEFAULT],
  other:         [VIBE_DEFAULT, SERVICE_FULL],
};

/**
 * Returns the ordered quick-report configs for a given location type,
 * or null if that category has no quick reports.
 */
export function getQuickReportConfigs(
  locationType: LocationType,
): QuickReportConfig[] | null {
  return CATEGORY_MAP[locationType] ?? [VIBE_DEFAULT, SERVICE_FULL];
}

/** Icon to show in the active-reports pill row for each report type. */
export const REPORT_TYPE_ICONS: Record<ReportType, string> = {
  vibe:         '✨',
  price:        '💰',
  service:      '⚡',
  event:        '🎉',
  cover_charge: '👮',
  parking:      '🅿️',
  cleanliness:  '🧼',
  wait_time:    '⏱️',
};

/** All valid report_type values for the Supabase check constraint. */
export const ALL_REPORT_TYPES: ReportType[] = [
  'vibe', 'price', 'service', 'event',
  'cover_charge', 'parking', 'cleanliness', 'wait_time',
];
