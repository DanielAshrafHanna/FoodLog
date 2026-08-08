-- Additive capture-first transaction. This creates a restaurant, the current
-- editor's optional rating, and their initial Want-to-go bookmark atomically.
-- Existing edit and save functions remain unchanged for backwards compatibility.
create or replace function public.save_restaurant_capture(
  p_restaurant jsonb,
  p_rating numeric default null,
  p_want_to_go boolean default true
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $save_restaurant_capture$
declare
  saved_id uuid;
  actor_email text := lower(coalesce((select auth.jwt() ->> 'email'), ''));
begin
  if not public.is_approved_editor() then
    raise exception 'Only approved editors can save restaurants.';
  end if;

  saved_id := public.save_restaurant_with_rating(
    p_restaurant,
    p_rating,
    null
  );

  if p_want_to_go then
    insert into public.restaurant_want_to_go (
      restaurant_id,
      user_email,
      updated_at
    )
    values (
      saved_id,
      actor_email,
      now()
    )
    on conflict (restaurant_id, user_email)
    do update set updated_at = excluded.updated_at;
  end if;

  return saved_id;
end;
$save_restaurant_capture$;

revoke all on function public.save_restaurant_capture(jsonb, numeric, boolean) from public;
revoke all on function public.save_restaurant_capture(jsonb, numeric, boolean) from anon;
revoke all on function public.save_restaurant_capture(jsonb, numeric, boolean) from authenticated;
grant execute on function public.save_restaurant_capture(jsonb, numeric, boolean) to authenticated;
