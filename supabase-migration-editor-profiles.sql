-- Display names for "Last updated by" (public read; users upsert their own row on sign-in).

create table if not exists public.editor_profiles (
  email text primary key,
  display_name text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.editor_profiles enable row level security;

drop policy if exists "Anyone can read editor profiles" on public.editor_profiles;
create policy "Anyone can read editor profiles"
on public.editor_profiles for select
to anon, authenticated
using (true);

drop policy if exists "Users can insert own editor profile" on public.editor_profiles;
create policy "Users can insert own editor profile"
on public.editor_profiles for insert
to authenticated
with check (lower(email) = lower((select auth.jwt() ->> 'email')));

drop policy if exists "Users can update own editor profile" on public.editor_profiles;
create policy "Users can update own editor profile"
on public.editor_profiles for update
to authenticated
using (lower(email) = lower((select auth.jwt() ->> 'email')))
with check (lower(email) = lower((select auth.jwt() ->> 'email')));

insert into public.editor_profiles (email, display_name)
select distinct lower(trim(email)), trim(display_name)
from public.pending_approvals
where trim(display_name) <> ''
on conflict (email) do update
set display_name = excluded.display_name
where trim(public.editor_profiles.display_name) = '';

-- Mirror Supabase Auth display names (same source as Dashboard → Authentication → Users).
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
