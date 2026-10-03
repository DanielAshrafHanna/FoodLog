-- Additive lookup identity. Existing labels and restaurant history stay intact.
-- Old text-based clients remain supported; every future save resolves identity.
create or replace function public.foodlog_lookup_key(value text)
returns text language sql immutable strict parallel safe set search_path = ''
as $$ select trim(regexp_replace(lower(normalize(value, NFKC)), '[[:space:]]+', ' ', 'g')); $$;

create table public.lookup_entries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('location', 'cuisine')),
  name text not null check (public.foodlog_lookup_key(name) <> ''),
  context text not null default '',
  normalized_name text generated always as (public.foodlog_lookup_key(name)) stored,
  created_at timestamptz not null default now(),
  unique (kind, normalized_name),
  unique (kind, id)
);
create table public.lookup_aliases (
  kind text not null,
  alias text not null check (public.foodlog_lookup_key(alias) <> ''),
  normalized_alias text generated always as (public.foodlog_lookup_key(alias)) stored,
  lookup_id uuid not null,
  primary key (kind, normalized_alias),
  foreign key (kind, lookup_id) references public.lookup_entries(kind, id)
);
alter table public.lookup_entries enable row level security;
alter table public.lookup_aliases enable row level security;
create policy "Public lookup catalog" on public.lookup_entries for select to anon, authenticated using (true);
create policy "Public lookup aliases" on public.lookup_aliases for select to anon, authenticated using (true);
revoke all on public.lookup_entries, public.lookup_aliases from public, anon, authenticated;
grant select on public.lookup_entries, public.lookup_aliases to anon, authenticated;

-- Seed deterministic exact equivalence only. No fuzzy or semantic merge.
insert into public.lookup_entries (kind, name)
select kind, name from (
  select distinct on (kind, public.foodlog_lookup_key(name)) kind, trim(name) as name
  from (
    select 'location'::text kind, name from public.locations
    union all select 'cuisine', name from public.cuisines
    union all select 'location', location from public.restaurants
    union all select 'cuisine', cuisine from public.restaurants
  ) source where public.foodlog_lookup_key(name) <> ''
  order by kind, public.foodlog_lookup_key(name), name
) canonical;

-- The resolver is private: only existing RLS-protected table triggers invoke it.
-- One advisory transaction lock per kind/key protects alias and name races.
create or replace function public.foodlog_resolve_lookup(p_kind text, p_name text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_key text := public.foodlog_lookup_key(coalesce(p_name, '')); v_id uuid;
begin
  if p_kind not in ('location','cuisine') then raise exception 'Invalid lookup kind'; end if;
  if v_key = '' then return null; end if;
  select lookup_id into v_id from public.lookup_aliases where kind = p_kind and normalized_alias = v_key;
  if v_id is not null then return v_id; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_kind || ':' || v_key, 0));
  select lookup_id into v_id from public.lookup_aliases where kind = p_kind and normalized_alias = v_key;
  if v_id is not null then return v_id; end if;
  insert into public.lookup_entries (kind, name)
  values (p_kind, trim(regexp_replace(p_name, '[[:space:]]+', ' ', 'g')))
  on conflict (kind, normalized_name) do update set name = lookup_entries.name
  returning id into v_id;
  insert into public.lookup_aliases(kind, alias, lookup_id) values (p_kind, p_name, v_id)
  on conflict (kind, normalized_alias) do nothing;
  return v_id;
end; $$;
revoke all on function public.foodlog_resolve_lookup(text,text) from public, anon, authenticated;

insert into public.lookup_aliases(kind, alias, lookup_id)
select kind, name, id from public.lookup_entries;

alter table public.restaurants add column location_id uuid, add column cuisine_id uuid;
alter table public.restaurants add constraint restaurants_location_id_fkey foreign key(location_id) references public.lookup_entries(id);
alter table public.restaurants add constraint restaurants_cuisine_id_fkey foreign key(cuisine_id) references public.lookup_entries(id);
create index restaurants_location_id_idx on public.restaurants(location_id);
create index restaurants_cuisine_id_idx on public.restaurants(cuisine_id);

