create table if not exists active_destinations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  place_id    text        not null,
  place_name  text        not null,
  place_image text,
  address     text,
  latitude    float,
  longitude   float,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '4 hours')
);

create index if not exists active_destinations_user_id
  on active_destinations (user_id, expires_at desc);

alter table active_destinations enable row level security;

create policy "users can view their own active destinations"
  on active_destinations for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users can insert their own active destinations"
  on active_destinations for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can update their own active destinations"
  on active_destinations for update
  to authenticated
  using (auth.uid() = user_id);

create policy "users can delete their own active destinations"
  on active_destinations for delete
  to authenticated
  using (auth.uid() = user_id);

grant all on active_destinations to authenticated;
