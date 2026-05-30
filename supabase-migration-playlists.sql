-- Playlists for grouping restaurants (filter + form dropdown).

create table if not exists public.playlists (
  name text primary key,
  created_at timestamptz not null default now()
);

alter table public.playlists enable row level security;

drop policy if exists "Anyone can read playlists" on public.playlists;
create policy "Anyone can read playlists"
on public.playlists for select
to anon, authenticated
using (true);

drop policy if exists "Approved users can insert playlists" on public.playlists;
create policy "Approved users can insert playlists"
on public.playlists for insert
to authenticated
with check (
  exists (
    select 1 from public.approved_users
    where lower(approved_users.email) = lower((select auth.jwt() ->> 'email'))
  )
);

alter table public.restaurants
  add column if not exists playlist text not null default '';

insert into public.playlists (name)
select distinct trim(playlist) from public.restaurants
where trim(playlist) <> ''
on conflict (name) do nothing;

create or replace function public.sync_restaurant_lookups()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if trim(new.location) <> '' then
    insert into public.locations (name) values (trim(new.location))
    on conflict (name) do nothing;
  end if;
  if trim(new.cuisine) <> '' then
    insert into public.cuisines (name) values (trim(new.cuisine))
    on conflict (name) do nothing;
  end if;
  if trim(new.playlist) <> '' then
    insert into public.playlists (name) values (trim(new.playlist))
    on conflict (name) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists restaurants_sync_lookups on public.restaurants;
create trigger restaurants_sync_lookups
  after insert or update of location, cuisine, playlist on public.restaurants
  for each row execute function public.sync_restaurant_lookups();
