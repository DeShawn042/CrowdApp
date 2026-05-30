-- ============================================================
-- CrowdApp — Migration 004: Grant table permissions
-- PASTE AND RUN THIS IN: Supabase → SQL Editor → New query
--
-- Why this is needed:
--   Migrations 001-003 created RLS policies but never granted
--   table-level SELECT/INSERT/UPDATE/DELETE to the anon and
--   authenticated roles. PostgreSQL checks table grants BEFORE
--   evaluating RLS policies, so "permission denied" was thrown
--   before any policy could allow the operation.
-- ============================================================

-- Allow both unauthenticated (anon) and authenticated users to
-- use the public schema and all its tables/sequences.
grant usage on schema public to anon, authenticated;

grant select, insert, update, delete
  on crowd_reports, reviews, review_photos,
     user_report_flags, user_favorites,
     business_claims, business_owner_info, review_responses
  to anon, authenticated;

-- Sequences are needed for any serial/bigserial primary keys
grant usage, select on all sequences in schema public to anon, authenticated;

-- Also set default privileges so any future tables you create
-- automatically inherit these grants.
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;

alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated;
