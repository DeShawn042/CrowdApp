import { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type ReviewModeFilter = 'flagged' | 'newest';

export interface AdminReview {
  id: string;
  locationId: string;
  userId: string | null;
  displayName: string | null;
  userName: string;
  rating: number;
  content: string;
  createdAt: string;
  flagCount: number;
  isHidden: boolean;
}

export function useAdminReviews() {
  const [reviews,  setReviews]  = useState<AdminReview[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<ReviewModeFilter>('flagged');

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    setLoading(true);

    let q = supabase
      .from('reviews')
      .select('id, location_id, user_id, display_name, user_name, rating, content, created_at, flag_count, is_hidden')
      .limit(100);

    if (filter === 'flagged') {
      q = q.order('flag_count', { ascending: false });
    } else {
      q = q.order('created_at', { ascending: false });
    }

    const { data } = await q;
    setReviews((data ?? []).map(r => ({
      id:          r.id,
      locationId:  r.location_id,
      userId:      r.user_id ?? null,
      displayName: r.display_name ?? null,
      userName:    r.user_name ?? '',
      rating:      r.rating,
      content:     r.content,
      createdAt:   r.created_at,
      flagCount:   r.flag_count ?? 0,
      isHidden:    r.is_hidden ?? false,
    })));
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function deleteReview(id: string) {
    await supabase.from('reviews').delete().eq('id', id);
    await load();
  }

  async function restoreReview(id: string) {
    await supabase
      .from('reviews')
      .update({ is_hidden: false, flag_count: 0 })
      .eq('id', id);
    await supabase.from('review_flags').delete().eq('review_id', id);
    await load();
  }

  return { reviews, loading, filter, setFilter, deleteReview, restoreReview, reload: load };
}
