-- Additive small-copy paths. Existing originals, reviews, and Storage objects stay intact.
alter table public.restaurant_photos
  add column if not exists thumb_path text not null default '';

alter table public.dish_photos
  add column if not exists thumb_path text not null default '';

alter table public.dishes
  add column if not exists thumb_path text not null default '';

-- Contributors can stamp a sibling thumb_path without rewriting identity fields.
grant update (thumb_path) on public.dish_photos to authenticated;

drop policy if exists "Contributors and owner can set dish photo thumbs" on public.dish_photos;
create policy "Contributors and owner can set dish photo thumbs"
on public.dish_photos for update to authenticated
using (
  (select public.is_approved_editor())
  and ((select public.is_foodlog_owner()) or user_id = (select auth.uid()))
)
with check (
  (select public.is_approved_editor())
  and ((select public.is_foodlog_owner()) or user_id = (select auth.uid()))
);

create or replace function private.protect_dish_photo_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.dish_id is distinct from old.dish_id
    or new.user_id is distinct from old.user_id
    or new.photo_path is distinct from old.photo_path
    or new.contributor_name is distinct from old.contributor_name then
    raise exception 'Dish photo identity cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_dish_photo_identity on public.dish_photos;
create trigger protect_dish_photo_identity
before update on public.dish_photos
for each row execute function private.protect_dish_photo_identity();

-- Owner backfill writes thumbs next to another contributor's original object.
drop policy if exists "Approved editors can upload their plate photos" on storage.objects;
create policy "Approved editors can upload their plate photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'plate-photos'
  and (select public.is_approved_editor())
  and (
    split_part(name, '/', 1) = (select auth.uid())::text
    or (select public.is_foodlog_owner())
  )
);
