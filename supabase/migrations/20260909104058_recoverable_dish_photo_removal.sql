-- A removal marker preserves both legacy dish.photo_path and newer shared uploads.
-- No existing photo, dish, review, or Storage object is rewritten or deleted.
create table public.dish_photo_removals (
  dish_id uuid not null references public.dishes(id) on delete cascade,
  photo_path text not null,
  user_id uuid not null references auth.users(id),
  deleted_at timestamptz not null default now(),
  deleted_by text not null,
  primary key (dish_id, photo_path)
);
create index dish_photo_removals_user_idx on public.dish_photo_removals(user_id);
alter table public.dish_photo_removals enable row level security;
revoke all on public.dish_photo_removals from anon, authenticated;
grant select on public.dish_photo_removals to anon, authenticated;
grant insert, delete on public.dish_photo_removals to authenticated;

-- Public readers need the markers to exclude removed photos from the shared gallery.
-- Contributors and the owner can also read their markers when a parent is in Trash.
create policy "Read dish photo removal markers" on public.dish_photo_removals
for select to authenticated using (
  exists (select 1 from public.dishes d join public.restaurants r on r.id=d.restaurant_id
    where d.id=dish_id and d.deleted_at is null and r.deleted_at is null)
  or (select public.is_foodlog_owner())
  or user_id=(select auth.uid())
);
create policy "Visitors read active dish photo removal markers" on public.dish_photo_removals
for select to anon using (
  exists (select 1 from public.dishes d join public.restaurants r on r.id=d.restaurant_id
    where d.id=dish_id and d.deleted_at is null and r.deleted_at is null)
);
create policy "Contributors and owner can remove dish photos" on public.dish_photo_removals
for insert to authenticated with check (
  (select public.is_approved_editor())
  and ((select public.is_foodlog_owner()) or user_id=(select auth.uid()))
  and exists (select 1 from public.dishes d join public.restaurants r on r.id=d.restaurant_id
    where d.id=dish_id and d.deleted_at is null and r.deleted_at is null)
);
create policy "Contributors and owner can restore dish photos" on public.dish_photo_removals
for delete to authenticated using (
  (select public.is_approved_editor())
  and ((select public.is_foodlog_owner()) or user_id=(select auth.uid()))
);

-- Resolve the real photo owner on the server; client-supplied attribution is ignored.
-- Invoker security retains RLS on parent/photo lookups.
create function private.stamp_dish_photo_removal() returns trigger
language plpgsql security invoker set search_path='' as $$
declare photo_owner uuid; legacy_path text;
begin
  if auth.uid() is null or not public.is_approved_editor() then
    raise exception 'Sign in as an approved contributor';
  end if;
  select p.user_id into photo_owner from public.dish_photos p
    where p.dish_id=new.dish_id and p.photo_path=new.photo_path;
  if not found then
    select d.photo_path into legacy_path from public.dishes d
      where d.id=new.dish_id and d.photo_path=new.photo_path;
    if not found then raise exception 'This photo no longer belongs to the dish'; end if;
    -- Legacy filenames store the uploader UUID. Unknown legacy owners remain owner-only.
    if split_part(legacy_path,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      photo_owner := split_part(legacy_path,'/',1)::uuid;
    else
      if not public.is_foodlog_owner() then raise exception 'Only the owner can manage photos with unknown attribution'; end if;
      photo_owner := auth.uid();
    end if;
  end if;
  if photo_owner is distinct from auth.uid() and not public.is_foodlog_owner() then
    raise exception 'You can only remove your own photos';
  end if;
  new.user_id := photo_owner;
  new.deleted_at := now();
  new.deleted_by := lower(coalesce(auth.jwt()->>'email',''));
  return new;
end;
$$;
revoke all on function private.stamp_dish_photo_removal() from public,anon,authenticated;
create trigger stamp_dish_photo_removal before insert on public.dish_photo_removals
for each row execute function private.stamp_dish_photo_removal();

-- Realtime refresh uses the same channel as shared dish photo contributions.
do $$ begin
  if exists (select 1 from pg_publication where pubname='supabase_realtime') then
    alter publication supabase_realtime add table public.dish_photo_removals;
  end if;
end $$;
