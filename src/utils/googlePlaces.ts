import { GoogleReview, Location, LocationType } from '@/data/mockData';
import { busyLevelFromPercent } from '@/utils/crowdUtils';

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '';
const BASE = 'https://places.googleapis.com/v1/places';

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.shortFormattedAddress',
  'places.types',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.regularOpeningHours',
  'places.currentOpeningHours',
  'places.editorialSummary',
  'places.photos',
  'places.reviews',
].join(',');

const TYPE_MAP: Record<string, LocationType> = {
  // Gym / fitness
  gym:                  'gym',
  fitness_center:       'gym',
  sports_club:          'gym',
  // Bar / nightlife
  bar:                  'bar',
  night_club:           'bar',
  pub:                  'bar',
  cocktail_bar:         'bar',
  // Restaurant / food
  restaurant:           'restaurant',
  fast_food_restaurant: 'restaurant',
  meal_takeaway:        'restaurant',
  meal_delivery:        'restaurant',
  bakery:               'restaurant',
  // Cafe
  cafe:                 'cafe',
  coffee_shop:          'cafe',
  // Shopping
  shopping_mall:        'shopping',
  clothing_store:       'shopping',
  department_store:     'shopping',
  shoe_store:           'shopping',
  jewelry_store:        'shopping',
  store:                'shopping',
  supermarket:          'shopping',
  convenience_store:    'shopping',
  // Entertainment
  movie_theater:        'entertainment',
  bowling_alley:        'entertainment',
  amusement_park:       'entertainment',
  casino:               'entertainment',
  stadium:              'entertainment',
  museum:               'entertainment',
  tourist_attraction:   'entertainment',
  // Spa / beauty
  spa:                  'spa',
  beauty_salon:         'spa',
  hair_care:            'spa',
  hair_salon:           'spa',
  nail_salon:           'spa',
  // Gas station
  gas_station:          'gas_station',
  // Medical
  hospital:             'medical',
  doctor:               'medical',
  pharmacy:             'medical',
  drugstore:            'medical',
  dentist:              'medical',
  physiotherapist:      'medical',
  // Park
  park:                 'park',
  // Hotel / lodging
  lodging:              'hotel',
  // Transit
  subway_station:       'transit',
  train_station:        'transit',
  bus_station:          'transit',
  transit_station:      'transit',
  light_rail_station:   'transit',
  // Airport — all variants Google Places API may return
  airport:              'airport',
  international_airport:'airport',
  domestic_airport:     'airport',
};

const DEFAULT_BUSY_HOURS: Record<LocationType, number[]> = {
  // 18 slots: 6 AM → 11 PM
  gym:           [10, 20, 30, 50, 70, 80, 90, 85, 70, 60, 55, 60, 75, 85, 90, 70, 50, 30],
  bar:           [0,  0,  0,  0,  0,  0,  0,  0,  0,  20, 30, 40, 60, 70, 80, 90, 95, 75],
  restaurant:    [0,  0,  0,  0,  0,  20, 70, 90, 85, 60, 40, 75, 90, 95, 80, 50, 30, 10],
  cafe:          [0,  0,  20, 50, 80, 90, 85, 70, 60, 55, 60, 65, 70, 65, 55, 45, 30, 10],
  shopping:      [0,  0,  0,  10, 20, 40, 60, 75, 80, 85, 80, 75, 80, 85, 80, 70, 50, 20],
  entertainment: [0,  0,  0,  0,  0,  10, 20, 30, 40, 50, 60, 70, 80, 90, 90, 85, 75, 50],
  spa:           [0,  0,  0,  10, 30, 60, 80, 85, 80, 75, 70, 75, 80, 75, 65, 50, 30, 10],
  gas_station:   [20, 30, 40, 60, 80, 85, 70, 55, 50, 50, 55, 65, 70, 65, 60, 70, 75, 50],
  medical:       [0,  0,  0,  20, 60, 85, 90, 85, 75, 70, 65, 70, 75, 70, 60, 30, 10,  0],
  park:          [5,  10, 15, 25, 40, 55, 65, 70, 70, 65, 60, 65, 70, 75, 70, 60, 45, 20],
  hotel:         [30, 25, 20, 20, 25, 40, 55, 70, 65, 60, 55, 60, 65, 70, 65, 60, 55, 45],
  transit:       [20, 25, 40, 70, 80, 75, 55, 45, 40, 45, 55, 70, 80, 75, 60, 45, 35, 25],
  airport:       [30, 40, 60, 80, 85, 80, 70, 65, 65, 70, 75, 80, 85, 80, 75, 70, 60, 40],
  other:         [20, 25, 30, 40, 50, 55, 60, 60, 55, 50, 50, 55, 60, 60, 55, 45, 35, 20],
};

