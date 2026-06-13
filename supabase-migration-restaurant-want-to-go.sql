-- Per-user "Want to go" bookmarks (private).
-- Each approved editor keeps at most ONE row per restaurant.
-- Only the signed-in user can read their own rows (unlike public ratings).

create table if not exists public.restaurant_want_to_go (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_email text not null,
  updated_at timestamptz not null default now(),
  primary key (restaurant_id, user_email)
);

create index if not exists restaurant_want_to_go_restaurant_idx
  on public.restaurant_want_to_go(restaurant_id);

grant select, insert, update, delete on public.restaurant_want_to_go to authenticated;

create or replace function public.normalize_restaurant_want_to_go_email()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.user_email = lower(trim(new.user_email));
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists restaurant_want_to_go_normalize_email on public.restaurant_want_to_go;
create trigger restaurant_want_to_go_normalize_email
before insert or update on public.restaurant_want_to_go
for each row execute function public.normalize_restaurant_want_to_go_email();

alter table public.restaurant_want_to_go enable row level security;

drop policy if exists "Users can read own want to go" on public.restaurant_want_to_go;
create policy "Users can read own want to go"
on public.restaurant_want_to_go for select
to authenticated
using (lower(user_email) = lower((select auth.jwt() ->> 'email')));

drop policy if exists "Approved users can insert own want to go" on public.restaurant_want_to_go;
create policy "Approved users can insert own want to go"
on public.restaurant_want_to_go for insert
to authenticated
with check (
  lower(user_email) = lower((select auth.jwt() ->> 'email'))
  and exists (
    select 1 from public.approved_users
    where lower(approved_users.email) = lower((select auth.jwt() ->> 'email'))
  )
);

drop policy if exists "Approved users can update own want to go" on public.restaurant_want_to_go;
create policy "Approved users can update own want to go"
on public.restaurant_want_to_go for update
to authenticated
using (
  lower(user_email) = lower((select auth.jwt() ->> 'email'))
  and exists (
    select 1 from public.approved_users
    where lower(approved_users.email) = lower((select auth.jwt() ->> 'email'))
  )
)
with check (
  lower(user_email) = lower((select auth.jwt() ->> 'email'))
  and exists (
    select 1 from public.approved_users
    where lower(approved_users.email) = lower((select auth.jwt() ->> 'email'))
  )
);

drop policy if exists "Approved users can delete own want to go" on public.restaurant_want_to_go;
create policy "Approved users can delete own want to go"
on public.restaurant_want_to_go for delete
to authenticated
using (
  lower(user_email) = lower((select auth.jwt() ->> 'email'))
  and exists (
    select 1 from public.approved_users
    where lower(approved_users.email) = lower((select auth.jwt() ->> 'email'))
  )
);

-- Realtime (safe if already added)
do $$
begin
  alter publication supabase_realtime add table public.restaurant_want_to_go;
exception when duplicate_object then null;
end $$;
