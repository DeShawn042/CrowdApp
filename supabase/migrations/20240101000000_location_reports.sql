create table if not exists location_reports (
  id          uuid primary key default gen_random_uuid(),
  place_id    text        not null,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  report_type text        not null check (report_type in (
    'vibe', 'price', 'service', 'event',
    'cover_charge', 'parking', 'cleanliness', 'wait_time'
  )),
  value       text        not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '60 minutes')
);

create index if not exists location_reports_place_id_expires_at
  on location_reports (place_id, expires_at desc);

create index if not exists location_reports_user_type
  on location_reports (user_id, place_id, report_type, created_at desc);

alter table location_reports enable row level security;

create policy "authenticated users can insert"
  on location_reports for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "anyone can read active reports"
  on location_reports for select
  using (expires_at > now());
