create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users(id) on delete set null,
  name text not null,
  location text not null,
  cuisine text not null,
  price text not null default '$$',
  rating numeric(2,1) not null default 0 check (rating >= 0 and rating <= 5),
  maps text not null default '',
  notes text not null default '',
  visited text[] not null default '{}',
  updated_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dishes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid default auth.uid() references auth.users(id) on delete set null,
  name text not null,
  rating numeric(2,1) not null default 0 check (rating >= 0 and rating <= 5),
  liked_by text[] not null default '{}',
  notes text not null default '',
  photo_path text not null default '',
  updated_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.restaurant_photos (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid default auth.uid() references auth.users(id) on delete set null,
  photo_path text not null,
  created_at timestamptz not null default now()
);

alter table public.restaurants
  add column if not exists cover_photo_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'restaurants_cover_photo_id_fkey'
      and conrelid = 'public.restaurants'::regclass
  ) then
    alter table public.restaurants
      add constraint restaurants_cover_photo_id_fkey
      foreign key (cover_photo_id)
      references public.restaurant_photos(id)
      on delete set null;
  end if;
end
$$;

create table if not exists public.approved_users (
  email text primary key,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.pending_approvals (
  email text primary key,
  display_name text not null default '',
  provider text not null default '',
  requested_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

drop trigger if exists approved_users_lowercase_email on public.approved_users;
drop function if exists public.lowercase_approved_users_email();

create index if not exists restaurants_user_updated_idx on public.restaurants(user_id, updated_at desc);
create index if not exists dishes_restaurant_updated_idx on public.dishes(restaurant_id, updated_at desc);
create index if not exists dishes_user_updated_idx on public.dishes(user_id, updated_at desc);
create index if not exists restaurant_photos_restaurant_created_idx on public.restaurant_photos(restaurant_id, created_at desc);
create index if not exists restaurant_photos_user_created_idx on public.restaurant_photos(user_id, created_at desc);
create index if not exists restaurants_cover_photo_id_idx on public.restaurants(cover_photo_id) where cover_photo_id is not null;
create index if not exists approved_users_lower_email_idx on public.approved_users (lower(email));
create index if not exists pending_approvals_requested_idx on public.pending_approvals (requested_at desc);

grant select on public.restaurant_photos to anon, authenticated;
grant insert, delete on public.restaurant_photos to authenticated;

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
alter table public.restaurant_photos enable row level security;
alter table public.approved_users enable row level security;

drop policy if exists "Users can read own restaurants" on public.restaurants;
drop policy if exists "Anyone can read restaurants" on public.restaurants;
create policy "Anyone can read restaurants"
on public.restaurants for select
to anon, authenticated
using (true);

drop policy if exists "Users can insert own restaurants" on public.restaurants;
drop policy if exists "Approved users can insert restaurants" on public.restaurants;
create policy "Approved users can insert restaurants"
on public.restaurants for insert
to authenticated
with check (
  exists (
    select 1 from public.approved_users
    where lower(approved_users.email) = lower((select auth.jwt() ->> 'email'))
  )
);

drop policy if exists "Users can update own restaurants" on public.restaurants;
drop policy if exists "Approved users can update restaurants" on public.restaurants;
create policy "Approved users can update restaurants"
on public.restaurants for update
to authenticated
using (
  exists (
    select 1 from public.approved_users
    where lower(approved_users.email) = lower((select auth.jwt() ->> 'email'))
  )
)
with check (
  exists (
    select 1 from public.approved_users
    where lower(approved_users.email) = lower((select auth.jwt() ->> 'email'))
  )
);

drop policy if exists "Users can delete own restaurants" on public.restaurants;
drop policy if exists "Approved users can delete restaurants" on public.restaurants;
create policy "Approved users can delete restaurants"
on public.restaurants for delete
to authenticated
using (
  exists (
    select 1 from public.approved_users
    where lower(approved_users.email) = lower((select auth.jwt() ->> 'email'))
  )
);

drop policy if exists "Users can read own dishes" on public.dishes;
drop policy if exists "Anyone can read dishes" on public.dishes;
create policy "Anyone can read dishes"
on public.dishes for select
to anon, authenticated
using (true);

drop policy if exists "Users can insert own dishes" on public.dishes;
drop policy if exists "Approved users can insert dishes" on public.dishes;
create policy "Approved users can insert dishes"
on public.dishes for insert
to authenticated
with check (
  exists (
    select 1 from public.approved_users
    where lower(approved_users.email) = lower((select auth.jwt() ->> 'email'))
  )
  and exists (
    select 1
    from public.restaurants
    where restaurants.id = dishes.restaurant_id
  )
);

drop policy if exists "Users can update own dishes" on public.dishes;
drop policy if exists "Approved users can update dishes" on public.dishes;
create policy "Approved users can update dishes"
on public.dishes for update
to authenticated
using (
  exists (
    select 1 from public.approved_users
    where lower(approved_users.email) = lower((select auth.jwt() ->> 'email'))
  )
)
with check (
  exists (
    select 1 from public.approved_users
    where lower(approved_users.email) = lower((select auth.jwt() ->> 'email'))
  )
);

drop policy if exists "Users can delete own dishes" on public.dishes;
drop policy if exists "Approved users can delete dishes" on public.dishes;
create policy "Approved users can delete dishes"
on public.dishes for delete
to authenticated
using (
  exists (
    select 1 from public.approved_users
    where lower(approved_users.email) = lower((select auth.jwt() ->> 'email'))
  )
);

drop policy if exists "Anyone can read restaurant photos" on public.restaurant_photos;
create policy "Anyone can read restaurant photos"
on public.restaurant_photos for select
to anon, authenticated
using (true);

drop policy if exists "Approved users can insert restaurant photos" on public.restaurant_photos;
create policy "Approved users can insert restaurant photos"
on public.restaurant_photos for insert
to authenticated
with check (
  exists (
    select 1 from public.approved_users
    where lower(approved_users.email) = lower((select auth.jwt() ->> 'email'))
  )
  and exists (
    select 1
    from public.restaurants
    where restaurants.id = restaurant_photos.restaurant_id
  )
);

drop policy if exists "Approved users can delete restaurant photos" on public.restaurant_photos;
create policy "Approved users can delete restaurant photos"
on public.restaurant_photos for delete
to authenticated
using (
  exists (
    select 1 from public.approved_users
    where lower(approved_users.email) = lower((select auth.jwt() ->> 'email'))
  )
);

drop policy if exists "Users can read approval status" on public.approved_users;
create policy "Users can read approval status"
on public.approved_users for select
to authenticated
using (lower(email) = lower((select auth.jwt() ->> 'email')));

drop trigger if exists approved_users_normalize_email on public.approved_users;
drop function if exists public.normalize_approved_user_email();
create or replace function public.normalize_approved_user_email()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.email = lower(trim(new.email));
  return new;
end;
$$;

create trigger approved_users_normalize_email
before insert or update on public.approved_users
for each row execute function public.normalize_approved_user_email();

drop policy if exists "Owner can list approved users" on public.approved_users;
create policy "Owner can list approved users"
on public.approved_users for select
to authenticated
using (lower((select auth.jwt() ->> 'email')) = 'danielhanna0001@gmail.com');

drop policy if exists "Owner can insert approved users" on public.approved_users;
create policy "Owner can insert approved users"
on public.approved_users for insert
to authenticated
with check (lower((select auth.jwt() ->> 'email')) = 'danielhanna0001@gmail.com');

drop policy if exists "Owner can update approved users" on public.approved_users;
create policy "Owner can update approved users"
on public.approved_users for update
to authenticated
using (lower((select auth.jwt() ->> 'email')) = 'danielhanna0001@gmail.com')
with check (lower((select auth.jwt() ->> 'email')) = 'danielhanna0001@gmail.com');

drop policy if exists "Owner can delete approved users" on public.approved_users;
create policy "Owner can delete approved users"
on public.approved_users for delete
to authenticated
using (
  lower((select auth.jwt() ->> 'email')) = 'danielhanna0001@gmail.com'
  and lower(email) <> 'danielhanna0001@gmail.com'
);

alter table public.pending_approvals enable row level security;

drop policy if exists "Users can request approval" on public.pending_approvals;
create policy "Users can request approval"
on public.pending_approvals for insert
to authenticated
with check (
  lower(email) = lower((select auth.jwt() ->> 'email'))
  and not exists (
    select 1 from public.approved_users
    where lower(approved_users.email) = lower((select auth.jwt() ->> 'email'))
  )
);

drop policy if exists "Users can refresh own pending request" on public.pending_approvals;
create policy "Users can refresh own pending request"
on public.pending_approvals for update
to authenticated
using (lower(email) = lower((select auth.jwt() ->> 'email')))
with check (lower(email) = lower((select auth.jwt() ->> 'email')));

drop policy if exists "Users can read own pending status" on public.pending_approvals;
create policy "Users can read own pending status"
on public.pending_approvals for select
to authenticated
using (lower(email) = lower((select auth.jwt() ->> 'email')));

drop policy if exists "Owner can list pending approvals" on public.pending_approvals;
create policy "Owner can list pending approvals"
on public.pending_approvals for select
to authenticated
using (lower((select auth.jwt() ->> 'email')) = 'danielhanna0001@gmail.com');

drop policy if exists "Users can clear own pending" on public.pending_approvals;
create policy "Users can clear own pending"
on public.pending_approvals for delete
to authenticated
using (lower(email) = lower((select auth.jwt() ->> 'email')));

drop policy if exists "Owner can delete pending approvals" on public.pending_approvals;
create policy "Owner can delete pending approvals"
on public.pending_approvals for delete
to authenticated
using (lower((select auth.jwt() ->> 'email')) = 'danielhanna0001@gmail.com');

drop policy if exists "Owner can insert pending approvals" on public.pending_approvals;
create policy "Owner can insert pending approvals"
on public.pending_approvals for insert
to authenticated
with check (lower((select auth.jwt() ->> 'email')) = 'danielhanna0001@gmail.com');

drop policy if exists "Owner can update pending approvals" on public.pending_approvals;
create policy "Owner can update pending approvals"
on public.pending_approvals for update
to authenticated
using (lower((select auth.jwt() ->> 'email')) = 'danielhanna0001@gmail.com')
with check (lower((select auth.jwt() ->> 'email')) = 'danielhanna0001@gmail.com');

create or replace function public.normalize_pending_approval_email()
returns trigger
language plpgsql
as $$
begin
  new.email = lower(trim(new.email));
  return new;
end;
$$;

drop trigger if exists pending_approvals_normalize_email on public.pending_approvals;
create trigger pending_approvals_normalize_email
before insert or update on public.pending_approvals
for each row execute function public.normalize_pending_approval_email();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'plate-photos',
  'plate-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read own plate photos" on storage.objects;
drop policy if exists "Anyone can read plate photos" on storage.objects;

drop policy if exists "Users can upload own plate photos" on storage.objects;
drop policy if exists "Approved users can upload plate photos" on storage.objects;
create policy "Approved users can upload plate photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'plate-photos'
  and exists (
    select 1 from public.approved_users
    where lower(approved_users.email) = lower((select auth.jwt() ->> 'email'))
  )
);

drop policy if exists "Users can update own plate photos" on storage.objects;
drop policy if exists "Approved users can update plate photos" on storage.objects;
create policy "Approved users can update plate photos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'plate-photos'
  and exists (
    select 1 from public.approved_users
    where lower(approved_users.email) = lower((select auth.jwt() ->> 'email'))
  )
)
with check (
  bucket_id = 'plate-photos'
  and exists (
    select 1 from public.approved_users
    where lower(approved_users.email) = lower((select auth.jwt() ->> 'email'))
  )
);

drop policy if exists "Users can delete own plate photos" on storage.objects;
drop policy if exists "Approved users can delete plate photos" on storage.objects;
create policy "Approved users can delete plate photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'plate-photos'
  and exists (
    select 1 from public.approved_users
    where lower(approved_users.email) = lower((select auth.jwt() ->> 'email'))
  )
);
