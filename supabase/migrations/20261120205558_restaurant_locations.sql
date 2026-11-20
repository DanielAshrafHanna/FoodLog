-- Retain the existing first location for legacy readers and writers.
alter table public.restaurants
  add column additional_locations jsonb not null default '[]'::jsonb;

-- Resolve additional areas with the same catalog as the first area. Only the
-- restaurant's existing RLS-protected writes can reach this trigger.
create function private.foodlog_canonical_additional_locations()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  branch jsonb;
  area text;
  link text;
  lookup_id uuid;
  locations jsonb := '[]'::jsonb;
begin
  if tg_op = 'UPDATE' and new.additional_locations = old.additional_locations then
    return new;
  end if;
  if jsonb_typeof(new.additional_locations) is distinct from 'array' then
    raise exception 'Additional locations must be an array.' using errcode = '22023';
  end if;

  for branch in select value from jsonb_array_elements(new.additional_locations)
  loop
    if jsonb_typeof(branch) <> 'object'
       or jsonb_typeof(branch -> 'location') is distinct from 'string'
       or jsonb_typeof(branch -> 'maps') is distinct from 'string' then
      raise exception 'Each location needs an area or Maps link.' using errcode = '22023';
    end if;
    area := trim(branch ->> 'location');
    link := trim(branch ->> 'maps');
    if char_length(area) > 120 or char_length(link) > 2048
       or (link <> '' and link !~* '^https?://[^[:space:]]+$') then
      raise exception 'Check the additional location name or Maps link.' using errcode = '22023';
    end if;
    if area = '' and link = '' then continue; end if;

    lookup_id := public.foodlog_resolve_lookup('location', area);
    if lookup_id is not null then
      select name into area from public.lookup_entries where id = lookup_id;
    end if;
    locations := locations || jsonb_build_array(jsonb_build_object(
      'location', area, 'maps', link, 'locationId', lookup_id
    ));
  end loop;
  new.additional_locations := locations;
  return new;
end;
$$;
revoke all on function private.foodlog_canonical_additional_locations() from public, anon, authenticated;

create trigger canonical_restaurant_additional_locations
before insert or update of additional_locations on public.restaurants
for each row execute function private.foodlog_canonical_additional_locations();

