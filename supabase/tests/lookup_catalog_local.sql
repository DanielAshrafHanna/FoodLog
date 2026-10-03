-- Run only against disposable local PostgreSQL after the lookup migration.
-- Fixture bootstrap: locations/cuisines(name text primary key), restaurants
-- (id uuid default gen_random_uuid(), location text, cuisine text), anon/authenticated roles.
begin;
do $$
declare v_id uuid; v_other uuid; v_count int;
begin
  if public.foodlog_lookup_key(' ＭＡＡＤＩ ') <> 'maadi' then raise exception 'Unicode normalization failed'; end if;
  if public.foodlog_lookup_key('New  Cairo') <> 'new cairo' then raise exception 'Whitespace normalization failed'; end if;
  if public.foodlog_lookup_key('A-B') = public.foodlog_lookup_key('AB') then raise exception 'Distinct boundaries collapsed'; end if;
  insert into public.restaurants(location,cuisine) values('Nasr City','صيني') returning location_id into v_id;
  if not exists(select 1 from public.restaurants where location_id = v_id and location = 'Madenet Nasr' and cuisine = 'Chinese') then
    raise exception 'Aliases did not resolve';
  end if;
  insert into public.restaurants(location,cuisine) values(' MADENET  NASR ','Chinese') returning location_id into v_other;
  if v_id <> v_other then raise exception 'Equivalent names have different IDs'; end if;
  insert into public.restaurants(location,cuisine) values('A-B','Sushi');
  insert into public.restaurants(location,cuisine) values('AB','Japanese');
  if (select count(distinct cuisine_id) from public.restaurants where location in ('A-B','AB')) <> 2 then
    raise exception 'Distinct cuisines were merged';
  end if;
  insert into public.locations(name) values('nasr city') on conflict(name) do nothing;
  if exists(select 1 from public.locations where name = 'nasr city') then raise exception 'Legacy insert bypassed canonical identity'; end if;
  insert into public.restaurants(location,cuisine,location_id) values('Maadi','Chinese',v_id);
  if exists(select 1 from public.restaurants where location = 'Maadi' and location_id = v_id) then raise exception 'Forged foreign identity accepted'; end if;
  insert into public.restaurants(location,cuisine) values('','');
  if exists(select 1 from public.restaurants where location = '' and location_id is not null) then raise exception 'Optional blank acquired ID'; end if;
  select jsonb_array_length(public.foodlog_lookup_catalog()) into v_count;
  if v_count < 20 then raise exception 'Curated catalog incomplete'; end if;
  if has_function_privilege('anon','public.foodlog_resolve_lookup(text,text)','EXECUTE') then raise exception 'Anonymous create RPC exposed'; end if;
  if has_function_privilege('authenticated','public.foodlog_resolve_lookup(text,text)','EXECUTE') then raise exception 'Private resolver exposed'; end if;
  if has_table_privilege('authenticated','public.lookup_entries','INSERT') then raise exception 'Direct registry writes exposed'; end if;
  if not has_table_privilege('anon','public.lookup_entries','SELECT') then raise exception 'Public catalog unavailable'; end if;
end $$;
set local role anon;
select jsonb_array_length(public.foodlog_lookup_catalog()) as public_catalog_entries;
rollback;
