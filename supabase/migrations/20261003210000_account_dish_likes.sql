-- Additive: existing dishes.liked_by names remain untouched and visible as earlier likes.
create table public.dish_likes (
  dish_id uuid not null references public.dishes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 120),
  liked boolean not null default true,
  liked_at timestamptz not null default now(),
  primary key (dish_id, user_id)
);
create index dish_likes_user_id_idx on public.dish_likes(user_id);
alter table public.dish_likes enable row level security;
revoke all on public.dish_likes from public, anon, authenticated;
grant select on public.dish_likes to anon, authenticated;

-- A public, identity-free signal remains readable after unlike. Realtime cannot
-- deliver the now-hidden inactive like row through its SELECT policy.
create table public.dish_like_changes (
  dish_id uuid primary key references public.dishes(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  changed_at timestamptz not null default now()
);
create index dish_like_changes_restaurant_id_idx on public.dish_like_changes(restaurant_id);
alter table public.dish_like_changes enable row level security;
revoke all on public.dish_like_changes from public, anon, authenticated;
grant select on public.dish_like_changes to anon, authenticated;
create policy "Public can read active dish like changes"
on public.dish_like_changes for select to anon, authenticated
using (exists (
  select 1 from public.dishes d join public.restaurants r on r.id = d.restaurant_id
  where d.id = dish_like_changes.dish_id and d.deleted_at is null and r.deleted_at is null
));

create policy "Public can read active dish likes"
on public.dish_likes for select to anon, authenticated
using (
  liked and exists (
    select 1 from public.dishes d join public.restaurants r on r.id = d.restaurant_id
    where d.id = dish_likes.dish_id and d.deleted_at is null and r.deleted_at is null
  )
);

-- No client-supplied person/name: one authenticated approved person controls only their own like.
-- The table has no direct write grants; this narrowly scoped function is the write gateway.
create function public.set_dish_like(p_dish_id uuid, p_liked boolean)
returns boolean language plpgsql security definer set search_path = ''
as $function$
declare
  actor uuid := (select auth.uid());
  actor_name text;
  parent_id uuid;
begin
  if actor is null or not public.is_approved_editor() then
    raise exception 'Editing approval is required to like a dish.' using errcode = '42501';
  end if;
  if p_liked is null then raise exception 'Choose whether this dish is liked.'; end if;
  perform 1 from public.dishes d join public.restaurants r on r.id = d.restaurant_id
    where d.id = p_dish_id and d.deleted_at is null and r.deleted_at is null
    for share of d, r;
  if not found then raise exception 'This dish is unavailable or in Trash.'; end if;
  select restaurant_id into parent_id from public.dishes where id = p_dish_id;

  select left(coalesce(nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
    nullif(btrim(u.raw_user_meta_data ->> 'display_name'), ''), 'Friend'), 120)
    into actor_name from auth.users u where u.id = actor;
  if not found then raise exception 'Sign in again before liking this dish.' using errcode = '42501'; end if;

  insert into public.dish_likes (dish_id, user_id, display_name, liked, liked_at)
  values (p_dish_id, actor, actor_name, p_liked, now())
  on conflict (dish_id, user_id) do update set
    display_name = excluded.display_name, liked = excluded.liked, liked_at = excluded.liked_at;
  insert into public.dish_like_changes (dish_id, restaurant_id, changed_at)
  values (p_dish_id, parent_id, clock_timestamp())
  on conflict (dish_id) do update set changed_at = excluded.changed_at;
  return p_liked;
end;
$function$;
revoke all on function public.set_dish_like(uuid, boolean) from public, anon;
grant execute on function public.set_dish_like(uuid, boolean) to authenticated;

-- Subscribe to the identity-free signal, not the inactive reaction history.
do $publication$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'dish_like_changes') then
    alter publication supabase_realtime add table public.dish_like_changes;
  end if;
end;
$publication$;