function getLocationType(types: string[]): LocationType {
  for (const t of types) {
    const mapped = TYPE_MAP[t];
    if (mapped) {
      console.log('[getLocationType] matched:', t, '→', mapped, '| all types:', types);
      return mapped;
    }
  }
  console.log('[getLocationType] no match → other | all types:', types);
  return 'other';
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function currentBusyHoursIndex(): number {
  const h = new Date().getHours();
  return Math.min(Math.max(h - 6, 0), 17);
}

interface TodayHours { openHour: number; closeHour: number }

function parseTodayOpenClose(regularOpeningHours?: { periods?: any[] }): TodayHours | null {
  const periods = regularOpeningHours?.periods;
  if (!periods?.length) return null;

  const jsDay = new Date().getDay(); // 0=Sun … 6=Sat

  // Find a period whose open.day matches today
  const period = periods.find((p: any) => p.open?.day === jsDay);
  if (!period) return null;

  const openHour: number = period.open?.hour ?? 0;

  let closeHour: number;
  if (!period.close) {
    // No explicit close — treat as 24 hours from open
    closeHour = openHour + 24;
  } else if (period.close.day !== period.open.day) {
    // Closes the next calendar day
    closeHour = period.close.hour + 24;
  } else if (period.close.hour <= openHour) {
    // Close hour looks earlier than open on the same day-of-week — crosses midnight
    closeHour = period.close.hour + 24;
  } else {
    closeHour = period.close.hour;
  }

  return { openHour, closeHour };
}

function getTodayHours(regularOpeningHours?: { weekdayDescriptions?: string[] }): string {
  const descs = regularOpeningHours?.weekdayDescriptions;
  if (!descs?.length) return 'Hours unavailable';
  const jsDay = new Date().getDay(); // 0 = Sunday
  const googleIdx = jsDay === 0 ? 6 : jsDay - 1; // Google: 0 = Monday
  const desc = descs[googleIdx] ?? '';
  const colonIdx = desc.indexOf(':');
  return colonIdx >= 0 ? desc.slice(colonIdx + 2) : desc;
}

function getPhotoUrl(photos?: Array<{ name: string }>): string | undefined {
  if (!photos?.length || !API_KEY) return undefined;
  return `https://places.googleapis.com/v1/${photos[0].name}/media?maxWidthPx=400&key=${API_KEY}`;
}

function mapGoogleReviews(reviews?: any[]): GoogleReview[] {
  if (!reviews?.length) return [];
  return reviews.slice(0, 5).map(r => ({
    authorName:    r.authorAttribution?.displayName ?? 'Anonymous',
    authorPhotoUri: r.authorAttribution?.photoUri,
    rating:        r.rating ?? 0,
    text:          r.text?.text ?? r.originalText?.text ?? '',
    relativeTime:  r.relativePublishTimeDescription ?? '',
  }));
}

export function mapGooglePlace(
  place: any,
  userLat?: number,
  userLng?: number,
): Location {
  const type = getLocationType(place.types ?? []);

  const lat = place.location?.latitude ?? 0;
  const lng = place.location?.longitude ?? 0;
  const distKm =
    userLat != null && userLng != null
      ? haversineKm(userLat, userLng, lat, lng)
      : null;

  const busyHours = DEFAULT_BUSY_HOURS[type];
  const typicalCrowd = busyLevelFromPercent(busyHours[currentBusyHoursIndex()]);

  // currentOpeningHours is the most accurate (handles special/holiday hours);
  // fall back to regularOpeningHours when absent.
  const openNow: boolean | undefined =
    place.currentOpeningHours?.openNow ??
    place.regularOpeningHours?.openNow ??
    undefined;

  const todayHours = parseTodayOpenClose(place.regularOpeningHours);

  return {
    id:                place.id,
    placeId:           place.id,
    name:              place.displayName?.text ?? 'Unknown',
    type,
    address:           place.shortFormattedAddress ?? place.formattedAddress ?? '',
    distance:          distKm != null ? formatDistance(distKm) : '',
    currentCrowd:      typicalCrowd,
    reportCount:       0,
    rating:            place.rating ?? 0,
    googleReviewCount: place.userRatingCount ?? 0,
    googleReviews:     mapGoogleReviews(place.reviews),
    hours:             getTodayHours(place.regularOpeningHours),
    coordinates:       { lat, lng },
    description:       place.editorialSummary?.text ?? '',
    busyHours,
    photoUrl:          getPhotoUrl(place.photos),
    openNow,
    openHour:          todayHours?.openHour,
    closeHour:         todayHours?.closeHour,
  };
}

function placesHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': API_KEY,
    'X-Goog-FieldMask': FIELD_MASK,
  };
}

