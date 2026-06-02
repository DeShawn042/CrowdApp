import { Location } from '@/data/mockData';

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '';
const BASE = 'https://places.googleapis.com/v1/places';

// ── Domain-matching helpers ───────────────────────────────────

export function extractDomain(input: string): string | null {
  const s = input.trim().toLowerCase();
  if (s.includes('@')) {
    const host = s.split('@')[1];
    return host ? host.replace(/^www\./, '') : null;
  }
  try {
    const url = new URL(s.startsWith('http') ? s : `https://${s}`);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function domainsMatch(a: string, b: string): boolean {
  const base = (d: string) =>
    d.toLowerCase().replace(/^www\./, '').split('.').slice(-2).join('.');
  return base(a) === base(b);
}

// ── Places API (New) helpers ──────────────────────────────────

async function textSearchSingleField(
  query: string,
  fieldMask: string,
): Promise<any> {
  if (!API_KEY) return null;
  try {
    const res = await fetch(`${BASE}:searchText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify({ textQuery: query }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Fetch the business website URL from Google Places for a given name + address. */
export async function fetchBusinessWebsite(
  name: string,
  address: string,
): Promise<string | null> {
  const data = await textSearchSingleField(
    `${name} ${address}`,
    'places.websiteUri',
  );
  return data?.places?.[0]?.websiteUri ?? null;
}

// ── Photo helpers ─────────────────────────────────────────────

/**
 * Fetch the first photo URL for a location.
 * Uses the place_id (field mask: photos) for a precise, fast lookup.
 * Falls back to a text search using name + address if the place_id fetch fails.
 */
export async function fetchPlacesPhotoUrl(location: Location): Promise<string | null> {
  if (!API_KEY) return null;

  // Fast path: fetch by place_id directly
  if (location.id) {
    try {
      const res = await fetch(`${BASE}/${location.id}?fields=photos`, {
        headers: {
          'X-Goog-Api-Key': API_KEY,
          'X-Goog-FieldMask': 'photos',
        },
      });
      if (res.ok) {
        const data = await res.json();
        const photoName = data?.photos?.[0]?.name;
        if (photoName) {
          return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=400&key=${API_KEY}`;
        }
      }
    } catch {
      // fall through to text search
    }
  }

  // Fallback: text search by name + address
  const data = await textSearchSingleField(
    `${location.name} ${location.address}`,
    'places.photos',
  );
  const photoName = data?.places?.[0]?.photos?.[0]?.name;
  if (!photoName) return null;
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=400&key=${API_KEY}`;
}
