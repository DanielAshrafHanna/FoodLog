alter table public.restaurant_ratings
  add column if not exists notes text not null default '';
