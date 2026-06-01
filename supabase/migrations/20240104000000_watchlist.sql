create table if not exists watchlist (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  place_id     text not null,
  place_name   text not null,
  place_image  text,
  address      text,
  latitude     float,
  longitude    float,
  alert_level  text not null check (alert_level in ('empty', 'light', 'moderate', 'packed')),
  is_active    boolean not null default true,
  notified_at  timestamptz,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default (now() + interval '24 hours')
);

create index if not exists watchlist_user_active
  on watchlist (user_id, is_active, expires_at desc);

create index if not exists watchlist_place
  on watchlist (place_id, is_active);

alter table watchlist enable row level security;

grant all on table watchlist to authenticated;
grant all on table watchlist to service_role;

create policy "users manage their own watchlist"
  on watchlist
  as permissive
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
