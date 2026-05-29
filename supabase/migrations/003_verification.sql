-- ============================================================
-- CrowdApp — Migration 003: Enhanced Claim Verification
-- Run after 002_favorites_owners.sql
-- ============================================================

-- Add verification columns to business_claims
alter table business_claims
  add column if not exists verification_doc_url text,
  add column if not exists auto_verified         boolean default false,
  add column if not exists website_domain        text;

-- ── Storage bucket for verification documents ────────────────
-- Create in Supabase dashboard: Storage → New bucket
--   Name:   verification-docs
--   Public: false  ← private; admins review via Supabase dashboard
--
-- Add a permissive INSERT policy so the anon key can upload:
--   create policy "anon_upload" on storage.objects
--     for insert to anon with check (bucket_id = 'verification-docs');
--
-- Admin approval workflow (run manually in SQL editor):
--   -- Auto-verify from claim:
--   insert into business_owner_info (location_id, owner_user_id, is_verified)
--   select location_id, user_id, true from business_claims
--   where id = '<claim-uuid>' and auto_verified = true
--   on conflict (location_id) do update set is_verified = true, updated_at = now();
--
--   -- Manual approval after reviewing uploaded doc:
--   insert into business_owner_info (location_id, owner_user_id, is_verified)
--   select location_id, user_id, true from business_claims
--   where id = '<claim-uuid>'
--   on conflict (location_id) do update set is_verified = true, updated_at = now();
--
--   update business_claims set status = 'approved' where id = '<claim-uuid>';
