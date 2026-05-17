create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  location text not null,
  cuisine text not null,
  price text not null default '$$',
  rating numeric(2,1) not null default 0 check (rating >= 0 and rating <= 5),
  maps text not null default '',
  notes text not null default '',
  visited text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dishes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  rating numeric(2,1) not null default 0 check (rating >= 0 and rating <= 5),
  liked_by text[] not null default '{}',
  notes text not null default '',
  photo_path text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists restaurants_user_updated_idx on public.restaurants(user_id, updated_at desc);
create index if not exists dishes_restaurant_updated_idx on public.dishes(restaurant_id, updated_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists restaurants_touch_updated_at on public.restaurants;
create trigger restaurants_touch_updated_at
before update on public.restaurants
for each row execute function public.touch_updated_at();

drop trigger if exists dishes_touch_updated_at on public.dishes;
create trigger dishes_touch_updated_at
before update on public.dishes
for each row execute function public.touch_updated_at();

alter table public.restaurants enable row level security;
alter table public.dishes enable row level security;

drop policy if exists "Users can read own restaurants" on public.restaurants;
create policy "Users can read own restaurants"
on public.restaurants for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Users can insert own restaurants" on public.restaurants;
create policy "Users can insert own restaurants"
on public.restaurants for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "Users can update own restaurants" on public.restaurants;
create policy "Users can update own restaurants"
on public.restaurants for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "Users can delete own restaurants" on public.restaurants;
create policy "Users can delete own restaurants"
on public.restaurants for delete
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Users can read own dishes" on public.dishes;
create policy "Users can read own dishes"
on public.dishes for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Users can insert own dishes" on public.dishes;
create policy "Users can insert own dishes"
on public.dishes for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.restaurants
    where restaurants.id = dishes.restaurant_id
    and restaurants.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can update own dishes" on public.dishes;
create policy "Users can update own dishes"
on public.dishes for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "Users can delete own dishes" on public.dishes;
create policy "Users can delete own dishes"
on public.dishes for delete
to authenticated
using (user_id = (select auth.uid()));

create index if not exists dishes_user_updated_idx on public.dishes(user_id, updated_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'plate-photos',
  'plate-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read own plate photos" on storage.objects;
create policy "Users can read own plate photos"
on storage.objects for select
to authenticated
using (
  bucket_id = 'plate-photos'
  and (owner = (select auth.uid()) or owner_id = (select auth.uid())::text)
);

drop policy if exists "Users can upload own plate photos" on storage.objects;
create policy "Users can upload own plate photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'plate-photos'
  and (owner = (select auth.uid()) or owner_id = (select auth.uid())::text)
);

drop policy if exists "Users can update own plate photos" on storage.objects;
create policy "Users can update own plate photos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'plate-photos'
  and (owner = (select auth.uid()) or owner_id = (select auth.uid())::text)
)
with check (
  bucket_id = 'plate-photos'
  and (owner = (select auth.uid()) or owner_id = (select auth.uid())::text)
);

drop policy if exists "Users can delete own plate photos" on storage.objects;
create policy "Users can delete own plate photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'plate-photos'
  and (owner = (select auth.uid()) or owner_id = (select auth.uid())::text)
);
