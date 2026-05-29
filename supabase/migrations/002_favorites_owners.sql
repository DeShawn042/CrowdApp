-- ============================================================
-- CrowdApp — Migration 002: Favorites & Business Owners
-- Run in Supabase → SQL Editor after 001_initial_schema.sql
-- ============================================================

-- User favorites (heart/save system)
create table if not exists user_favorites (
  user_id     text        not null,
  location_id text        not null,
  created_at  timestamptz default now(),
  primary key (user_id, location_id)
);
alter table user_favorites enable row level security;
create policy "public_all" on user_favorites for all to anon using (true) with check (true);

-- Business ownership claims (submitted by owners, reviewed by admin)
create table if not exists business_claims (
  id             uuid        primary key default gen_random_uuid(),
  location_id    text        not null,
  user_id        text        not null,
  owner_name     text        not null,
  owner_email    text        not null,
  business_role  text        not null,
  status         text        default 'pending' check (status in ('pending','approved','rejected')),
  created_at     timestamptz default now(),
  unique (location_id, user_id)
);
alter table business_claims enable row level security;
create policy "public_all" on business_claims for all to anon using (true) with check (true);

-- Owner info shown on location detail once claim is approved
create table if not exists business_owner_info (
  location_id   text        primary key,
  owner_user_id text        not null,
  description   text,
  hours         text,
  amenities     text[],
  photos        text[],
  is_verified   boolean     default false,
  updated_at    timestamptz default now()
);
alter table business_owner_info enable row level security;
create policy "public_all" on business_owner_info for all to anon using (true) with check (true);

-- Owner responses to user reviews (one response per review)
create table if not exists review_responses (
  id             uuid        primary key default gen_random_uuid(),
  review_id      uuid        not null references reviews(id) on delete cascade,
  owner_user_id  text        not null,
  location_id    text        not null,
  content        text        not null,
  created_at     timestamptz default now(),
  unique (review_id)
);
alter table review_responses enable row level security;
create policy "public_all" on review_responses for all to anon using (true) with check (true);

-- ── To approve a claim and create a verified owner (run manually): ──
-- insert into business_owner_info (location_id, owner_user_id, is_verified)
-- select location_id, user_id, true
-- from business_claims where status = 'pending' and id = '<claim-uuid>';
-- update business_claims set status = 'approved' where id = '<claim-uuid>';
