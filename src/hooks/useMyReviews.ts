import { useCallback, useEffect, useState } from 'react';
import { Review } from '@/data/mockData';
import { currentUserId, isSupabaseConfigured, supabase } from '@/lib/supabase';

export interface MyReview extends Review {
  locationName?: string;
  locationPhoto?: string;
}

function mapRow(r: any): MyReview {
  return {
    id:           r.id,
    locationId:   r.location_id,
    userId:       r.user_id ?? null,
    userName:     r.user_name ?? '',
    displayName:  r.display_name ?? null,
    rating:       r.rating,
    content:      r.content,
    createdAt:    r.created_at,
    updatedAt:    r.updated_at,
    photos:       (r.review_photos ?? []).map((p: any) => p.storage_url),
    ownerResponse: r.review_responses?.[0]?.content ?? undefined,
    flagCount:    r.flag_count ?? 0,
    isHidden:     r.is_hidden ?? false,
  };
}

export function useMyReviews() {
  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!isSupabaseConfigured || !currentUserId) { setLoading(false); return; }
    setLoading(true);

    const { data, error } = await supabase
      .from('reviews')
      .select('id, location_id, user_id, user_name, display_name, rating, content, created_at, updated_at, flag_count, is_hidden, review_photos(storage_url), review_responses(content)')
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: false });

    if (error) { setLoading(false); return; }
    setReviews((data ?? []).map(mapRow));
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  async function deleteMyReview(reviewId: string): Promise<void> {
    if (!isSupabaseConfigured || !currentUserId) return;
    const target = reviews.find(r => r.id === reviewId);
    if (target?.photos && target.photos.length > 0) {
      const paths = target.photos.map(u => u.split('/review-photos/')[1]).filter(Boolean);
      if (paths.length) await supabase.storage.from('review-photos').remove(paths);
      await supabase.from('review_photos').delete().eq('review_id', reviewId);
    }
    await supabase.from('reviews').delete().eq('id', reviewId).eq('user_id', currentUserId);
    setReviews(prev => prev.filter(r => r.id !== reviewId));
  }

  return { reviews, loading, refresh: fetch, deleteMyReview };
}
