export type CrowdLevel = 'empty' | 'light' | 'moderate' | 'packed';
export type LocationType =
  | 'gym' | 'bar' | 'restaurant' | 'cafe'
  | 'shopping' | 'entertainment' | 'spa' | 'gas_station'
  | 'medical' | 'park' | 'hotel' | 'transit' | 'other';

export interface Review {
  id: string;
  locationId: string;
  userId: string;
  userName: string;
  rating: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  photos: string[];
  ownerResponse?: string; // owner reply, if any
}

export interface GoogleReview {
  authorName: string;
  authorPhotoUri?: string;
  rating: number;
  text: string;
  relativeTime: string;
}

export interface Location {
  id: string;
  name: string;
  type: LocationType;
  address: string;
  distance: string;
  currentCrowd: CrowdLevel;
  reportCount: number;
  /** Google Places overall rating (0–5) */
  rating: number;
  /** Google Places total rating count */
  googleReviewCount?: number;
  /** Up to 5 preview reviews returned by the Places API */
  googleReviews?: GoogleReview[];
  hours: string;
  coordinates: { lat: number; lng: number };
  description: string;
  // Busyness 0-100 for hours 6AM–12AM (18 slots)
  busyHours: number[];
  // Optional Google Places photo URL (fetched at runtime if absent)
  photoUrl?: string;
  placeId?: string;
  /**
   * Whether the place is currently open per Google Places.
   * true = open, false = closed, undefined = no hours data available.
   */
  openNow?: boolean;
  /** Today's open hour in 24h format (0–23). Absent when Google has no hours. */
  openHour?: number;
  /**
   * Today's close hour. Values > 23 indicate next-day close:
   *   24 = midnight,  26 = 2 AM next day, etc.
   */
  closeHour?: number;
  // Cached average star rating (populated at runtime from Supabase)
  averageRating?: number;
}

export interface Report {
  id: string;
  locationId: string;
  userId: string;
  userName: string;
  crowdLevel: CrowdLevel;
  comment?: string;
  timestamp: string;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  joinDate: string;
  totalReports: number;
  weeklyReports: number;
  favoriteVenue: string;
}

export const MOCK_LOCATIONS: Location[] = [
  {
    id: '1',
    name: 'Iron Paradise Gym',
    type: 'gym',
    address: '123 Main St, Suite 200',
    distance: '0.3 mi',
    currentCrowd: 'moderate',
    reportCount: 3,
    rating: 4.5,
    hours: '5AM – 11PM',
    coordinates: { lat: 37.7749, lng: -122.4194 },
    description: 'Full-service fitness center with free weights, cardio machines, and group classes.',
    busyHours: [10, 20, 30, 50, 70, 80, 90, 85, 70, 60, 55, 60, 75, 85, 90, 70, 50, 30],
  },
  {
    id: '2',
    name: 'The Rusty Anchor',
    type: 'bar',
    address: '456 Ocean Blvd',
    distance: '0.7 mi',
    currentCrowd: 'light',
    reportCount: 2,
    rating: 4.2,
    hours: '3PM – 2AM',
    coordinates: { lat: 37.7751, lng: -122.4182 },
    description: 'Neighborhood bar with craft beers, cocktails, and live music on weekends.',
    busyHours: [0, 0, 0, 0, 0, 0, 0, 0, 0, 20, 30, 40, 60, 70, 80, 90, 95, 75],
  },
  {
    id: '3',
    name: 'Sakura Kitchen',
    type: 'restaurant',
    address: '789 Cherry Lane',
    distance: '0.5 mi',
    currentCrowd: 'packed',
    reportCount: 5,
    rating: 4.8,
    hours: '11AM – 10PM',
    coordinates: { lat: 37.7743, lng: -122.4201 },
    description: 'Authentic Japanese cuisine featuring fresh sushi, ramen, and seasonal specials.',
    busyHours: [0, 0, 0, 0, 0, 20, 70, 90, 85, 60, 40, 75, 90, 95, 80, 50, 30, 10],
  },
  {
    id: '4',
    name: 'Velocity Fitness',
    type: 'gym',
    address: '321 Park Ave',
    distance: '1.1 mi',
    currentCrowd: 'empty',
    reportCount: 1,
    rating: 4.0,
    hours: '6AM – 10PM',
    coordinates: { lat: 37.776, lng: -122.421 },
    description: 'Modern gym with personal trainers, group classes, and a recovery lounge.',
    busyHours: [5, 15, 25, 40, 60, 75, 80, 70, 60, 50, 45, 50, 65, 75, 80, 60, 40, 20],
  },
  {
    id: '5',
    name: 'The Tap Room',
    type: 'bar',
    address: '555 Brewery Way',
    distance: '1.4 mi',
    currentCrowd: 'light',
    reportCount: 4,
    rating: 4.6,
    hours: '12PM – 2AM',
    coordinates: { lat: 37.7738, lng: -122.4185 },
    description: 'Craft beer bar with 50+ rotating taps, pretzels, and weekly trivia nights.',
    busyHours: [0, 0, 0, 0, 0, 0, 10, 30, 40, 50, 60, 70, 80, 90, 95, 85, 70, 40],
  },
  {
    id: '6',
    name: 'Bella Italia',
    type: 'restaurant',
    address: '222 Vine St',
    distance: '0.9 mi',
    currentCrowd: 'moderate',
    reportCount: 3,
    rating: 4.3,
    hours: '11AM – 10PM',
    coordinates: { lat: 37.7755, lng: -122.4195 },
    description: 'Family-owned Italian restaurant serving homemade pasta and wood-fired pizza.',
    busyHours: [0, 0, 0, 0, 0, 15, 65, 85, 80, 55, 35, 70, 85, 90, 75, 45, 25, 10],
  },
];

