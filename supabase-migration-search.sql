-- Full-text search column on restaurants (for future server-side search; client still filters locally).

-- visited[] omitted: array_to_string is not immutable in generated columns.
-- Client search still includes visited names and dish liked-by.

alter table public.restaurants
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(location, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(cuisine, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(notes, '')), 'C')
  ) stored;

create index if not exists restaurants_search_vector_idx
  on public.restaurants using gin (search_vector);