const HOME_FEED_TYPES = ['gym', 'bar', 'restaurant', 'night_club', 'cafe', 'fitness_center'];

// Place Details uses field names without the 'places.' prefix
const DETAIL_FIELD_MASK = FIELD_MASK.split(',').map(f => f.replace('places.', '')).join(',');

export async function searchNearby(
  lat: number,
  lng: number,
  radiusMeters = 3000,
  overrideTypes?: string[],
): Promise<Location[]> {
  if (!API_KEY) return [];
  try {
    const res = await fetch(`${BASE}:searchNearby`, {
      method: 'POST',
      headers: placesHeaders(),
      body: JSON.stringify({
        includedTypes: overrideTypes ?? HOME_FEED_TYPES,
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: radiusMeters,
          },
        },
      }),
    });
    if (!res.ok) {
      console.warn('searchNearby HTTP error:', res.status, await res.text());
      return [];
    }
    const data = await res.json();
    return (data.places ?? []).map((p: any) => mapGooglePlace(p, lat, lng));
  } catch (err) {
    console.error('searchNearby:', err);
    return [];
  }
}

export async function searchText(
  query: string,
  userLat?: number,
  userLng?: number,
): Promise<Location[]> {
  if (!API_KEY || !query.trim()) return [];
  try {
    const body: Record<string, any> = { textQuery: query };
    if (userLat != null && userLng != null) {
      body.locationBias = {
        circle: {
          center: { latitude: userLat, longitude: userLng },
          radius: 10000,
        },
      };
    }
    const res = await fetch(`${BASE}:searchText`, {
      method: 'POST',
      headers: placesHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.warn('searchText HTTP error:', res.status, await res.text());
      return [];
    }
    const data = await res.json();
    return (data.places ?? []).map((p: any) => mapGooglePlace(p, userLat, userLng));
  } catch (err) {
    console.error('searchText:', err);
    return [];
  }
}

/**
 * Fetch a single place by its Google Place ID.
 * Used as a fallback when the detail screen can't find a location in the local cache
 * (e.g. the user navigated from a search result that wasn't in the nearby feed).
 */
export async function fetchPlaceDetails(
  placeId: string,
  userLat?: number,
  userLng?: number,
): Promise<Location | null> {
  if (!API_KEY || !placeId) return null;
  try {
    const res = await fetch(`${BASE}/${placeId}`, {
      headers: {
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': DETAIL_FIELD_MASK,
      },
    });
    if (!res.ok) {
      console.warn('fetchPlaceDetails HTTP error:', res.status, await res.text());
      return null;
    }
    const place = await res.json();
    return mapGooglePlace(place, userLat, userLng);
  } catch (err) {
    console.error('fetchPlaceDetails:', err);
    return null;
  }
}
