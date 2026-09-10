-- Keep shared reading and contributions, while limiting metadata changes to
-- the original contributor or the exact FoodLog owner account. This migration
-- changes policies only; it does not rewrite or delete journal data.

drop policy if exists "Approved editors can add restaurants" on public.restaurants;
create policy "Approved editors can add their restaurants"
on public.restaurants for insert to authenticated
with check (
  (select public.is_approved_editor())
  and user_id = (select auth.uid())
  and deleted_at is null
);

drop policy if exists "Approved editors can update restaurants" on public.restaurants;
create policy "Contributors and owner can update restaurants"
on public.restaurants for update to authenticated
using (
  (select public.is_approved_editor())
  and (
    (select public.is_foodlog_owner())
    or user_id = (select auth.uid())
  )
  and (
    deleted_at is null
    or (select public.is_foodlog_owner())
    or lower(deleted_by) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  )
)
with check (
  (select public.is_approved_editor())
  and (
    (select public.is_foodlog_owner())
    or user_id = (select auth.uid())
  )
);

drop policy if exists "Approved editors can add dishes" on public.dishes;
create policy "Approved editors can add their dishes"
on public.dishes for insert to authenticated
with check (
  (select public.is_approved_editor())
  and user_id = (select auth.uid())
  and deleted_at is null
  and exists (
    select 1
    from public.restaurants
    where restaurants.id = dishes.restaurant_id
      and restaurants.deleted_at is null
  )
);

drop policy if exists "Approved editors can update dishes" on public.dishes;
create policy "Contributors and owner can update dishes"
on public.dishes for update to authenticated
using (
  (select public.is_approved_editor())
  and (
    (select public.is_foodlog_owner())
    or user_id = (select auth.uid())
  )
  and (
    deleted_at is null
    or (select public.is_foodlog_owner())
    or lower(deleted_by) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  )
)
with check (
  (select public.is_approved_editor())
  and (
    (select public.is_foodlog_owner())
    or user_id = (select auth.uid())
  )
);

drop policy if exists "Approved editors can add restaurant photos" on public.restaurant_photos;
create policy "Approved editors can add their restaurant photos"
on public.restaurant_photos for insert to authenticated
with check (
  (select public.is_approved_editor())
  and user_id = (select auth.uid())
  and deleted_at is null
  and exists (
    select 1
    from public.restaurants
    where restaurants.id = restaurant_photos.restaurant_id
      and restaurants.deleted_at is null
  )
);

drop policy if exists "Approved editors can update restaurant photos" on public.restaurant_photos;
create policy "Contributors and owner can update restaurant photos"
on public.restaurant_photos for update to authenticated
using (
  (select public.is_approved_editor())
  and (
    (select public.is_foodlog_owner())
    or user_id = (select auth.uid())
  )
  and (
    deleted_at is null
    or (select public.is_foodlog_owner())
    or lower(deleted_by) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  )
)
with check (
  (select public.is_approved_editor())
  and (
    (select public.is_foodlog_owner())
    or user_id = (select auth.uid())
  )
);

-- Storage paths already begin with the authenticated contributor UUID. Keep
-- that invariant enforceable even if a client submits a custom object name.
drop policy if exists "Approved editors can upload plate photos" on storage.objects;
drop policy if exists "Approved users can upload plate photos" on storage.objects;
create policy "Approved editors can upload their plate photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'plate-photos'
  and (select public.is_approved_editor())
  and split_part(name, '/', 1) = (select auth.uid())::text
);

drop policy if exists "Approved editors can update plate photos" on storage.objects;
drop policy if exists "Approved users can update plate photos" on storage.objects;
create policy "Contributors and owner can update plate photos"
on storage.objects for update to authenticated
using (
  bucket_id = 'plate-photos'
  and (select public.is_approved_editor())
  and (
    (select public.is_foodlog_owner())
    or split_part(name, '/', 1) = (select auth.uid())::text
  )
)
with check (
  bucket_id = 'plate-photos'
  and (select public.is_approved_editor())
  and (
    (select public.is_foodlog_owner())
    or split_part(name, '/', 1) = (select auth.uid())::text
  )
);

drop policy if exists "Approved editors can delete plate photos" on storage.objects;
drop policy if exists "Approved users can delete plate photos" on storage.objects;
create policy "Contributors and owner can delete plate photos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'plate-photos'
  and (select public.is_approved_editor())
  and (
    (select public.is_foodlog_owner())
    or split_part(name, '/', 1) = (select auth.uid())::text
  )
);
