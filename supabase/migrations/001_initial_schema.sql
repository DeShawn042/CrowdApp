-- ============================================================
-- CrowdApp — Initial Schema
-- Run this in Supabase → SQL Editor after creating your project
-- ============================================================

-- Crowd reports (persistent, replaces ephemeral in-memory state)
create table crowd_reports (
  id              uuid        primary key default gen_random_uuid(),
  location_id     text        not null,
  user_id         text        not null,
  user_name       text        not null,
  crowd_level     text        not null check (crowd_level in ('empty','light','moderate','packed')),
  comment         text,
  is_flagged_user boolean     default false,
  created_at      timestamptz default now()
);

create index crowd_reports_location_idx      on crowd_reports (location_id, created_at desc);
create index crowd_reports_user_location_idx on crowd_reports (user_id, location_id, created_at desc);

-- Reviews (one per user per location, enforced by unique constraint)
create table reviews (
  id          uuid        primary key default gen_random_uuid(),
  location_id text        not null,
  user_id     text        not null,
  user_name   text        not null,
  rating      int         not null check (rating between 1 and 5),
  content     text        not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (user_id, location_id)
);

create index reviews_location_idx on reviews (location_id, created_at desc);

-- Review photos (cascade-deleted when the review is deleted)
create table review_photos (
  id          uuid        primary key default gen_random_uuid(),
  review_id   uuid        not null references reviews(id) on delete cascade,
  storage_url text        not null,
  created_at  timestamptz default now()
);

create index review_photos_review_idx on review_photos (review_id);

-- User report flags (tracks outlier behaviour per user+location)
create table user_report_flags (
  id              uuid        primary key default gen_random_uuid(),
  user_id         text        not null,
  location_id     text        not null,
  divergent_count int         default 0,
  is_flagged      boolean     default false,
  updated_at      timestamptz default now(),
  unique (user_id, location_id)
);

-- ── Row-Level Security ──────────────────────────────────────
-- Open policies for prototyping (tighten once real auth is added)
alter table crowd_reports      enable row level security;
alter table reviews            enable row level security;
alter table review_photos      enable row level security;
alter table user_report_flags  enable row level security;

create policy "public_all" on crowd_reports      for all to anon using (true) with check (true);
create policy "public_all" on reviews            for all to anon using (true) with check (true);
create policy "public_all" on review_photos      for all to anon using (true) with check (true);
create policy "public_all" on user_report_flags  for all to anon using (true) with check (true);

-- ── Storage ─────────────────────────────────────────────────
-- In the Supabase dashboard: Storage → New bucket
--   Name:   review-photos
--   Public: true (so image URLs work without a signed token)
