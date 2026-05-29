import { useCallback, useEffect, useState } from 'react';
import { ImagePickerAsset } from 'expo-image-picker';
import { Review } from '@/data/mockData';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { checkToxicity } from '@/utils/perspectiveApi';

const CURRENT_USER_ID   = 'u1';
const CURRENT_USER_NAME = 'DeShawn';
const CACHE_TTL = 60 * 1000; // 1 minute

const cache = new Map<string, { data: Review[]; ts: number }>();

async function uploadPhoto(uri: string, reviewId: string, index: number): Promise<string> {
  const rawExt = uri.split('.').pop()?.split('?')[0]?.toLowerCase() ?? 'jpg';
  const ext = ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(rawExt) ? rawExt : 'jpg';
  const fileName = `${reviewId}/${Date.now()}_${index}.${ext}`;
  const res = await fetch(uri);
  const blob = await res.blob();
  const { error } = await supabase.storage
    .from('review-photos')
    .upload(fileName, blob, { contentType: blob.type || `image/${ext}`, upsert: false });
  if (error) throw new Error(error.message);
  return supabase.storage.from('review-photos').getPublicUrl(fileName).data.publicUrl;
}

function mapRow(r: any): Review {
  return {
    id: r.id,
    locationId: r.location_id,
    userId: r.user_id,
    userName: r.user_name,
    rating: r.rating,
    content: r.content,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    photos: (r.review_photos ?? []).map((p: any) => p.storage_url),
    ownerResponse: r.review_responses?.[0]?.content ?? undefined,
  };
}

export function useReviews(locationId: string) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const myReview = reviews.find(r => r.userId === CURRENT_USER_ID) ?? null;
  const averageRating =
    reviews.length > 0
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
      : null;

  const fetchReviews = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }

    const cached = cache.get(locationId);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setReviews(cached.data);
      setLoading(false);
      return;
    }

    const { data, error: err } = await supabase
      .from('reviews')
      .select('id, location_id, user_id, user_name, rating, content, created_at, updated_at, review_photos(storage_url), review_responses(content)')
      .eq('location_id', locationId)
      .order('created_at', { ascending: false });

    if (err) { setError(err.message); setLoading(false); return; }

    const mapped = (data ?? []).map(mapRow);
    cache.set(locationId, { data: mapped, ts: Date.now() });
    setReviews(mapped);
    setLoading(false);
  }, [locationId]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  async function submitReview(
    rating: number,
    content: string,
    newPhotos: ImagePickerAsset[],
    keptPhotoUrls: string[] = []
  ): Promise<string | null> {
    const { flagged } = await checkToxicity(content);
    if (flagged) return 'Please keep your review respectful before submitting.';

    if (!isSupabaseConfigured) return 'Supabase is not configured yet. Add your env vars to .env.';

    try {
      const isEdit = !!myReview;
      let reviewId: string;

      if (isEdit) {
        const { error: err } = await supabase
          .from('reviews')
          .update({ rating, content, updated_at: new Date().toISOString() })
          .eq('id', myReview.id);
        if (err) throw err;
        reviewId = myReview.id;

        // Delete photos the user removed
        const removedUrls = myReview.photos.filter(u => !keptPhotoUrls.includes(u));
        if (removedUrls.length > 0) {
          const paths = removedUrls
            .map(u => u.split('/review-photos/')[1])
            .filter(Boolean);
          if (paths.length) await supabase.storage.from('review-photos').remove(paths);
          await supabase.from('review_photos').delete().in('storage_url', removedUrls);
        }
      } else {
        const { data, error: err } = await supabase
          .from('reviews')
          .insert({ location_id: locationId, user_id: CURRENT_USER_ID, user_name: CURRENT_USER_NAME, rating, content })
          .select('id')
          .single();
        if (err) throw err;
        reviewId = data.id;
      }

      // Upload and record new photos
      if (newPhotos.length > 0) {
        const uploadedUrls = await Promise.all(
          newPhotos.map((a, i) => uploadPhoto(a.uri, reviewId, i))
        );
        await supabase.from('review_photos').insert(
          uploadedUrls.map(url => ({ review_id: reviewId, storage_url: url }))
        );
      }

      cache.delete(locationId);
      await fetchReviews();
      return null;
    } catch (err: any) {
      return err.message ?? 'Failed to save review. Please try again.';
    }
  }

  return { reviews, myReview, averageRating, loading, error, submitReview, refresh: fetchReviews };
}
