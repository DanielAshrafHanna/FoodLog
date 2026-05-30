-- Sync editor_profiles from Supabase Auth user metadata (Dashboard → Authentication → Users).

create or replace function public.sync_editor_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  name text;
begin
  name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(trim(new.raw_user_meta_data->>'display_name'), '')
  );
  if name is null then
    return new;
  end if;
  insert into public.editor_profiles (email, display_name, updated_at)
  values (lower(new.email), name, now())
  on conflict (email) do update
  set display_name = excluded.display_name, updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_sync_editor_profile on auth.users;
create trigger on_auth_user_sync_editor_profile
  after insert or update of raw_user_meta_data on auth.users
  for each row execute function public.sync_editor_profile_from_auth();

insert into public.editor_profiles (email, display_name, updated_at)
select
  lower(u.email),
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(u.raw_user_meta_data->>'name'), ''),
    nullif(trim(u.raw_user_meta_data->>'display_name'), '')
  ),
  now()
from auth.users u
where coalesce(
  nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
  nullif(trim(u.raw_user_meta_data->>'name'), ''),
  nullif(trim(u.raw_user_meta_data->>'display_name'), '')
) is not null
on conflict (email) do update
set
  display_name = excluded.display_name,
  updated_at = now();
