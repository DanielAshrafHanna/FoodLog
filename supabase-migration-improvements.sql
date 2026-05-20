-- Stable 3 improvements: lowercase emails, superuser admin, updated_by, realtime.

-- Lowercase approved emails on insert/update
create or replace function public.normalize_approved_user_email()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.email = lower(trim(new.email));
  return new;
end;
$$;

drop trigger if exists approved_users_normalize_email on public.approved_users;
create trigger approved_users_normalize_email
before insert or update on public.approved_users
for each row execute function public.normalize_approved_user_email();

-- Track who last edited (optional display in UI)
alter table public.restaurants add column if not exists updated_by text not null default '';
alter table public.dishes add column if not exists updated_by text not null default '';

-- Superuser can list and manage approved_users
drop policy if exists "Owner can list approved users" on public.approved_users;
create policy "Owner can list approved users"
on public.approved_users for select
to authenticated
using (lower((select auth.jwt() ->> 'email')) = 'danielhanna0001@gmail.com');

drop policy if exists "Owner can insert approved users" on public.approved_users;
create policy "Owner can insert approved users"
on public.approved_users for insert
to authenticated
with check (lower((select auth.jwt() ->> 'email')) = 'danielhanna0001@gmail.com');

drop policy if exists "Owner can update approved users" on public.approved_users;
create policy "Owner can update approved users"
on public.approved_users for update
to authenticated
using (lower((select auth.jwt() ->> 'email')) = 'danielhanna0001@gmail.com')
with check (lower((select auth.jwt() ->> 'email')) = 'danielhanna0001@gmail.com');

drop policy if exists "Owner can delete approved users" on public.approved_users;
create policy "Owner can delete approved users"
on public.approved_users for delete
to authenticated
using (
  lower((select auth.jwt() ->> 'email')) = 'danielhanna0001@gmail.com'
  and lower(email) <> 'danielhanna0001@gmail.com'
);

-- Realtime (safe if already added)
do $$
begin
  alter publication supabase_realtime add table public.restaurants;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.dishes;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.restaurant_photos;
exception when duplicate_object then null;
end $$;
