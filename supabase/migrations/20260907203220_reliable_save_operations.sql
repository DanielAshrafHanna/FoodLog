-- Durable, idempotent parent saves. A browser creates the operation and entity
-- UUIDs before sending the request. If the response is lost, replaying the same
-- operation returns its original entity without applying the mutation twice.
create table if not exists private.save_operation_receipts (
  operation_id uuid primary key,
  actor_id uuid not null references auth.users(id) on delete cascade,
  actor_email text not null,
  entity_type text not null check (entity_type in ('restaurant', 'dish')),
  entity_id uuid not null,
  created_at timestamptz not null default now()
);

alter table private.save_operation_receipts enable row level security;
grant usage on schema private to authenticated;
grant select, insert on private.save_operation_receipts to authenticated;

drop policy if exists "Editors can read own save receipts" on private.save_operation_receipts;
create policy "Editors can read own save receipts"
on private.save_operation_receipts for select
to authenticated
using (actor_id = (select auth.uid()));

drop policy if exists "Editors can insert own save receipts" on private.save_operation_receipts;
create policy "Editors can insert own save receipts"
on private.save_operation_receipts for insert
to authenticated
with check (
  actor_id = (select auth.uid())
  and actor_email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  and public.is_approved_editor()
);

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
      notes, visited, updated_at, updated_by
    ) values (
      p_restaurant_id, actor_user_id, trim(p_restaurant ->> 'name'),
      coalesce(p_restaurant ->> 'location', ''), coalesce(p_restaurant ->> 'cuisine', ''),
      coalesce(p_restaurant ->> 'playlist', ''),
      coalesce(array(select jsonb_array_elements_text(coalesce(p_restaurant -> 'playlists', '[]'::jsonb))), '{}'::text[]),
      coalesce(p_restaurant ->> 'price', '$$'), coalesce(p_restaurant ->> 'maps', ''),
      coalesce(p_restaurant ->> 'notes', ''),
      coalesce(array(select jsonb_array_elements_text(coalesce(p_restaurant -> 'visited', '[]'::jsonb))), '{}'::text[]),
      now(), actor_name
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

create or replace function public.save_dish_reliably(
  p_operation_id uuid,
  p_restaurant_id uuid,
  p_dish_id uuid,
  p_dish jsonb,
  p_rating numeric default null,
  p_review_notes text default '',
  p_create_if_missing boolean default false
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $save_dish_reliably$
declare
  actor_user_id uuid := (select auth.uid());
  actor_email text := lower(coalesce((select auth.jwt() ->> 'email'), ''));
  actor_name text := coalesce(nullif(p_dish ->> 'updated_by', ''), split_part(actor_email, '@', 1));
  saved_id uuid;
begin
  if actor_user_id is null or not public.is_approved_editor() then
    raise exception 'Only approved editors can save dishes.';
  end if;
  if p_operation_id is null or p_restaurant_id is null or p_dish_id is null then
    raise exception 'Stable save, restaurant, and dish IDs are required.';
  end if;

  select receipt.entity_id into saved_id
  from private.save_operation_receipts as receipt
  where receipt.operation_id = p_operation_id
    and receipt.actor_id = actor_user_id
    and receipt.entity_type = 'dish';
  if found then return saved_id; end if;

  if nullif(trim(p_dish ->> 'name'), '') is null then raise exception 'Dish name is required.'; end if;

  if p_create_if_missing then
    insert into public.dishes (
      id, restaurant_id, user_id, name, rating, liked_by, notes, photo_path, updated_at, updated_by
    ) values (
      p_dish_id, p_restaurant_id, actor_user_id, trim(p_dish ->> 'name'), 0,
      coalesce(array(select jsonb_array_elements_text(coalesce(p_dish -> 'liked_by', '[]'::jsonb))), '{}'::text[]),
      '', coalesce(p_dish ->> 'photo_path', ''), now(), actor_name
    );
  else
    update public.dishes set
      name = trim(p_dish ->> 'name'),
      liked_by = coalesce(array(select jsonb_array_elements_text(coalesce(p_dish -> 'liked_by', '[]'::jsonb))), '{}'::text[]),
      photo_path = coalesce(p_dish ->> 'photo_path', ''), updated_at = now(), updated_by = actor_name
    where id = p_dish_id and restaurant_id = p_restaurant_id and deleted_at is null;
    if not found then raise exception 'Dish is unavailable or in Trash.'; end if;
  end if;

  if p_rating is null then
    update public.dish_ratings set deleted_at = now(), deleted_by = actor_email
    where dish_id = p_dish_id and lower(rater_email) = actor_email and deleted_at is null;
  else
    if p_rating < 0.5 or p_rating > 5 then raise exception 'Rating must be between 0.5 and 5.'; end if;
    insert into public.dish_ratings (dish_id, rater_email, rater_name, rating, notes, deleted_at, deleted_by)
    values (p_dish_id, actor_email, actor_name, p_rating, coalesce(p_review_notes, ''), null, null)
    on conflict (dish_id, rater_email) do update set
      rater_name = excluded.rater_name, rating = excluded.rating, notes = excluded.notes,
      deleted_at = null, deleted_by = null;
  end if;

  insert into private.save_operation_receipts (operation_id, actor_id, actor_email, entity_type, entity_id)
  values (p_operation_id, actor_user_id, actor_email, 'dish', p_dish_id);
  return p_dish_id;
end;
$save_dish_reliably$;

revoke all on function public.save_restaurant_reliably(uuid, uuid, jsonb, numeric, boolean, boolean) from public, anon, authenticated;
grant execute on function public.save_restaurant_reliably(uuid, uuid, jsonb, numeric, boolean, boolean) to authenticated;
revoke all on function public.save_dish_reliably(uuid, uuid, uuid, jsonb, numeric, text, boolean) from public, anon, authenticated;
grant execute on function public.save_dish_reliably(uuid, uuid, uuid, jsonb, numeric, text, boolean) to authenticated;
