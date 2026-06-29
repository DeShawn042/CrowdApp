import { useCallback, useEffect, useState } from 'react';
import { ImagePickerAsset } from 'expo-image-picker';
import { Review } from '@/data/mockData';
import { currentUserId, currentUserName, isSupabaseConfigured, supabase } from '@/lib/supabase';
import { checkToxicity } from '@/utils/perspectiveApi';

const CACHE_TTL      = 60 * 1000;            // 1 minute
const TWO_MONTHS_MS  = 60 * 24 * 60 * 60 * 1000;
const DAY_MS         = 24 * 60 * 60 * 1000;
const DAILY_LIMIT    = 5;
const ACCOUNT_AGE_H  = 24;

const cache = new Map<string, { data: Review[]; ts: number }>();

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function fmtMonthYear(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

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

export function useReviews(locationId: string) {
  const [reviews,            setReviews]            = useState<Review[]>([]);
  const [verifiedVisitorIds, setVerifiedVisitorIds] = useState<Set<string>>(new Set());
  const [loading,            setLoading]            = useState(true);
  const [error,              setError]              = useState<string | null>(null);

  // User's most recent review for this location (for editing / 2-month gate)
  const myLatestReview = reviews
    .filter(r => r.userId === currentUserId && !!currentUserId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null;

  // Whether user can submit a brand-new review
  const canWriteNewReview = !myLatestReview || (
    Date.now() - new Date(myLatestReview.createdAt).getTime() >= TWO_MONTHS_MS
  );

  // Date label shown on each review: "Reviewed March 2026"
  function reviewedLabel(review: Review) {
    return `Reviewed ${fmtMonthYear(review.createdAt)}`;
  }

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
      .select('id, location_id, user_id, user_name, display_name, rating, content, created_at, updated_at, flag_count, is_hidden, review_photos(storage_url), review_responses(content)')
      .eq('location_id', locationId)
      .order('created_at', { ascending: false });

    if (err) { setError(err.message); setLoading(false); return; }

    const mapped = (data ?? []).map(mapRow);
    cache.set(locationId, { data: mapped, ts: Date.now() });
    setReviews(mapped);
    setLoading(false);

    // Fetch verified visitor IDs (batch — one query per report type)
    const reviewerIds = mapped
      .map(r => r.userId)
      .filter((id): id is string => !!id);

    if (reviewerIds.length > 0) {
      const [{ data: crowdData }, { data: quickData }] = await Promise.all([
        supabase.from('crowd_reports').select('user_id').eq('location_id', locationId).in('user_id', reviewerIds),
        supabase.from('location_reports').select('user_id').eq('place_id', locationId).in('user_id', reviewerIds),
      ]);
      setVerifiedVisitorIds(new Set([
        ...(crowdData ?? []).map(r => r.user_id),
        ...(quickData ?? []).map(r => r.user_id),
      ]));
    }
  }, [locationId]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  // ── Submit (new or edit) ──────────────────────────────────────────────────
  // Pass existingReviewId to edit; null to create a new review.
  async function submitReview(
    rating: number,
    content: string,
    newPhotos: ImagePickerAsset[],
    keptPhotoUrls: string[] = [],
    existingReviewId: string | null = null,
  ): Promise<string | null> {
    const { flagged } = await checkToxicity(content);
    if (flagged) return 'Please keep your review respectful before submitting.';

    if (!isSupabaseConfigured) return 'Supabase is not configured yet. Add your env vars to .env.';

    const isEdit = !!existingReviewId;

    if (!isEdit) {
      // ── Guard 1: Account age (24 hours) ────────────────────────────────
      const { data: { session } } = await supabase.auth.getSession();
      const createdAt = session?.user?.created_at;
      if (createdAt) {
        const ageHours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
        if (ageHours < ACCOUNT_AGE_H) {
          return 'Reviews are available 24 hours after account creation. This helps us maintain review quality for the community.';
        }
      }

      // ── Guard 2: Daily rate limit (5 reviews / 24 h) ───────────────────
      const { count: todayCount } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUserId)
        .gte('created_at', new Date(Date.now() - DAY_MS).toISOString());
      if ((todayCount ?? 0) >= DAILY_LIMIT) {
        return "You've reached the daily review limit. Come back tomorrow to share more experiences!";
      }

      // ── Guard 3: 2-month window ────────────────────────────────────────
      if (myLatestReview) {
        const ageMs = Date.now() - new Date(myLatestReview.createdAt).getTime();
        if (ageMs < TWO_MONTHS_MS) {
          const nextDate = new Date(new Date(myLatestReview.createdAt).getTime() + TWO_MONTHS_MS);
          return `You reviewed this place on ${fmtDate(myLatestReview.createdAt)}. You can edit your existing review or submit a new one after ${fmtDate(nextDate.toISOString())}.`;
        }
      }
    }

    try {
      let reviewId: string;

      if (isEdit) {
        const { error: err } = await supabase
          .from('reviews')
          .update({ rating, content, updated_at: new Date().toISOString() })
          .eq('id', existingReviewId);
        if (err) throw err;
        reviewId = existingReviewId;

        // Remove photos the user deleted
        const editTarget = reviews.find(r => r.id === existingReviewId);
        if (editTarget) {
          const removedUrls = editTarget.photos.filter(u => !keptPhotoUrls.includes(u));
          if (removedUrls.length > 0) {
            const paths = removedUrls.map(u => u.split('/review-photos/')[1]).filter(Boolean);
            if (paths.length) await supabase.storage.from('review-photos').remove(paths);
            await supabase.from('review_photos').delete().in('storage_url', removedUrls);
          }
        }
      } else {
        const { data, error: err } = await supabase
          .from('reviews')
          .insert({
            location_id:  locationId,
            user_id:      currentUserId,
            user_name:    currentUserName,
            display_name: currentUserName ?? null,
            rating,
            content,
          })
          .select('id')
          .single();
        if (err) throw err;
        reviewId = data.id;
      }

      // Upload new photos
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

      // Award review points (fire-and-forget, only for new reviews not edits)
      if (!isEdit) {
        const hasPhotos = newPhotos.length > 0;
        supabase.rpc('award_gamification_points', {
          p_points:     hasPhotos ? 20 : 10,
          p_is_report:  false,
          p_is_pioneer: false,
        }).then(() => {}).catch(() => {});
      }

      return null;
    } catch (err: any) {
      return err.message ?? 'Failed to save review. Please try again.';
    }
  }

  // ── Flag a review ─────────────────────────────────────────────────────────
  async function flagReview(reviewId: string): Promise<void> {
    if (!isSupabaseConfigured || !currentUserId) return;
    await supabase.rpc('flag_review', { p_review_id: reviewId, p_user_id: currentUserId });
    cache.delete(locationId);
    await fetchReviews();
  }

  // ── Delete a review ───────────────────────────────────────────────────────
  async function deleteReview(reviewId: string): Promise<string | null> {
    if (!isSupabaseConfigured || !currentUserId) return 'Not authenticated.';
    try {
      const target = reviews.find(r => r.id === reviewId);
      if (target?.photos && target.photos.length > 0) {
        const paths = target.photos.map(u => u.split('/review-photos/')[1]).filter(Boolean);
        if (paths.length) await supabase.storage.from('review-photos').remove(paths);
        await supabase.from('review_photos').delete().eq('review_id', reviewId);
      }
      const { error: err } = await supabase.from('reviews').delete().eq('id', reviewId).eq('user_id', currentUserId);
      if (err) throw err;
      cache.delete(locationId);
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      return null;
    } catch (err: any) {
      return err.message ?? 'Failed to delete review.';
    }
  }

  return {
    reviews,
    myReview: myLatestReview,      // alias for backwards compat
    myLatestReview,
    canWriteNewReview,
    reviewedLabel,
    verifiedVisitorIds,
    averageRating,
    loading,
    error,
    submitReview,
    flagReview,
    deleteReview,
    refresh: fetchReviews,
  };
}
