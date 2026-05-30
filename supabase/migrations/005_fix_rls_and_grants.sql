-- ============================================================
-- CrowdApp — Migration 005: Fix RLS policies and table grants
-- PASTE AND RUN THIS IN: Supabase → SQL Editor → New query
--
-- Two problems fixed here:
--
-- Problem 1 — Missing table-level GRANTs
--   Migrations 001-003 enabled RLS and created policies but never
--   ran GRANT on the tables. PostgreSQL checks table-level grants
--   BEFORE evaluating RLS policies, so every request hit a hard
--   "permission denied" before any policy was even considered.
--
-- Problem 2 — Policies scoped to `anon` only
--   All existing policies used `to anon`, meaning they only apply
--   to unauthenticated requests. Signed-in users operate as the
--   `authenticated` role — which had zero policies — so Supabase
--   denied all reads and writes for logged-in users.
-- ============================================================

-- ── Step 1: Grant schema + table access ──────────────────────
grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on
  crowd_reports,
  reviews,
  review_photos,
  user_report_flags,
  user_favorites,
  business_claims,
  business_owner_info,
  review_responses
to anon, authenticated;

grant usage, select on all sequences in schema public to anon, authenticated;

-- Future tables will inherit these grants automatically
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;

alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated;


-- ── Step 2: Drop the broken anon-only policies ───────────────
drop policy if exists "public_all" on crowd_reports;
drop policy if exists "public_all" on reviews;
drop policy if exists "public_all" on review_photos;
drop policy if exists "public_all" on user_report_flags;
drop policy if exists "public_all" on user_favorites;
drop policy if exists "public_all" on business_claims;
drop policy if exists "public_all" on business_owner_info;
drop policy if exists "public_all" on review_responses;


-- ── Step 3: Create correct policies ──────────────────────────
-- Without a `to <role>` clause, a policy applies to ALL roles
-- (anon, authenticated, and any others). `using (true)` allows
-- reading all rows; `with check (true)` allows all writes.
-- This is intentionally permissive for a development prototype.

create policy "allow_all" on crowd_reports
  for all using (true) with check (true);

create policy "allow_all" on reviews
  for all using (true) with check (true);

create policy "allow_all" on review_photos
  for all using (true) with check (true);

create policy "allow_all" on user_report_flags
  for all using (true) with check (true);

create policy "allow_all" on user_favorites
  for all using (true) with check (true);

create policy "allow_all" on business_claims
  for all using (true) with check (true);

create policy "allow_all" on business_owner_info
  for all using (true) with check (true);

create policy "allow_all" on review_responses
  for all using (true) with check (true);
