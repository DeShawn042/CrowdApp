import { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { domainsMatch, extractDomain, fetchBusinessWebsite } from '@/utils/placesApi';

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

async function uploadVerificationDoc(uri: string, locationId: string): Promise<string> {
  const rawExt = uri.split('.').pop()?.split('?')[0]?.toLowerCase() ?? 'jpg';
  const ext = ['jpg', 'jpeg', 'png', 'pdf', 'heic'].includes(rawExt) ? rawExt : 'jpg';
  const path = `${locationId}/${CURRENT_USER_ID}/${Date.now()}.${ext}`;
  const res = await fetch(uri);
  const blob = await res.blob();
  const { error } = await supabase.storage
    .from('verification-docs')
    .upload(path, blob, { contentType: blob.type || `image/${ext}`, upsert: true });
  if (error) throw new Error(error.message);
  // Return the storage path — admins access via Supabase dashboard
  return path;
}

export function useBusinessClaim(
  locationId: string,
  locationName?: string,
  locationAddress?: string,
) {
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
      ownerInfo: ownerInfo ? {
        description: ownerInfo.description,
        hours:       ownerInfo.hours,
        amenities:   ownerInfo.amenities,
        isVerified:  ownerInfo.is_verified,
      } : null,
      myClaimStatus: (myClaim?.status ?? 'none') as ClaimState['myClaimStatus'],
    });
    setLoading(false);
  }, [locationId]);

  useEffect(() => { fetch(); }, [fetch]);

  /**
   * Submit a business ownership claim.
   *
   * Verification path:
   *   1. Fetch the business website from Google Places.
   *   2. Compare email domain against the website domain.
   *   3a. Match → mark auto_verified, immediately create business_owner_info row.
   *   3b. No match (or no website) → store uploaded doc path; claim stays pending
   *       for admin review via Supabase dashboard.
   */
  async function submitClaim(
    ownerName: string,
    ownerEmail: string,
    role: string,
    docUri?: string,
  ): Promise<string | null> {
    if (!isSupabaseConfigured) return 'Supabase is not configured yet.';

    try {
      // ── Step 1: domain check ───────────────────────────────
      const website     = locationName && locationAddress
        ? await fetchBusinessWebsite(locationName, locationAddress)
        : null;
      const websiteDomain = website ? extractDomain(website) : null;
      const emailDomain   = extractDomain(ownerEmail);

      const autoVerified =
        !!emailDomain &&
        !!websiteDomain &&
        domainsMatch(emailDomain, websiteDomain);

      // ── Step 2: upload proof document if provided ──────────
      let docPath: string | null = null;
      if (docUri && !autoVerified) {
        docPath = await uploadVerificationDoc(docUri, locationId);
      }

      // ── Step 3: upsert claim record ────────────────────────
      await supabase.from('business_claims').upsert(
        {
          location_id:          locationId,
          user_id:              CURRENT_USER_ID,
          owner_name:           ownerName,
          owner_email:          ownerEmail,
          business_role:        role,
          status:               autoVerified ? 'approved' : 'pending',
          auto_verified:        autoVerified,
          website_domain:       websiteDomain ?? null,
          verification_doc_url: docPath,
        },
        { onConflict: 'location_id,user_id' }
      );

      // ── Step 4: auto-verify → create owner info row ────────
      if (autoVerified) {
        await supabase.from('business_owner_info').upsert(
          {
            location_id:   locationId,
            owner_user_id: CURRENT_USER_ID,
            is_verified:   true,
            updated_at:    new Date().toISOString(),
          },
          { onConflict: 'location_id' }
        );
        setState(s => ({
          ...s,
          isClaimed:          true,
          isCurrentUserOwner: true,
          myClaimStatus:      'approved',
          ownerInfo:          { isVerified: true },
        }));
      } else {
        setState(s => ({ ...s, myClaimStatus: 'pending' }));
      }

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
