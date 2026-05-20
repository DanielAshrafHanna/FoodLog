-- Run in Supabase SQL Editor if approval checks fail for mixed-case emails.
-- Safe to re-run (drops/recreates policies by name).

drop trigger if exists approved_users_lowercase_email on public.approved_users;
drop function if exists public.lowercase_approved_users_email();

create index if not exists approved_users_lower_email_idx on public.approved_users (lower(email));

drop policy if exists "Approved editors can insert restaurants" on public.restaurants;
create policy "Approved editors can insert restaurants"
on public.restaurants for insert
to authenticated
with check (
  exists (
    select 1 from public.approved_users
    where lower(approved_users.email) = lower((select auth.jwt() ->> 'email'))
  )
);

drop policy if exists "Approved editors can update restaurants" on public.restaurants;
create policy "Approved editors can update restaurants"
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

drop policy if exists "Approved editors can delete restaurants" on public.restaurants;
create policy "Approved editors can delete restaurants"
on public.restaurants for delete
to authenticated
using (
  exists (
    select 1 from public.approved_users
    where lower(approved_users.email) = lower((select auth.jwt() ->> 'email'))
  )
);

drop policy if exists "Approved editors can insert dishes" on public.dishes;
create policy "Approved editors can insert dishes"
on public.dishes for insert
to authenticated
with check (
  exists (
    select 1 from public.approved_users
    where lower(approved_users.email) = lower((select auth.jwt() ->> 'email'))
  )
);

drop policy if exists "Approved editors can update dishes" on public.dishes;
create policy "Approved editors can update dishes"
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

drop policy if exists "Approved editors can delete dishes" on public.dishes;
create policy "Approved editors can delete dishes"
on public.dishes for delete
to authenticated
using (
  exists (
    select 1 from public.approved_users
    where lower(approved_users.email) = lower((select auth.jwt() ->> 'email'))
  )
);

drop policy if exists "Approved editors can insert restaurant photos" on public.restaurant_photos;
create policy "Approved editors can insert restaurant photos"
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

drop policy if exists "Approved editors can delete restaurant photos" on public.restaurant_photos;
create policy "Approved editors can delete restaurant photos"
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

drop policy if exists "Approved editors can upload plate photos" on storage.objects;
create policy "Approved editors can upload plate photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'plate-photos'
  and exists (
    select 1 from public.approved_users
    where lower(approved_users.email) = lower((select auth.jwt() ->> 'email'))
  )
);

drop policy if exists "Approved editors can update plate photos" on storage.objects;
create policy "Approved editors can update plate photos"
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

drop policy if exists "Approved editors can delete plate photos" on storage.objects;
create policy "Approved editors can delete plate photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'plate-photos'
  and exists (
    select 1 from public.approved_users
    where lower(approved_users.email) = lower((select auth.jwt() ->> 'email'))
  )
);