create or replace function public.save_restaurant_reliably(
  p_operation_id uuid,
  p_restaurant_id uuid,
  p_restaurant jsonb,
  p_rating numeric default null,
  p_want_to_go boolean default false,
  p_create_if_missing boolean default false
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $save_restaurant_reliably$
declare
  actor_user_id uuid := (select auth.uid());
  actor_email text := lower(coalesce((select auth.jwt() ->> 'email'), ''));
  actor_name text := coalesce(nullif(p_restaurant ->> 'updated_by', ''), split_part(actor_email, '@', 1));
  saved_id uuid;
begin
  if actor_user_id is null or not public.is_approved_editor() then
    raise exception 'Only approved editors can save restaurants.';
  end if;
  if p_operation_id is null or p_restaurant_id is null then
    raise exception 'A stable save and restaurant ID are required.';
  end if;

  select receipt.entity_id into saved_id
  from private.save_operation_receipts as receipt
  where receipt.operation_id = p_operation_id
    and receipt.actor_id = actor_user_id
    and receipt.entity_type = 'restaurant';
  if found then return saved_id; end if;

  if nullif(trim(p_restaurant ->> 'name'), '') is null then
    raise exception 'Restaurant name is required.';
  end if;

  if p_create_if_missing then
    insert into public.restaurants (
      id, user_id, name, location, cuisine, playlist, playlists, price, maps,
      notes, visited, updated_at, updated_by, additional_locations
    ) values (
      p_restaurant_id, actor_user_id, trim(p_restaurant ->> 'name'),
      coalesce(p_restaurant ->> 'location', ''), coalesce(p_restaurant ->> 'cuisine', ''),
      coalesce(p_restaurant ->> 'playlist', ''),
      coalesce(array(select jsonb_array_elements_text(coalesce(p_restaurant -> 'playlists', '[]'::jsonb))), '{}'::text[]),
      coalesce(p_restaurant ->> 'price', '$$'), coalesce(p_restaurant ->> 'maps', ''),
      coalesce(p_restaurant ->> 'notes', ''),
      coalesce(array(select jsonb_array_elements_text(coalesce(p_restaurant -> 'visited', '[]'::jsonb))), '{}'::text[]),
      now(), actor_name, coalesce(p_restaurant -> 'additional_locations', '[]'::jsonb)
    );
  else
    update public.restaurants set
      name = trim(p_restaurant ->> 'name'),
      location = coalesce(p_restaurant ->> 'location', ''),
      cuisine = coalesce(p_restaurant ->> 'cuisine', ''),
      playlist = coalesce(p_restaurant ->> 'playlist', ''),
      playlists = coalesce(array(select jsonb_array_elements_text(coalesce(p_restaurant -> 'playlists', '[]'::jsonb))), '{}'::text[]),
      price = coalesce(p_restaurant ->> 'price', '$$'),
      maps = coalesce(p_restaurant ->> 'maps', ''), notes = coalesce(p_restaurant ->> 'notes', ''),
      visited = coalesce(array(select jsonb_array_elements_text(coalesce(p_restaurant -> 'visited', '[]'::jsonb))), '{}'::text[]),
      additional_locations = coalesce(p_restaurant -> 'additional_locations', additional_locations),
      updated_at = now(), updated_by = actor_name
    where id = p_restaurant_id and deleted_at is null;
    if not found then raise exception 'Restaurant is unavailable or in Trash.'; end if;
  end if;

  if p_rating is null then
    update public.restaurant_ratings set deleted_at = now(), deleted_by = actor_email
    where restaurant_id = p_restaurant_id and lower(rater_email) = actor_email and deleted_at is null;
  else
    if p_rating < 0.5 or p_rating > 5 then raise exception 'Rating must be between 0.5 and 5.'; end if;
    insert into public.restaurant_ratings (restaurant_id, rater_email, rater_name, rating, deleted_at, deleted_by)
    values (p_restaurant_id, actor_email, actor_name, p_rating, null, null)
    on conflict (restaurant_id, rater_email) do update set
      rater_name = excluded.rater_name, rating = excluded.rating, deleted_at = null, deleted_by = null;
  end if;

  if p_want_to_go then
    insert into public.restaurant_want_to_go (restaurant_id, user_email, updated_at)
    values (p_restaurant_id, actor_email, now())
    on conflict (restaurant_id, user_email) do update set updated_at = excluded.updated_at;
  end if;

  insert into private.save_operation_receipts (operation_id, actor_id, actor_email, entity_type, entity_id)
  values (p_operation_id, actor_user_id, actor_email, 'restaurant', p_restaurant_id);
  return p_restaurant_id;
end;
$save_restaurant_reliably$;

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
      updated_at, updated_by, import_batch_id, additional_locations
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
      now(), actor_name, p_batch_id, coalesce(restaurant_json -> 'additionalLocations', '[]'::jsonb)
    )
    returning id into restaurant_id;

    for photo_json in
      select value from jsonb_array_elements(coalesce(restaurant_json -> 'photos', '[]'::jsonb))
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
      update public.restaurants set cover_photo_id = selected_photo_id where id = restaurant_id;
    end if;

    for dish_json in
      select value from jsonb_array_elements(coalesce(restaurant_json -> 'dishes', '[]'::jsonb))
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
        now(), actor_name
      )
      returning id into dish_id;

      for photo_json in
        select value from jsonb_array_elements(coalesce(dish_json -> 'photos', '[]'::jsonb))
      loop
        if nullif(photo_json ->> 'photoPath', '') is not null then
          insert into public.dish_photos (dish_id, photo_path)
          values (dish_id, photo_json ->> 'photoPath') returning id into inserted_photo_id;
          if photo_json -> 'isCover' = 'true'::jsonb then
            update public.dishes set cover_photo_id = inserted_photo_id where id = dish_id;
          end if;
        end if;
      end loop;

      rating_json := coalesce(dish_json -> 'ratings' -> 0, null);
      if rating_json is not null and coalesce((rating_json ->> 'rating')::numeric, 0) >= 0.5 then
        insert into public.dish_ratings (dish_id, rater_email, rater_name, rating, notes)
        values (
          dish_id, actor_email, actor_name, (rating_json ->> 'rating')::numeric,
          coalesce(rating_json ->> 'notes', '')
        );
      end if;
    end loop;

    rating_json := coalesce(restaurant_json -> 'ratings' -> 0, null);
    if rating_json is not null and coalesce((rating_json ->> 'rating')::numeric, 0) >= 0.5 then
      insert into public.restaurant_ratings (restaurant_id, rater_email, rater_name, rating, notes)
      values (
        restaurant_id, actor_email, actor_name, (rating_json ->> 'rating')::numeric,
        coalesce(rating_json ->> 'notes', '')
      );
    end if;

    imported_count := imported_count + 1;
  end loop;
  return imported_count;
end;
$import_batch$;

revoke all on function public.import_foodlog_batch(uuid, jsonb) from public;
grant execute on function public.import_foodlog_batch(uuid, jsonb) to authenticated;

create or replace function public.foodlog_admin_lookup_catalog()
returns jsonb language plpgsql security definer set search_path=''
as $$ begin
  perform public.foodlog_require_lookup_owner();
  return (select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'kind',e.kind,'name',e.name,
    'retired',e.retired_at is not null,'usageCount',(select count(*) from public.restaurants r
      where (case when e.kind='location' then r.location_id else r.cuisine_id end)=e.id
        or (e.kind='location' and r.additional_locations @> jsonb_build_array(jsonb_build_object('locationId', e.id)))
        or exists(select 1 from public.lookup_aliases a where a.lookup_id=e.id and
          a.normalized_alias=public.foodlog_lookup_key(case when e.kind='location' then r.location else r.cuisine end)))
    ) order by e.kind,e.name),'[]'::jsonb) from public.lookup_entries e where e.merged_into_id is null);
end $$;
revoke all on function public.foodlog_admin_lookup_catalog() from public,anon;
grant execute on function public.foodlog_admin_lookup_catalog() to authenticated;
