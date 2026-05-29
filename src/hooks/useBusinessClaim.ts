import { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const CURRENT_USER_ID = 'u1';

export interface OwnerInfo {
  description?: string;
  hours?: string;
  amenities?: string[];
  isVerified: boolean;
}

interface ClaimState {
  isClaimed:          boolean;
  isCurrentUserOwner: boolean;
  ownerInfo:          OwnerInfo | null;
  myClaimStatus:      'none' | 'pending' | 'approved' | 'rejected';
}

export function useBusinessClaim(locationId: string) {
  const [state, setState] = useState<ClaimState>({
    isClaimed: false, isCurrentUserOwner: false, ownerInfo: null, myClaimStatus: 'none',
  });
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }

    const [{ data: ownerInfo }, { data: myClaim }] = await Promise.all([
      supabase.from('business_owner_info').select('*').eq('location_id', locationId).maybeSingle(),
      supabase.from('business_claims')
        .select('status')
        .eq('location_id', locationId)
        .eq('user_id', CURRENT_USER_ID)
        .maybeSingle(),
    ]);

    setState({
      isClaimed:          !!ownerInfo,
      isCurrentUserOwner: ownerInfo?.owner_user_id === CURRENT_USER_ID,
      ownerInfo: ownerInfo
        ? { description: ownerInfo.description, hours: ownerInfo.hours, amenities: ownerInfo.amenities, isVerified: ownerInfo.is_verified }
        : null,
      myClaimStatus: (myClaim?.status ?? 'none') as ClaimState['myClaimStatus'],
    });
    setLoading(false);
  }, [locationId]);

  useEffect(() => { fetch(); }, [fetch]);

  async function submitClaim(ownerName: string, ownerEmail: string, role: string): Promise<string | null> {
    if (!isSupabaseConfigured) return 'Supabase is not configured yet.';
    try {
      await supabase.from('business_claims').upsert(
        { location_id: locationId, user_id: CURRENT_USER_ID, owner_name: ownerName, owner_email: ownerEmail, business_role: role, status: 'pending' },
        { onConflict: 'location_id,user_id' }
      );
      setState(s => ({ ...s, myClaimStatus: 'pending' }));
      return null;
    } catch (err: any) {
      return err.message ?? 'Failed to submit claim.';
    }
  }

  async function submitOwnerResponse(reviewId: string, content: string): Promise<string | null> {
    if (!isSupabaseConfigured) return 'Supabase is not configured yet.';
    try {
      await supabase.from('review_responses').upsert(
        { review_id: reviewId, owner_user_id: CURRENT_USER_ID, location_id: locationId, content },
        { onConflict: 'review_id' }
      );
      return null;
    } catch (err: any) {
      return err.message ?? 'Failed to post response.';
    }
  }

  return { ...state, loading, submitClaim, submitOwnerResponse, refresh: fetch };
}