export const MOCK_REPORTS: Report[] = [
  {
    id: 'r1',
    locationId: '1',
    userId: 'u2',
    userName: 'Marcus J.',
    crowdLevel: 'moderate',
    comment: 'All squat racks are taken — cardio is fine',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: 'r2',
    locationId: '1',
    userId: 'u3',
    userName: 'Sarah K.',
    crowdLevel: 'moderate',
    comment: 'Busy for a Tuesday, bring headphones',
    timestamp: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
  },
  {
    id: 'r3',
    locationId: '1',
    userId: 'u4',
    userName: 'Alex R.',
    crowdLevel: 'light',
    timestamp: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
  },
  {
    id: 'r4',
    locationId: '2',
    userId: 'u5',
    userName: 'Jamie L.',
    crowdLevel: 'light',
    comment: 'Only about 10 people here, great time to come',
    timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
  },
  {
    id: 'r5',
    locationId: '3',
    userId: 'u6',
    userName: 'Chris M.',
    crowdLevel: 'packed',
    comment: '45 min wait for a table',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: 'r6',
    locationId: '3',
    userId: 'u7',
    userName: 'Taylor B.',
    crowdLevel: 'packed',
    comment: 'Way too crowded tonight, try tomorrow',
    timestamp: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
  },
  {
    id: 'r7',
    locationId: '4',
    userId: 'u8',
    userName: 'Morgan P.',
    crowdLevel: 'empty',
    comment: 'Basically empty right now',
    timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  {
    id: 'r8',
    locationId: '5',
    userId: 'u9',
    userName: 'Jordan S.',
    crowdLevel: 'light',
    timestamp: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
  },
  {
    id: 'r9',
    locationId: '6',
    userId: 'u10',
    userName: 'Riley H.',
    crowdLevel: 'moderate',
    comment: 'Wait time about 15 min for a table',
    timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
  },
];

export const MY_REPORTS: Report[] = [
  {
    id: 'mr1',
    locationId: '1',
    userId: 'u1',
    userName: 'You',
    crowdLevel: 'packed',
    comment: 'Every machine is taken, come back later',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mr2',
    locationId: '3',
    userId: 'u1',
    userName: 'You',
    crowdLevel: 'moderate',
    comment: 'Good lunch crowd, seated right away',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mr3',
    locationId: '5',
    userId: 'u1',
    userName: 'You',
    crowdLevel: 'light',
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mr4',
    locationId: '2',
    userId: 'u1',
    userName: 'You',
    crowdLevel: 'packed',
    comment: 'Standing room only',
    timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const MOCK_USER: AppUser = {
  id: 'u1',
  name: 'DeShawn',
  email: 'drussrooks@gmail.com',
  joinDate: 'January 2025',
  totalReports: 24,
  weeklyReports: 3,
  favoriteVenue: 'Iron Paradise Gym',
};
