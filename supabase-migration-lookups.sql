-- Canonical location and cuisine names (fewer typos in filters and forms).

create table if not exists public.locations (
  name text primary key,
  created_at timestamptz not null default now()
);

create table if not exists public.cuisines (
  name text primary key,
  created_at timestamptz not null default now()
);

alter table public.locations enable row level security;
alter table public.cuisines enable row level security;

drop policy if exists "Anyone can read locations" on public.locations;
create policy "Anyone can read locations"
on public.locations for select
to anon, authenticated
using (true);

drop policy if exists "Anyone can read cuisines" on public.cuisines;
create policy "Anyone can read cuisines"
on public.cuisines for select
to anon, authenticated
using (true);

drop policy if exists "Approved users can insert locations" on public.locations;
create policy "Approved users can insert locations"
on public.locations for insert
to authenticated
with check (
  exists (
    select 1 from public.approved_users
    where lower(approved_users.email) = lower((select auth.jwt() ->> 'email'))
  )
);

drop policy if exists "Approved users can insert cuisines" on public.cuisines;
create policy "Approved users can insert cuisines"
on public.cuisines for insert
to authenticated
with check (
  exists (
    select 1 from public.approved_users
    where lower(approved_users.email) = lower((select auth.jwt() ->> 'email'))
  )
);

-- Seed from existing restaurants
insert into public.locations (name)
select distinct trim(location) from public.restaurants
where trim(location) <> ''
on conflict (name) do nothing;

insert into public.cuisines (name)
select distinct trim(cuisine) from public.restaurants
where trim(cuisine) <> ''
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
  return new;
end;
$$;

drop trigger if exists restaurants_sync_lookups on public.restaurants;
create trigger restaurants_sync_lookups
  after insert or update of location, cuisine on public.restaurants
  for each row execute function public.sync_restaurant_lookups();
