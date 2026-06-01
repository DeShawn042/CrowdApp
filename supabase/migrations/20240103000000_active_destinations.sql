create table if not exists active_destinations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  place_id   text not null,
  place_name text not null,
  place_image text,
  address    text,
  latitude   float,
  longitude  float,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '4 hours')
);

-- One active destination per user at a time
create unique index if not exists active_destinations_user_id
  on active_destinations (user_id);

alter table active_destinations enable row level security;

create policy "users can manage their own destination"
  on active_destinations for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
