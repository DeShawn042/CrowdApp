-- ============================================================
-- CrowdApp — Combined Migration (001 + 002 + 003)
-- Paste the entire contents of this file into:
--   Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- ── TABLES ───────────────────────────────────────────────────

create table if not exists crowd_reports (
  id              uuid        primary key default gen_random_uuid(),
  location_id     text        not null,
  user_id         text        not null,
  user_name       text        not null,
  crowd_level     text        not null check (crowd_level in ('empty','light','moderate','packed')),
  comment         text,
  is_flagged_user boolean     default false,
  created_at      timestamptz default now()
);

create index if not exists crowd_reports_location_idx      on crowd_reports (location_id, created_at desc);
create index if not exists crowd_reports_user_location_idx on crowd_reports (user_id, location_id, created_at desc);

create table if not exists reviews (
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

create index if not exists reviews_location_idx on reviews (location_id, created_at desc);

create table if not exists review_photos (
  id          uuid        primary key default gen_random_uuid(),
  review_id   uuid        not null references reviews(id) on delete cascade,
  storage_url text        not null,
  created_at  timestamptz default now()
);

create index if not exists review_photos_review_idx on review_photos (review_id);

create table if not exists user_report_flags (
  id              uuid        primary key default gen_random_uuid(),
  user_id         text        not null,
  location_id     text        not null,
  divergent_count int         default 0,
  is_flagged      boolean     default false,
  updated_at      timestamptz default now(),
  unique (user_id, location_id)
);

create table if not exists user_favorites (
  user_id     text        not null,
  location_id text        not null,
  created_at  timestamptz default now(),
  primary key (user_id, location_id)
);

create table if not exists business_claims (
  id                   uuid        primary key default gen_random_uuid(),
  location_id          text        not null,
  user_id              text        not null,
  owner_name           text        not null,
  owner_email          text        not null,
  business_role        text        not null,
  status               text        default 'pending' check (status in ('pending','approved','rejected')),
  auto_verified        boolean     default false,
  website_domain       text,
  verification_doc_url text,
  created_at           timestamptz default now(),
  unique (location_id, user_id)
);

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

create table if not exists review_responses (
  id             uuid        primary key default gen_random_uuid(),
  review_id      uuid        not null references reviews(id) on delete cascade,
  owner_user_id  text        not null,
  location_id    text        not null,
  content        text        not null,
  created_at     timestamptz default now(),
  unique (review_id)
);

-- ── ROW-LEVEL SECURITY ────────────────────────────────────────

alter table crowd_reports      enable row level security;
alter table reviews            enable row level security;
alter table review_photos      enable row level security;
alter table user_report_flags  enable row level security;
alter table user_favorites     enable row level security;
alter table business_claims    enable row level security;
alter table business_owner_info enable row level security;
alter table review_responses   enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'crowd_reports'       and policyname = 'public_all') then
    create policy "public_all" on crowd_reports       for all to anon using (true) with check (true); end if;
  if not exists (select 1 from pg_policies where tablename = 'reviews'             and policyname = 'public_all') then
    create policy "public_all" on reviews             for all to anon using (true) with check (true); end if;
  if not exists (select 1 from pg_policies where tablename = 'review_photos'       and policyname = 'public_all') then
    create policy "public_all" on review_photos       for all to anon using (true) with check (true); end if;
  if not exists (select 1 from pg_policies where tablename = 'user_report_flags'   and policyname = 'public_all') then
    create policy "public_all" on user_report_flags   for all to anon using (true) with check (true); end if;
  if not exists (select 1 from pg_policies where tablename = 'user_favorites'      and policyname = 'public_all') then
    create policy "public_all" on user_favorites      for all to anon using (true) with check (true); end if;
  if not exists (select 1 from pg_policies where tablename = 'business_claims'     and policyname = 'public_all') then
    create policy "public_all" on business_claims     for all to anon using (true) with check (true); end if;
  if not exists (select 1 from pg_policies where tablename = 'business_owner_info' and policyname = 'public_all') then
    create policy "public_all" on business_owner_info for all to anon using (true) with check (true); end if;
  if not exists (select 1 from pg_policies where tablename = 'review_responses'    and policyname = 'public_all') then
    create policy "public_all" on review_responses    for all to anon using (true) with check (true); end if;
end $$;
