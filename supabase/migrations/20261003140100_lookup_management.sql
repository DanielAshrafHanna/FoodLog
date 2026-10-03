-- Catalog removal is recoverable; restaurant rows/history are never deleted or rewritten.
alter table public.lookup_entries add column retired_at timestamptz,
  add column merged_into_id uuid references public.lookup_entries(id);

-- Dany explicitly confirmed these names describe the same location.
do $$
declare target uuid; source record; old_name text;
begin
  select id,name into target,old_name from public.lookup_entries
    where kind='location' and normalized_name in ('new cairo','new cauro')
    order by case when normalized_name='new cairo' then 0 else 1 end limit 1;
  if target is null then target := public.foodlog_resolve_lookup('location','New Cairo'); end if;
  update public.lookup_entries set name='New Cairo',context='Cairo' where id=target;
  for source in select id,name from public.lookup_entries where kind='location'
    and normalized_name in ('new cairo','new cauro','tagamo3','tagamoo3') and id<>target
  loop
    update public.lookup_aliases set lookup_id=target where lookup_id=source.id;
    insert into public.lookup_aliases(kind,alias,lookup_id) values('location',source.name,target)
      on conflict(kind,normalized_alias) do nothing;
    update public.lookup_entries set retired_at=now(),merged_into_id=target where id=source.id;
  end loop;
  insert into public.lookup_aliases(kind,alias,lookup_id)
    select 'location',alias,target from unnest(array['New Cairo','New cauro','tagamo3','tagamoo3','التجمع','القاهرة الجديدة']) alias
    on conflict(kind,normalized_alias) do nothing;
end $$;

create or replace function public.foodlog_lookup_catalog()
returns jsonb language sql stable security invoker set search_path=''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'kind',e.kind,'name',e.name,'context',e.context,
    'retired',e.retired_at is not null,
    'aliases',coalesce((select jsonb_agg(a.alias order by a.alias) from public.lookup_aliases a
      where a.lookup_id=e.id and a.alias<>e.name),'[]'::jsonb)) order by e.kind,e.name),'[]'::jsonb)
  from public.lookup_entries e where e.merged_into_id is null;
$$;

-- Check the authenticated account, not user-editable metadata or frontend visibility.
create function public.foodlog_require_lookup_owner()
returns void language plpgsql security definer set search_path=''
as $$ begin
  if auth.uid() is null or not exists(select 1 from auth.users
    where id=auth.uid() and lower(email)='danielhanna0001@gmail.com') then
    raise exception 'Only the FoodLog owner can manage locations and cuisines' using errcode='42501';
  end if;
end $$;
revoke all on function public.foodlog_require_lookup_owner() from public,anon,authenticated;

create function public.foodlog_manage_lookup(p_id uuid,p_action text,p_name text default null)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare entry public.lookup_entries; cleaned text; key text;
begin
  perform public.foodlog_require_lookup_owner();
  -- Serialize catalog admin operations and protect against simultaneous name creation.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('foodlog:lookup-management',0));
  select * into entry from public.lookup_entries where id=p_id and merged_into_id is null for update;
  if not found then raise exception 'This entry no longer exists. Refresh the list.'; end if;
  if p_action='rename' then
    cleaned := trim(regexp_replace(coalesce(p_name,''),'[[:space:]]+',' ','g'));
    key := public.foodlog_lookup_key(cleaned);
    if key='' or char_length(cleaned)>120 then raise exception 'Enter a name between 1 and 120 characters.'; end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(entry.kind||':'||key,0));
    if exists(select 1 from public.lookup_aliases where kind=entry.kind and normalized_alias=key and lookup_id<>p_id)
      or exists(select 1 from public.lookup_entries where kind=entry.kind and normalized_name=key and id<>p_id) then
      raise exception 'That name already belongs to another entry. Use a different name.';
    end if;
    -- Keep the old label searchable and attached to the same stable identity.
    insert into public.lookup_aliases(kind,alias,lookup_id) values(entry.kind,entry.name,p_id)
      on conflict(kind,normalized_alias) do nothing;
    insert into public.lookup_aliases(kind,alias,lookup_id) values(entry.kind,cleaned,p_id)
      on conflict(kind,normalized_alias) do nothing;
    update public.lookup_entries set name=cleaned where id=p_id;
  elsif p_action='delete' then
    update public.lookup_entries set retired_at=coalesce(retired_at,now()) where id=p_id;
  elsif p_action='restore' then
    update public.lookup_entries set retired_at=null where id=p_id;
  else raise exception 'Invalid catalog action'; end if;
  return jsonb_build_object('id',p_id,'action',p_action);
end $$;
revoke all on function public.foodlog_manage_lookup(uuid,text,text) from public,anon;
grant execute on function public.foodlog_manage_lookup(uuid,text,text) to authenticated;

create function public.foodlog_admin_lookup_catalog()
returns jsonb language plpgsql security definer set search_path=''
as $$ begin
  perform public.foodlog_require_lookup_owner();
  return (select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'kind',e.kind,'name',e.name,
    'retired',e.retired_at is not null,'usageCount',(select count(*) from public.restaurants r
      where (case when e.kind='location' then r.location_id else r.cuisine_id end)=e.id
        or exists(select 1 from public.lookup_aliases a where a.lookup_id=e.id and
          a.normalized_alias=public.foodlog_lookup_key(case when e.kind='location' then r.location else r.cuisine end)))
    ) order by e.kind,e.name),'[]'::jsonb) from public.lookup_entries e where e.merged_into_id is null);
end $$;
revoke all on function public.foodlog_admin_lookup_catalog() from public,anon;
grant execute on function public.foodlog_admin_lookup_catalog() to authenticated;
