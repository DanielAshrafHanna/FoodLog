-- Disposable bootstrap includes auth.users and an auth.uid() test double.
-- Never execute this fixture against production.
begin;
do $$
declare target uuid; n int;
begin
  if (select hash from public.preservation)<>(select md5(string_agg((to_jsonb(r)-array['location_id','cuisine_id'])::text,'' order by id)) from public.restaurants r) then
    raise exception 'Migration rewrote restaurant data';
  end if;
  select lookup_id into target from public.lookup_aliases where kind='location' and normalized_alias='new cairo';
  if (select count(distinct lookup_id) from public.lookup_aliases where kind='location' and normalized_alias in ('new cairo','new cauro','tagamo3','tagamoo3'))<>1 then raise exception 'Approved merge failed'; end if;
  if has_function_privilege('anon','public.foodlog_manage_lookup(uuid,text,text)','execute') then raise exception 'Anonymous mutation exposed'; end if;
  if has_function_privilege('authenticated','public.foodlog_require_lookup_owner()','execute') then raise exception 'Private owner helper exposed'; end if;
  perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
  -- A forged email claim must not override the real authenticated account.
  perform set_config('request.jwt.claim.email','danielhanna0001@gmail.com',true);
  begin perform public.foodlog_manage_lookup(target,'delete'); raise exception 'Non-owner mutation allowed'; exception when insufficient_privilege then null; end;
  begin perform public.foodlog_admin_lookup_catalog(); raise exception 'Non-owner admin catalog allowed'; exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
  perform public.foodlog_manage_lookup(target,'rename','New Cairo Area');
  if not exists(select 1 from public.lookup_entries where id=target and name='New Cairo Area') then raise exception 'Rename failed'; end if;
  if not exists(select 1 from public.lookup_aliases where lookup_id=target and normalized_alias='new cairo') then raise exception 'Old alias lost'; end if;
  begin perform public.foodlog_manage_lookup(target,'rename','Maadi'); raise exception 'Collision permitted'; exception when raise_exception then if sqlerrm='Collision permitted' then raise; end if; end;
  perform public.foodlog_manage_lookup(target,'delete');
  if not exists(select 1 from public.lookup_entries where id=target and retired_at is not null) then raise exception 'Recoverable delete failed'; end if;
  if (select hash from public.preservation)<>(select md5(string_agg((to_jsonb(r)-array['location_id','cuisine_id'])::text,'' order by id)) from public.restaurants r) then raise exception 'Admin actions rewrote data'; end if;
  perform public.foodlog_manage_lookup(target,'restore');
  if exists(select 1 from public.lookup_entries where id=target and retired_at is not null) then raise exception 'Restore failed'; end if;
  select (x->>'usageCount')::int into n from jsonb_array_elements(public.foodlog_admin_lookup_catalog()) x where x->>'id'=target::text;
  if n<>2 then raise exception 'Historical usage count incorrect: %',n; end if;
  insert into public.restaurants(name,location,cuisine) values('Post-rename fixture','tagamoo3','Chinese');
  if not exists(select 1 from public.restaurants where name='Post-rename fixture' and location='New Cairo Area' and location_id=target) then raise exception 'Old clients bypass rename'; end if;
end $$;
set local role authenticated;
select public.foodlog_admin_lookup_catalog() is not null as owner_catalog_access;
rollback;
