import { useEffect, useState } from 'react';
import { Location } from '@/data/mockData';
import { fetchPlacesPhotoUrl } from '@/utils/placesApi';

// Module-level cache so list re-renders don't trigger duplicate API calls
const cache = new Map<string, string | null>();

export function usePlacesPhoto(location: Location | undefined): string | null {
  const [url, setUrl] = useState<string | null>(location?.photoUrl ?? null);

  useEffect(() => {
    if (!location) return;
    if (location.photoUrl) return;

    if (cache.has(location.id)) {
      setUrl(cache.get(location.id) ?? null);
      return;
    }

    fetchPlacesPhotoUrl(location).then(result => {
      cache.set(location.id, result);
      setUrl(result);
    });
  }, [location?.id, location?.photoUrl]);

  return url;
}
