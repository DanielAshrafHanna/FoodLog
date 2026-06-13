-- Per-user dish ratings and reviews.
-- Each approved editor keeps ONE rating + review per dish (0.5–5). "No rating" = no row.
-- Everyone (incl. anon) can read; each editor can only write their own row.

create table if not exists public.dish_ratings (
  dish_id uuid not null references public.dishes(id) on delete cascade,
  rater_email text not null,
  rater_name text not null default '',
  rating numeric(2,1) not null check (rating >= 0.5 and rating <= 5),
  notes text not null default '',
  updated_at timestamptz not null default now(),
  primary key (dish_id, rater_email)
);

create index if not exists dish_ratings_dish_idx
  on public.dish_ratings(dish_id);

grant select on public.dish_ratings to anon, authenticated;
grant insert, update, delete on public.dish_ratings to authenticated;

create or replace function public.normalize_dish_rating_email()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.rater_email = lower(trim(new.rater_email));
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists dish_ratings_normalize_email on public.dish_ratings;
create trigger dish_ratings_normalize_email
before insert or update on public.dish_ratings
for each row execute function public.normalize_dish_rating_email();

alter table public.dish_ratings enable row level security;

drop policy if exists "Anyone can read dish ratings" on public.dish_ratings;
create policy "Anyone can read dish ratings"
on public.dish_ratings for select
to anon, authenticated
using (true);

drop policy if exists "Approved users can insert own dish rating" on public.dish_ratings;
create policy "Approved users can insert own dish rating"
on public.dish_ratings for insert
to authenticated
with check (
  lower(rater_email) = lower((select auth.jwt() ->> 'email'))
  and exists (
    select 1 from public.approved_users
    where lower(approved_users.email) = lower((select auth.jwt() ->> 'email'))
  )
);

drop policy if exists "Approved users can update own dish rating" on public.dish_ratings;
create policy "Approved users can update own dish rating"
on public.dish_ratings for update
to authenticated
using (
  lower(rater_email) = lower((select auth.jwt() ->> 'email'))
  and exists (
    select 1 from public.approved_users
    where lower(approved_users.email) = lower((select auth.jwt() ->> 'email'))
  )
)
with check (
  lower(rater_email) = lower((select auth.jwt() ->> 'email'))
  and exists (
    select 1 from public.approved_users
    where lower(approved_users.email) = lower((select auth.jwt() ->> 'email'))
  )
);

drop policy if exists "Approved users can delete own dish rating" on public.dish_ratings;
create policy "Approved users can delete own dish rating"
on public.dish_ratings for delete
to authenticated
using (
  lower(rater_email) = lower((select auth.jwt() ->> 'email'))
  and exists (
    select 1 from public.approved_users
    where lower(approved_users.email) = lower((select auth.jwt() ->> 'email'))
  )
);

drop policy if exists "Owner can update any dish rating" on public.dish_ratings;
create policy "Owner can update any dish rating"
on public.dish_ratings for update
to authenticated
using (lower((select auth.jwt() ->> 'email')) = 'danielhanna0001@gmail.com')
with check (lower((select auth.jwt() ->> 'email')) = 'danielhanna0001@gmail.com');

drop policy if exists "Owner can delete any dish rating" on public.dish_ratings;
create policy "Owner can delete any dish rating"
on public.dish_ratings for delete
to authenticated
using (lower((select auth.jwt() ->> 'email')) = 'danielhanna0001@gmail.com');

-- Backfill legacy single-rating dishes into one row per dish.
insert into public.dish_ratings (dish_id, rater_email, rater_name, rating, notes, updated_at)
select
  d.id,
  'legacy@import',
  coalesce(nullif(trim(d.updated_by), ''), 'Imported'),
  d.rating,
  coalesce(d.notes, ''),
  d.updated_at
from public.dishes d
where d.rating >= 0.5
on conflict (dish_id, rater_email) do nothing;

-- Realtime (safe if already added)
do $$
begin
  alter publication supabase_realtime add table public.dish_ratings;
exception when duplicate_object then null;
end $$;
