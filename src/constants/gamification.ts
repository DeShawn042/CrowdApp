export interface Level {
  name: string;
  icon: string;
  color: string;
  minPoints: number;
  maxPoints: number | null;
}

export const LEVELS: Level[] = [
  { name: 'Scout',             icon: '🔭', color: '#94A3B8', minPoints: 0,    maxPoints: 99   },
  { name: 'Tracker',           icon: '🧭', color: '#60A5FA', minPoints: 100,  maxPoints: 299  },
  { name: 'Pathfinder',        icon: '🗺️', color: '#34D399', minPoints: 300,  maxPoints: 599  },
  { name: 'Trailblazer',       icon: '⛰️', color: '#FBBF24', minPoints: 600,  maxPoints: 999  },
  { name: 'Local Legend',      icon: '🏆', color: '#F97316', minPoints: 1000, maxPoints: 1999 },
  { name: 'Elite Scout',       icon: '⭐', color: '#EC4899', minPoints: 2000, maxPoints: 4999 },
  { name: 'Prescout Pioneer',  icon: '🚀', color: '#A78BFA', minPoints: 5000, maxPoints: null },
];

export function getLevel(points: number): Level {
  return [...LEVELS].reverse().find(l => points >= l.minPoints) ?? LEVELS[0];
}

export function getLevelProgress(points: number): {
  current: Level;
  next: Level | null;
  progress: number;
  pointsToNext: number;
} {
  const current = getLevel(points);
  const idx = LEVELS.indexOf(current);
  const next = idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
  if (!next) return { current, next: null, progress: 1, pointsToNext: 0 };
  const range    = next.minPoints - current.minPoints;
  const earned   = points - current.minPoints;
  const progress = Math.min(earned / range, 1);
  return { current, next, progress, pointsToNext: next.minPoints - points };
}

export interface BadgeDef {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export const BADGES: BadgeDef[] = [
  { id: 'first_report',   icon: '📊', name: 'First Report',       description: 'Submitted your first crowd report' },
  { id: 'quick_draw',     icon: '⚡', name: 'Quick Draw',         description: 'Submitted 5 quick reports' },
  { id: 'pioneer',        icon: '🏴', name: 'Pioneer',            description: 'First to report at a new location' },
  { id: 'on_the_move',    icon: '🚗', name: 'On the Move',        description: 'Used Heading There 5 times' },
  { id: 'watchful_eye',   icon: '👁️', name: 'Watchful Eye',       description: 'Added 5 locations to your watchlist' },
  { id: 'neighborhood',   icon: '🏘️', name: 'Neighborhood Scout', description: 'Submitted 10 reports in the same city' },
  { id: 'consistent',     icon: '📅', name: 'Consistent',         description: 'Submitted reports 3 days in a row' },
  { id: 'dedicated',      icon: '🔥', name: 'Dedicated',          description: 'Submitted reports 7 days in a row' },
  { id: 'century',        icon: '💯', name: 'Century',            description: 'Submitted 100 total reports' },
  { id: 'reviewer',       icon: '⭐', name: 'Reviewer',           description: 'Written 5 Prescout reviews' },
  { id: 'photographer',   icon: '📸', name: 'Photographer',       description: 'Attached photos to 3 reviews' },
  { id: 'early_adopter',  icon: '🌟', name: 'Early Adopter',      description: 'Joined in the first 30 days of launch' },
];

// Prescout launch date — update to your actual launch date
export const LAUNCH_DATE = new Date('2025-01-01');

export const POINTS = {
  CROWD_REPORT:           10,
  QUICK_REPORT:            5,
  REVIEW_WITH_PHOTO:      20,
  REVIEW_NO_PHOTO:        10,
  HEADING_THERE_ARRIVAL:  15,
  PIONEER_BONUS:          25,
  VERIFIED_MATCH_BONUS:    5,
  STREAK_7_BONUS:         50,
  STREAK_30_BONUS:       150,
} as const;