create or replace function public.foodlog_canonical_restaurant_lookups()
returns trigger language plpgsql security definer set search_path = ''
as $$ begin
  -- Lock in a consistent kind order, including imports and stale clients.
  new.location_id := public.foodlog_resolve_lookup('location', new.location);
  new.cuisine_id := public.foodlog_resolve_lookup('cuisine', new.cuisine);
  if new.location_id is not null then
    select name into new.location from public.lookup_entries where id = new.location_id;
  else new.location := ''; end if;
  if new.cuisine_id is not null then
    select name into new.cuisine from public.lookup_entries where id = new.cuisine_id;
  else new.cuisine := ''; end if;
  return new;
end; $$;
revoke all on function public.foodlog_canonical_restaurant_lookups() from public, anon, authenticated;
create trigger canonical_restaurant_lookups before insert or update of location,cuisine,location_id,cuisine_id
  on public.restaurants for each row execute function public.foodlog_canonical_restaurant_lookups();

create or replace function public.foodlog_canonical_legacy_lookup()
returns trigger language plpgsql security definer set search_path = ''
as $$ declare v_id uuid; begin
  v_id := public.foodlog_resolve_lookup(case when tg_table_name = 'locations' then 'location' else 'cuisine' end, new.name);
  if v_id is null then raise exception 'Enter a lookup name'; end if;
  select name into new.name from public.lookup_entries where id = v_id;
  return new;
end; $$;
revoke all on function public.foodlog_canonical_legacy_lookup() from public, anon, authenticated;
create trigger canonical_location_name before insert on public.locations for each row execute function public.foodlog_canonical_legacy_lookup();
create trigger canonical_cuisine_name before insert on public.cuisines for each row execute function public.foodlog_canonical_legacy_lookup();

create or replace function public.foodlog_lookup_catalog()
returns jsonb language sql stable security invoker set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'kind', e.kind, 'name', e.name, 'context', e.context,
    'aliases', coalesce((select jsonb_agg(a.alias order by a.alias) from public.lookup_aliases a
      where a.lookup_id = e.id and a.alias <> e.name), '[]'::jsonb)) order by e.kind,e.name), '[]'::jsonb)
  from public.lookup_entries e;
$$;
revoke all on function public.foodlog_lookup_catalog() from public;
grant execute on function public.foodlog_lookup_catalog() to anon, authenticated;
-- Existing restaurant text/history is deliberately not rewritten/backfilled.
-- The catalog supplies identity for legacy rows; subsequent saves attach IDs.

-- Familiar cuisine choices; preserve existing categories such as Sushi and Bowls.
select public.foodlog_resolve_lookup('cuisine', 'American');
select public.foodlog_resolve_lookup('cuisine', 'Chinese');
select public.foodlog_resolve_lookup('cuisine', 'Egyptian');
select public.foodlog_resolve_lookup('cuisine', 'French');
select public.foodlog_resolve_lookup('cuisine', 'Greek');
select public.foodlog_resolve_lookup('cuisine', 'Indian');
select public.foodlog_resolve_lookup('cuisine', 'International');
select public.foodlog_resolve_lookup('cuisine', 'Italian');
select public.foodlog_resolve_lookup('cuisine', 'Japanese');
select public.foodlog_resolve_lookup('cuisine', 'Korean');
select public.foodlog_resolve_lookup('cuisine', 'Lebanese');
select public.foodlog_resolve_lookup('cuisine', 'Mediterranean');
select public.foodlog_resolve_lookup('cuisine', 'Mexican');
select public.foodlog_resolve_lookup('cuisine', 'Middle Eastern');
select public.foodlog_resolve_lookup('cuisine', 'Seafood');
select public.foodlog_resolve_lookup('cuisine', 'Spanish');
select public.foodlog_resolve_lookup('cuisine', 'Thai');
select public.foodlog_resolve_lookup('cuisine', 'Turkish');
select public.foodlog_resolve_lookup('cuisine', 'Vietnamese');
select public.foodlog_resolve_lookup('cuisine', 'Yemeni');

