-- Additive gallery storage. Existing dish photo_path values remain untouched.
alter table public.restaurant_photos add column contributor_name text not null default '';

create table public.dish_photos (
  id uuid primary key default gen_random_uuid(),
  dish_id uuid not null references public.dishes(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id),
  contributor_name text not null default '',
  photo_path text not null unique,
  created_at timestamptz not null default now()
);
create index dish_photos_dish_created_idx on public.dish_photos(dish_id, created_at);
create index dish_photos_user_idx on public.dish_photos(user_id);
alter table public.dish_photos enable row level security;
revoke all on public.dish_photos from anon, authenticated;
grant select on public.dish_photos to anon, authenticated;
grant insert on public.dish_photos to authenticated;

create policy "Read photos of active dishes" on public.dish_photos for select to anon, authenticated
using (exists (
  select 1 from public.dishes d join public.restaurants r on r.id=d.restaurant_id
  where d.id=dish_id and d.deleted_at is null and r.deleted_at is null
));
create policy "Editors contribute their own dish photos" on public.dish_photos for insert to authenticated
with check (
  (select public.is_approved_editor()) and user_id=(select auth.uid())
  and split_part(photo_path,'/',1)=(select auth.uid())::text
  and exists (select 1 from public.dishes d join public.restaurants r on r.id=d.restaurant_id
    where d.id=dish_id and d.deleted_at is null and r.deleted_at is null)
);

-- Change the displayed cover without deleting any existing photo.
alter table public.dishes add column cover_photo_id uuid references public.dish_photos(id) on delete set null;
create index dishes_cover_photo_idx on public.dishes(cover_photo_id) where cover_photo_id is not null;
create function private.validate_dish_cover() returns trigger
language plpgsql set search_path='' as $$
begin
  if new.cover_photo_id is not null and not exists (
    select 1 from public.dish_photos where id=new.cover_photo_id and dish_id=new.id
  ) then raise exception 'Choose a photo belonging to this dish'; end if;
  return new;
end;
$$;
revoke all on function private.validate_dish_cover() from public,anon,authenticated;
create trigger validate_dish_cover before insert or update of cover_photo_id on public.dishes
for each row execute function private.validate_dish_cover();

-- Display metadata is used only for attribution, never to authorize access.
create function private.stamp_photo_contributor() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Sign in to contribute photos'; end if;
  new.user_id := auth.uid();
  select coalesce(nullif(u.raw_user_meta_data->>'full_name',''),nullif(u.raw_user_meta_data->>'name',''),'Friend')
    into new.contributor_name from auth.users u where u.id=auth.uid();
  return new;
end;
$$;
revoke all on function private.stamp_photo_contributor() from public,anon,authenticated;
create trigger stamp_dish_photo_contributor before insert on public.dish_photos
for each row execute function private.stamp_photo_contributor();
create trigger stamp_restaurant_photo_contributor before insert on public.restaurant_photos
for each row execute function private.stamp_photo_contributor();
create trigger log_dish_photo_change after insert on public.dish_photos
for each row execute function private.log_foodlog_row_change('dish_photos');

-- Gallery moderation can still trash/restore a photo; its attribution is immutable.
create function private.protect_photo_attribution() returns trigger
language plpgsql set search_path='' as $$
begin
  if new.user_id is distinct from old.user_id
    or new.contributor_name is distinct from old.contributor_name then
    raise exception 'Photo attribution cannot be changed';
  end if;
  return new;
end;
$$;
revoke all on function private.protect_photo_attribution() from public,anon,authenticated;
create trigger protect_restaurant_photo_attribution before update on public.restaurant_photos
for each row execute function private.protect_photo_attribution();

do $$ begin
  if exists (select 1 from pg_publication where pubname='supabase_realtime') then
    alter publication supabase_realtime add table public.dish_photos;
  end if;
end $$;

