-- Run only in a dedicated empty local database. All fixtures and DDL roll back.
\set ON_ERROR_STOP on
begin;
do $$ begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
end $$;
create schema auth;
create table auth.users(id uuid primary key, raw_user_meta_data jsonb, approved boolean);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function public.is_approved_editor() returns boolean language sql stable as $$ select coalesce((select approved from auth.users where id=auth.uid()),false) $$;
create table public.restaurants(id uuid primary key, deleted_at timestamptz);
create table public.dishes(id uuid primary key, restaurant_id uuid references public.restaurants, user_id uuid references auth.users, name text, liked_by text[], photo_path text, deleted_at timestamptz);
create table public.dish_ratings(dish_id uuid, notes text, rating numeric);
grant usage on schema auth, public to anon, authenticated;
grant select on public.dishes, public.restaurants to anon, authenticated;
insert into auth.users values
('00000000-0000-0000-0000-000000000001','{"display_name":"Synthetic owner"}',true),
('00000000-0000-0000-0000-000000000002','{"full_name":"Synthetic friend"}',true),
('00000000-0000-0000-0000-000000000003','{"full_name":"Unapproved","approved":true,"role":"admin"}',false);
insert into public.restaurants values ('11111111-1111-1111-1111-111111111111',null);
insert into public.dishes values ('22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000001','Synthetic dish',array['Earlier friend','Earlier friend typo'],'preserved.jpg',null);
insert into public.dish_ratings values ('22222222-2222-2222-2222-222222222222','Preserve this review',4.5);
create temp table preservation as select md5(to_jsonb(d)::text) as dish, (select md5(to_jsonb(r)::text) from public.dish_ratings r) as review from public.dishes d;
\ir ../migrations/20261003210000_account_dish_likes.sql

do $$ begin
  if has_table_privilege('authenticated','public.dish_likes','INSERT') or has_table_privilege('authenticated','public.dish_likes','UPDATE') then raise exception 'Direct mutation exposed'; end if;
  if has_function_privilege('anon','public.set_dish_like(uuid,boolean)','EXECUTE') then raise exception 'Anonymous reaction exposed'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
select public.set_dish_like('22222222-2222-2222-2222-222222222222',true);
select public.set_dish_like('22222222-2222-2222-2222-222222222222',true);
do $$ begin
  if (select count(*) from public.dish_likes)<>1 then raise exception 'Repeated like duplicated'; end if;
  if not exists(select 1 from public.dish_likes where user_id=auth.uid() and display_name='Synthetic friend') then raise exception 'Incorrect attribution'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select public.set_dish_like('22222222-2222-2222-2222-222222222222',true);
do $$ begin
  if not exists(select 1 from public.dish_likes where user_id=auth.uid() and display_name='Synthetic owner') then raise exception 'Display-name fallback lost'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
select public.set_dish_like('22222222-2222-2222-2222-222222222222',false);
do $$ begin
  if (select count(*) from public.dish_likes)<>1 then raise exception 'Unlike removed someone else'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
do $$ begin
  begin perform public.set_dish_like('22222222-2222-2222-2222-222222222222',true); raise exception 'Forged admin approved'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role anon;
do $$ begin
  if (select count(*) from public.dish_likes)<>1 then raise exception 'Inactive like history exposed'; end if;
  if (select count(*) from public.dish_like_changes)<>1 then raise exception 'Unlike refresh signal hidden'; end if;
  if has_table_privilege('anon','public.dish_like_changes','INSERT') then raise exception 'Public signal writes exposed'; end if;
end $$;
reset role;
update public.dishes set deleted_at=now();
set local role anon;
do $$ begin if exists(select 1 from public.dish_likes) then raise exception 'Trashed dish likes visible'; end if; end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
do $$ begin
  begin perform public.set_dish_like('22222222-2222-2222-2222-222222222222',true); raise exception 'Trashed dish liked'; exception when raise_exception then if sqlerrm='Trashed dish liked' then raise; end if; end;
end $$;
reset role;
update public.dishes set deleted_at=null;
update public.restaurants set deleted_at=now();
set local role anon;
do $$ begin if exists(select 1 from public.dish_likes) then raise exception 'Trashed restaurant likes visible'; end if; end $$;
reset role;
update public.restaurants set deleted_at=null;
set local role anon;
do $$ begin if (select count(*) from public.dish_likes)<>1 then raise exception 'Restore lost active likes'; end if; end $$;
reset role;
do $$ begin
  if (select dish from preservation)<>(select md5(to_jsonb(d)::text) from public.dishes d) then raise exception 'Dish data changed'; end if;
  if (select review from preservation)<>(select md5(to_jsonb(r)::text) from public.dish_ratings r) then raise exception 'Review changed'; end if;
  if (select count(*) from public.dish_likes)<>2 then raise exception 'Unlike erased reaction history'; end if;
end $$;
rollback;