-- Search aliases only when the preferred entry exists. A conflicting existing
-- entry wins and remains separate pending manual review.
update public.lookup_entries set context = 'Cairo' where kind = 'location' and normalized_name = public.foodlog_lookup_key('Maadi');
insert into public.lookup_aliases(kind, alias, lookup_id) select kind, 'المعادي', id from public.lookup_entries where kind = 'location' and normalized_name = public.foodlog_lookup_key('Maadi') on conflict (kind, normalized_alias) do nothing;
insert into public.lookup_aliases(kind, alias, lookup_id) select kind, 'معادي', id from public.lookup_entries where kind = 'location' and normalized_name = public.foodlog_lookup_key('Maadi') on conflict (kind, normalized_alias) do nothing;
update public.lookup_entries set context = 'Cairo' where kind = 'location' and normalized_name = public.foodlog_lookup_key('Madenet Nasr');
insert into public.lookup_aliases(kind, alias, lookup_id) select kind, 'Nasr City', id from public.lookup_entries where kind = 'location' and normalized_name = public.foodlog_lookup_key('Madenet Nasr') on conflict (kind, normalized_alias) do nothing;
insert into public.lookup_aliases(kind, alias, lookup_id) select kind, 'Madinat Nasr', id from public.lookup_entries where kind = 'location' and normalized_name = public.foodlog_lookup_key('Madenet Nasr') on conflict (kind, normalized_alias) do nothing;
insert into public.lookup_aliases(kind, alias, lookup_id) select kind, 'Madinet Nasr', id from public.lookup_entries where kind = 'location' and normalized_name = public.foodlog_lookup_key('Madenet Nasr') on conflict (kind, normalized_alias) do nothing;
insert into public.lookup_aliases(kind, alias, lookup_id) select kind, 'مدينة نصر', id from public.lookup_entries where kind = 'location' and normalized_name = public.foodlog_lookup_key('Madenet Nasr') on conflict (kind, normalized_alias) do nothing;
update public.lookup_entries set context = 'Cairo' where kind = 'location' and normalized_name = public.foodlog_lookup_key('Zamalek');
insert into public.lookup_aliases(kind, alias, lookup_id) select kind, 'الزمالك', id from public.lookup_entries where kind = 'location' and normalized_name = public.foodlog_lookup_key('Zamalek') on conflict (kind, normalized_alias) do nothing;
insert into public.lookup_aliases(kind, alias, lookup_id) select kind, 'زمالك', id from public.lookup_entries where kind = 'location' and normalized_name = public.foodlog_lookup_key('Zamalek') on conflict (kind, normalized_alias) do nothing;
insert into public.lookup_aliases(kind, alias, lookup_id) select kind, 'الإسكندرية', id from public.lookup_entries where kind = 'location' and normalized_name = public.foodlog_lookup_key('Alexandria') on conflict (kind, normalized_alias) do nothing;
insert into public.lookup_aliases(kind, alias, lookup_id) select kind, 'الاسكندرية', id from public.lookup_entries where kind = 'location' and normalized_name = public.foodlog_lookup_key('Alexandria') on conflict (kind, normalized_alias) do nothing;
update public.lookup_entries set context = 'Giza' where kind = 'location' and normalized_name = public.foodlog_lookup_key('Sheikh Zayed');
insert into public.lookup_aliases(kind, alias, lookup_id) select kind, 'الشيخ زايد', id from public.lookup_entries where kind = 'location' and normalized_name = public.foodlog_lookup_key('Sheikh Zayed') on conflict (kind, normalized_alias) do nothing;
insert into public.lookup_aliases(kind, alias, lookup_id) select kind, 'صيني', id from public.lookup_entries where kind = 'cuisine' and normalized_name = public.foodlog_lookup_key('Chinese') on conflict (kind, normalized_alias) do nothing;
insert into public.lookup_aliases(kind, alias, lookup_id) select kind, 'إيطالي', id from public.lookup_entries where kind = 'cuisine' and normalized_name = public.foodlog_lookup_key('Italian') on conflict (kind, normalized_alias) do nothing;
insert into public.lookup_aliases(kind, alias, lookup_id) select kind, 'ايطالي', id from public.lookup_entries where kind = 'cuisine' and normalized_name = public.foodlog_lookup_key('Italian') on conflict (kind, normalized_alias) do nothing;
insert into public.lookup_aliases(kind, alias, lookup_id) select kind, 'ياباني', id from public.lookup_entries where kind = 'cuisine' and normalized_name = public.foodlog_lookup_key('Japanese') on conflict (kind, normalized_alias) do nothing;
insert into public.lookup_aliases(kind, alias, lookup_id) select kind, 'كوري', id from public.lookup_entries where kind = 'cuisine' and normalized_name = public.foodlog_lookup_key('Korean') on conflict (kind, normalized_alias) do nothing;
insert into public.lookup_aliases(kind, alias, lookup_id) select kind, 'مصري', id from public.lookup_entries where kind = 'cuisine' and normalized_name = public.foodlog_lookup_key('Egyptian') on conflict (kind, normalized_alias) do nothing;