-- Keep gallery imports in the existing all-or-nothing transaction.
create or replace function public.import_foodlog_batch(p_batch_id uuid, p_payload jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $import_batch$
declare
  restaurant_json jsonb;
  dish_json jsonb;
  photo_json jsonb;
  restaurant_id uuid;
  dish_id uuid;
  inserted_photo_id uuid;
  selected_photo_id uuid;
  imported_count integer := 0;
  actor_email text := lower(coalesce((select auth.jwt() ->> 'email'), ''));
  actor_name text := split_part(actor_email, '@', 1);
  rating_json jsonb;
begin
  if not public.is_approved_editor() then
    raise exception 'Only approved editors can import.';
  end if;
  if jsonb_typeof(p_payload) <> 'array' then
    raise exception 'Import payload must be an array.';
  end if;
  if exists (select 1 from public.restaurants where import_batch_id = p_batch_id) then
    return 0;
  end if;

  for restaurant_json in select value from jsonb_array_elements(p_payload)
  loop
    selected_photo_id := null;

    insert into public.restaurants (
      name, location, cuisine, playlist, playlists, price, maps, notes, visited,
      updated_at, updated_by, import_batch_id
    )
    values (
      trim(restaurant_json ->> 'name'),
      trim(restaurant_json ->> 'location'),
      trim(restaurant_json ->> 'cuisine'),
      coalesce(restaurant_json -> 'playlists' ->> 0, ''),
      coalesce(array(select jsonb_array_elements_text(coalesce(restaurant_json -> 'playlists', '[]'::jsonb))), '{}'::text[]),
      coalesce(restaurant_json ->> 'price', '$$'),
      coalesce(restaurant_json ->> 'maps', ''),
      coalesce(restaurant_json ->> 'notes', ''),
      coalesce(array(select jsonb_array_elements_text(coalesce(restaurant_json -> 'visited', '[]'::jsonb))), '{}'::text[]),
      now(),
      actor_name,
      p_batch_id
    )
    returning id into restaurant_id;

    for photo_json in
      select value
      from jsonb_array_elements(coalesce(restaurant_json -> 'photos', '[]'::jsonb))
    loop
      if nullif(photo_json ->> 'photoPath', '') is not null then
        insert into public.restaurant_photos (restaurant_id, photo_path)
        values (restaurant_id, photo_json ->> 'photoPath')
        returning id into inserted_photo_id;

        if photo_json -> 'isCover' = 'true'::jsonb then
          selected_photo_id := inserted_photo_id;
        end if;
      end if;
    end loop;

    if selected_photo_id is not null then
      update public.restaurants
      set cover_photo_id = selected_photo_id
      where id = restaurant_id;
    end if;

    for dish_json in
      select value
      from jsonb_array_elements(coalesce(restaurant_json -> 'dishes', '[]'::jsonb))
    loop
      insert into public.dishes (
        restaurant_id, name, rating, liked_by, notes, photo_path, updated_at, updated_by
      )
      values (
        restaurant_id,
        trim(dish_json ->> 'name'),
        0,
        coalesce(array(select jsonb_array_elements_text(coalesce(dish_json -> 'likedBy', '[]'::jsonb))), '{}'::text[]),
        '',
        coalesce(dish_json ->> 'photoPath', ''),
        now(),
        actor_name
      )
      returning id into dish_id;

      for photo_json in
        select value from jsonb_array_elements(coalesce(dish_json -> 'photos', '[]'::jsonb))
      loop
        if nullif(photo_json ->> 'photoPath', '') is not null then
          insert into public.dish_photos (dish_id, photo_path)
          values (dish_id, photo_json ->> 'photoPath') returning id into inserted_photo_id;
          if photo_json -> 'isCover' = 'true'::jsonb then
            update public.dishes set cover_photo_id=inserted_photo_id where id=dish_id;
          end if;
        end if;
      end loop;

      rating_json := coalesce(dish_json -> 'ratings' -> 0, null);
      if rating_json is not null and coalesce((rating_json ->> 'rating')::numeric, 0) >= 0.5 then
        insert into public.dish_ratings (dish_id, rater_email, rater_name, rating, notes)
        values (
          dish_id,
          actor_email,
          actor_name,
          (rating_json ->> 'rating')::numeric,
          coalesce(rating_json ->> 'notes', '')
        );
      end if;
    end loop;

    rating_json := coalesce(restaurant_json -> 'ratings' -> 0, null);
    if rating_json is not null and coalesce((rating_json ->> 'rating')::numeric, 0) >= 0.5 then
      insert into public.restaurant_ratings (restaurant_id, rater_email, rater_name, rating)
      values (
        restaurant_id,
        actor_email,
        actor_name,
        (rating_json ->> 'rating')::numeric
      );
    end if;

    imported_count := imported_count + 1;
  end loop;
  return imported_count;
end;
$import_batch$;

revoke all on function public.import_foodlog_batch(uuid, jsonb) from public;
grant execute on function public.import_foodlog_batch(uuid, jsonb) to authenticated;
