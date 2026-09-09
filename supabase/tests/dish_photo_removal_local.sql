-- Disposable local PostgreSQL only. Minimal Supabase auth scaffolding; all test data rolls back.
\set ON_ERROR_STOP on
begin;
create role anon;
create role authenticated;
create schema auth;
create schema private;
create schema storage;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('email',current_setting('request.jwt.claim.email',true)) $$;
create function public.is_approved_editor() returns boolean language sql stable as $$ select current_setting('request.jwt.claim.editor',true)='true' $$;
create function public.is_foodlog_owner() returns boolean language sql stable as $$ select lower(auth.jwt()->>'email')='danielhanna0001@gmail.com' $$;
revoke all on function public.is_foodlog_owner() from public;
grant execute on function public.is_foodlog_owner() to authenticated;
create table public.restaurants(id uuid primary key, user_id uuid default auth.uid(), name text, deleted_at timestamptz, deleted_by text);
create table public.dishes(id uuid primary key, restaurant_id uuid references public.restaurants, user_id uuid default auth.uid(), name text, photo_path text, deleted_at timestamptz, deleted_by text);
create table public.restaurant_photos(id uuid primary key,restaurant_id uuid references public.restaurants,user_id uuid default auth.uid(),deleted_at timestamptz,deleted_by text);
create table public.dish_photos(id uuid primary key,dish_id uuid references public.dishes,user_id uuid references auth.users,photo_path text);
create table storage.objects(id uuid primary key,bucket_id text,name text);
grant usage on schema public,auth,storage to anon,authenticated;
grant select on public.restaurants,public.dishes,public.restaurant_photos,public.dish_photos,storage.objects to anon,authenticated;
grant insert,update on public.restaurants,public.dishes,public.restaurant_photos to authenticated;
grant insert,update,delete on storage.objects to authenticated;
alter table public.restaurants enable row level security;
alter table public.dishes enable row level security;
alter table public.restaurant_photos enable row level security;
alter table storage.objects enable row level security;
create policy read on public.restaurants for select using(true);
create policy read on public.dishes for select using(true);
create policy read on public.restaurant_photos for select using(true);
create policy read on storage.objects for select using(true);
\ir ../migrations/20260908233203_enforce_contributor_ownership.sql
\ir ../migrations/20260909104058_recoverable_dish_photo_removal.sql
\ir ../migrations/20260909105336_cache_contributor_policy_jwt.sql
insert into auth.users values ('11111111-1111-1111-1111-111111111111'),('22222222-2222-2222-2222-222222222222'),('99999999-9999-9999-9999-999999999999');
insert into public.restaurants values ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','Synthetic place',null,null);
insert into public.dishes values ('44444444-4444-4444-4444-444444444444','33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','Synthetic dish','11111111-1111-1111-1111-111111111111/legacy.jpg',null,null);
insert into public.dish_photos values ('55555555-5555-5555-5555-555555555555','44444444-4444-4444-4444-444444444444','22222222-2222-2222-2222-222222222222','22222222-2222-2222-2222-222222222222/new.jpg');
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',true),set_config('request.jwt.claim.email','friend@example.com',true),set_config('request.jwt.claim.editor','true',true);
set local role authenticated;
-- Friend owns the photo but not the parent dish. They can remove their photo independently.
insert into public.dish_photo_removals(dish_id,photo_path,user_id,deleted_by) values ('44444444-4444-4444-4444-444444444444','22222222-2222-2222-2222-222222222222/new.jpg','11111111-1111-1111-1111-111111111111','spoof@example.com');
do $$ declare n integer; begin
  if not exists(select 1 from public.dish_photo_removals where user_id=auth.uid() and deleted_by='friend@example.com') then raise exception 'Removal attribution not stamped'; end if;
  update public.dishes set name='Forbidden' where id='44444444-4444-4444-4444-444444444444';
  get diagnostics n=row_count; if n<>0 then raise exception 'Friend edited someone else dish'; end if;
  update public.restaurants set name='Forbidden'; get diagnostics n=row_count; if n<>0 then raise exception 'Friend edited someone else place'; end if;
  begin
    insert into public.dish_photo_removals(dish_id,photo_path) values ('44444444-4444-4444-4444-444444444444','11111111-1111-1111-1111-111111111111/legacy.jpg');
    raise exception 'Cross-user removal allowed';
  exception when raise_exception then if sqlerrm <> 'You can only remove your own photos' then raise; end if; end;
  begin update public.dish_photo_removals set deleted_by='spoof'; raise exception 'Marker update allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true),set_config('request.jwt.claim.email','first@example.com',true);
set local role authenticated;
do $$ declare n integer; begin
 delete from public.dish_photo_removals; get diagnostics n=row_count;
 if n<>0 then raise exception 'Parent owner restored friend photo'; end if;
 update public.dishes set name='Owner edited'; get diagnostics n=row_count;
 if n<>1 then raise exception 'Contributor cannot edit dish'; end if;
end $$;
insert into public.dish_photo_removals(dish_id,photo_path) values ('44444444-4444-4444-4444-444444444444','11111111-1111-1111-1111-111111111111/legacy.jpg');
delete from public.dish_photo_removals where photo_path like '%legacy.jpg';
reset role;
set local role anon;
do $$ begin
 if (select count(*) from public.dish_photo_removals)<>1 then raise exception 'Gallery cannot read markers'; end if;
 begin insert into public.dish_photo_removals(dish_id,photo_path) values ('44444444-4444-4444-4444-444444444444','anything'); raise exception 'Anonymous removal allowed'; exception when insufficient_privilege then null; end;
 begin delete from public.dish_photo_removals; raise exception 'Anonymous restore allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.editor','false',true);
set local role authenticated;
do $$ begin
 begin insert into public.dish_photo_removals(dish_id,photo_path) values ('44444444-4444-4444-4444-444444444444','11111111-1111-1111-1111-111111111111/legacy.jpg'); raise exception 'Unapproved removal allowed'; exception when raise_exception then if sqlerrm<>'Sign in as an approved contributor' then raise; end if; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','99999999-9999-9999-9999-999999999999',true),set_config('request.jwt.claim.email','danielhanna0001@gmail.com',true),set_config('request.jwt.claim.editor','true',true);
set local role authenticated;
insert into public.dish_photo_removals(dish_id,photo_path) values ('44444444-4444-4444-4444-444444444444','11111111-1111-1111-1111-111111111111/legacy.jpg');
do $$ declare n integer; begin
 delete from public.dish_photo_removals; get diagnostics n=row_count; if n<>2 then raise exception 'Superuser cannot restore all'; end if;
 update public.dishes set name='Superuser edited'; get diagnostics n=row_count; if n<>1 then raise exception 'Superuser cannot edit dish'; end if;
 if (select photo_path from public.dishes limit 1)<>'11111111-1111-1111-1111-111111111111/legacy.jpg' then raise exception 'Legacy original changed'; end if;
 if (select count(*) from public.dish_photos)<>1 then raise exception 'Shared original changed'; end if;
end $$;
reset role;
rollback;
