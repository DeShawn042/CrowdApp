import { Location } from '@/data/mockData';

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

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
