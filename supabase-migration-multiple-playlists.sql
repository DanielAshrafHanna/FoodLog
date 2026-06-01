-- Allow a restaurant to belong to multiple playlists.
-- Adds restaurants.playlists (text[]) and backfills it from the legacy single
-- restaurants.playlist column. The old column is kept (and still written as the
-- first selected playlist) so older cached clients keep working.

alter table public.restaurants
  add column if not exists playlists text[] not null default '{}';

update public.restaurants
  set playlists = array[btrim(playlist)]
  where btrim(coalesce(playlist, '')) <> ''
    and (playlists is null or cardinality(playlists) = 0);
