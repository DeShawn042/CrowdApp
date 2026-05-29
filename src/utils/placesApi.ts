import { Location } from '@/data/mockData';

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

// ── Domain-matching helpers ───────────────────────────────────

/** Extract the registrable domain from a URL or email address. */
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

/** True when both inputs share the same base domain (ignores sub-domains). */
export function domainsMatch(a: string, b: string): boolean {
  const base = (d: string) => d.toLowerCase().replace(/^www\./, '').split('.').slice(-2).join('.');
  return base(a) === base(b);
}

/** Fetch the business website URL from Google Places for a given name + address. */
export async function fetchBusinessWebsite(name: string, address: string): Promise<string | null> {
  if (!API_KEY) return null;
  try {
    const query = encodeURIComponent(`${name} ${address}`);
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${query}&inputtype=textquery&fields=website&key=${API_KEY}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.candidates?.[0]?.website ?? null;
  } catch {
    return null;
  }
}

// ── Photo helpers ─────────────────────────────────────────────

export async function fetchPlacesPhotoUrl(location: Location): Promise<string | null> {
  if (!API_KEY) return null;
  try {
    const query = encodeURIComponent(`${location.name} ${location.address}`);
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${query}&inputtype=textquery&fields=photos&key=${API_KEY}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const photoRef = data.candidates?.[0]?.photos?.[0]?.photo_reference;
    if (!photoRef) return null;
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoRef}&key=${API_KEY}`;
  } catch {
    return null;
  }
}
