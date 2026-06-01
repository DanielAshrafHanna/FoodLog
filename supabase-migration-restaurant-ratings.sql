-- Per-user restaurant ratings.
-- Each approved editor keeps ONE rating per restaurant (0.5–5). "No rating" = no row.
-- Everyone (incl. anon) can read; each editor can only write their own row.

create table if not exists public.restaurant_ratings (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  rater_email text not null,
  rater_name text not null default '',
  rating numeric(2,1) not null check (rating >= 0.5 and rating <= 5),
  updated_at timestamptz not null default now(),
  primary key (restaurant_id, rater_email)
);

create index if not exists restaurant_ratings_restaurant_idx
  on public.restaurant_ratings(restaurant_id);

grant select on public.restaurant_ratings to anon, authenticated;
grant insert, update, delete on public.restaurant_ratings to authenticated;

-- Keep email normalised so the "own row" RLS check is reliable.
create or replace function public.normalize_restaurant_rating_email()
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

drop trigger if exists restaurant_ratings_normalize_email on public.restaurant_ratings;
create trigger restaurant_ratings_normalize_email
before insert or update on public.restaurant_ratings
for each row execute function public.normalize_restaurant_rating_email();

alter table public.restaurant_ratings enable row level security;

drop policy if exists "Anyone can read restaurant ratings" on public.restaurant_ratings;
create policy "Anyone can read restaurant ratings"
on public.restaurant_ratings for select
to anon, authenticated
using (true);

drop policy if exists "Approved users can insert own rating" on public.restaurant_ratings;
create policy "Approved users can insert own rating"
on public.restaurant_ratings for insert
to authenticated
with check (
  lower(rater_email) = lower((select auth.jwt() ->> 'email'))
  and exists (
    select 1 from public.approved_users
    where lower(approved_users.email) = lower((select auth.jwt() ->> 'email'))
  )
);

drop policy if exists "Approved users can update own rating" on public.restaurant_ratings;
create policy "Approved users can update own rating"
on public.restaurant_ratings for update
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

drop policy if exists "Approved users can delete own rating" on public.restaurant_ratings;
create policy "Approved users can delete own rating"
on public.restaurant_ratings for delete
to authenticated
using (
  lower(rater_email) = lower((select auth.jwt() ->> 'email'))
  and exists (
    select 1 from public.approved_users
    where lower(approved_users.email) = lower((select auth.jwt() ->> 'email'))
  )
);

-- Owner (admin) can edit or remove ANY user's rating. RLS policies are OR'd,
-- so these sit alongside the own-row policies above.
drop policy if exists "Owner can update any rating" on public.restaurant_ratings;
create policy "Owner can update any rating"
on public.restaurant_ratings for update
to authenticated
using (lower((select auth.jwt() ->> 'email')) = 'danielhanna0001@gmail.com')
with check (lower((select auth.jwt() ->> 'email')) = 'danielhanna0001@gmail.com');

drop policy if exists "Owner can delete any rating" on public.restaurant_ratings;
create policy "Owner can delete any rating"
on public.restaurant_ratings for delete
to authenticated
using (lower((select auth.jwt() ->> 'email')) = 'danielhanna0001@gmail.com');
