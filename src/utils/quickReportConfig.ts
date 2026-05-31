import type { LocationType } from '@/data/mockData';

export type ReportType =
  | 'vibe'
  | 'price'
  | 'service'
  | 'event'
  | 'cover_charge'
  | 'parking'
  | 'cleanliness'
  | 'wait_time'
  | 'security_line'
  | 'tsa_precheck'
  | 'baggage_dropoff';

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

// ─── Airport-specific configs ────────────────────────────────────────────────

const SECURITY_LINE: QuickReportConfig = {
  type: 'security_line', icon: '🔵', label: 'Security Line',
  options: ['No wait', 'Under 15 min', '15–30 min', '30–45 min', '45–60 min', '60+ min'],
};

const TSA_PRECHECK: QuickReportConfig = {
  type: 'tsa_precheck', icon: '✅', label: 'TSA PreCheck',
  options: ['No wait', 'Under 10 min', '10–20 min', '20–30 min', '30+ min', 'Not available / Closed'],
};

const BAGGAGE_DROPOFF: QuickReportConfig = {
  type: 'baggage_dropoff', icon: '🧳', label: 'Bag Drop-off',
  options: ['No wait', 'Under 15 min', '15–30 min', '30+ min'],
};

// ─── Category → config list ──────────────────────────────────────────────────

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
  airport:       [SECURITY_LINE, TSA_PRECHECK, BAGGAGE_DROPOFF],
  other:         [VIBE_DEFAULT, SERVICE_FULL],
};

export function getQuickReportConfigs(
  locationType: LocationType,
): QuickReportConfig[] | null {
  return CATEGORY_MAP[locationType] ?? [VIBE_DEFAULT, SERVICE_FULL];
}

export const REPORT_TYPE_ICONS: Record<ReportType, string> = {
  vibe:            '✨',
  price:           '💰',
  service:         '⚡',
  event:           '🎉',
  cover_charge:    '👮',
  parking:         '🅿️',
  cleanliness:     '🧼',
  wait_time:       '⏱️',
  security_line:   '🔵',
  tsa_precheck:    '✅',
  baggage_dropoff: '🧳',
};

export const ALL_REPORT_TYPES: ReportType[] = [
  'vibe', 'price', 'service', 'event',
  'cover_charge', 'parking', 'cleanliness', 'wait_time',
  'security_line', 'tsa_precheck', 'baggage_dropoff',
];
