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
      now(), actor_name, p_batch_id
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
