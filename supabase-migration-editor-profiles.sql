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
