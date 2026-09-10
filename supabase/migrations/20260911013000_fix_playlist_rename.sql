-- Playlist rename was creating a second playlist instead of renaming the original.
-- Cause 1: restaurants_sync_lookups inserts the new name after membership updates,
-- so renaming the catalog row then hit a unique conflict or left both names.
-- Cause 2: SECURITY INVOKER plus contributor RLS could skip restaurants the
-- current editor does not own, while the catalog row still changed.
-- Rename the catalog row first, then rewrite every membership. Playlist trash
-- and restore use the same definer rights so membership stays consistent.

create or replace function public.rename_foodlog_playlist(p_from text, p_to text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  from_name text := trim(p_from);
  to_name text := trim(p_to);
  renamed integer;
begin
  if not public.is_approved_editor() then
    raise exception 'Only approved editors can rename playlists.';
  end if;
  if from_name = '' or to_name = '' then
    raise exception 'Playlist name is required.';
  end if;
  if from_name = to_name then
    return;
  end if;
  if exists (
    select 1 from public.playlists
    where name = to_name and deleted_at is null
  ) then
    raise exception 'A playlist with that name already exists.';
  end if;
  if exists (
    select 1 from public.playlists
    where name = to_name and deleted_at is not null
  ) then
    raise exception 'A playlist with that name is in Trash. Restore or rename it there first.';
  end if;

  update public.playlists
  set name = to_name, deleted_at = null, deleted_by = null
  where name = from_name and deleted_at is null;
  get diagnostics renamed = row_count;

  if renamed = 0 then
    insert into public.playlists (name)
    values (to_name)
    on conflict (name) do update set deleted_at = null, deleted_by = null;
  end if;

  update public.restaurants as restaurant
  set
    playlists = updated.new_playlists,
    playlist = coalesce(updated.new_playlists[1], ''),
    updated_at = now()
  from (
    select
      id,
      (
        select coalesce(array_agg(distinct member), '{}'::text[])
        from unnest(
          array_replace(
            case
              when from_name = any(coalesce(playlists, '{}'::text[])) then coalesce(playlists, '{}'::text[])
              when playlist = from_name then array[from_name]
              else coalesce(playlists, '{}'::text[])
            end,
            from_name,
            to_name
          )
        ) as member
        where member <> ''
      ) as new_playlists
    from public.restaurants
    where deleted_at is null
      and (
        from_name = any(coalesce(playlists, '{}'::text[]))
        or playlist = from_name
      )
  ) as updated
  where restaurant.id = updated.id;
end;
$$;

create or replace function public.trash_foodlog_playlist(p_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  playlist_name text := trim(p_name);
  member_ids uuid[];
  actor_email text := lower(coalesce((select auth.jwt() ->> 'email'), ''));
begin
  if not public.is_approved_editor() then
    raise exception 'Only approved editors can move playlists to Trash.';
  end if;

  select coalesce(array_agg(id), '{}'::uuid[])
  into member_ids
  from public.restaurants
  where deleted_at is null
    and (
      playlist_name = any(coalesce(playlists, '{}'::text[]))
      or playlist = playlist_name
    );

  update public.restaurants
  set
    playlists = array_remove(coalesce(playlists, '{}'::text[]), playlist_name),
    playlist = coalesce(
      (array_remove(coalesce(playlists, '{}'::text[]), playlist_name))[1],
      ''
    ),
    updated_at = now()
  where id = any(member_ids);

  update public.playlists
  set deleted_at = now(), deleted_by = actor_email, member_restaurant_ids = member_ids
  where name = playlist_name and deleted_at is null;

  if not found then
    insert into public.playlists (name, deleted_at, deleted_by, member_restaurant_ids)
    values (playlist_name, now(), actor_email, member_ids)
    on conflict (name) do update set
      deleted_at = excluded.deleted_at,
      deleted_by = excluded.deleted_by,
      member_restaurant_ids = excluded.member_restaurant_ids;
  end if;
end;
$$;

create or replace function public.restore_foodlog_playlist(p_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  playlist_name text := trim(p_name);
  member_ids uuid[];
begin
  if not public.is_approved_editor() then
    raise exception 'Only approved editors can restore playlists.';
  end if;

  select member_restaurant_ids
  into member_ids
  from public.playlists
  where name = playlist_name and deleted_at is not null
  for update;

  if not found then
    raise exception 'Playlist is not available in Trash.';
  end if;

  update public.restaurants
  set
    playlists = case
      when playlist_name = any(coalesce(playlists, '{}'::text[])) then playlists
      else array_append(coalesce(playlists, '{}'::text[]), playlist_name)
    end,
    playlist = case
      when coalesce(array_length(playlists, 1), 0) = 0 then playlist_name
      else playlist
    end,
    updated_at = now()
  where id = any(coalesce(member_ids, '{}'::uuid[]))
    and deleted_at is null;

  update public.playlists
  set deleted_at = null, deleted_by = null, member_restaurant_ids = '{}'::uuid[]
  where name = playlist_name;
end;
$$;

revoke all on function public.rename_foodlog_playlist(text, text) from public;
revoke all on function public.trash_foodlog_playlist(text) from public;
revoke all on function public.restore_foodlog_playlist(text) from public;
grant execute on function public.rename_foodlog_playlist(text, text) to authenticated;
grant execute on function public.trash_foodlog_playlist(text) to authenticated;
grant execute on function public.restore_foodlog_playlist(text) to authenticated;
