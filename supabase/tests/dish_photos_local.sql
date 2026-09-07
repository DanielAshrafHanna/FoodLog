-- Run in a dedicated empty local database. Everything, including test roles, rolls back.
\set ON_ERROR_STOP on
begin;
do $$ begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
end $$;
create schema auth;
create schema private;
create table auth.users(id uuid primary key, raw_user_meta_data jsonb);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select '{"email":"synthetic@example.com"}'::jsonb $$;
create function public.is_approved_editor() returns boolean language sql stable as $$ select current_setting('request.jwt.claim.editor',true)='true' $$;
create function private.log_foodlog_row_change() returns trigger language plpgsql as $$ begin return new; end $$;
create table public.restaurants(id uuid primary key default gen_random_uuid(),deleted_at timestamptz,name text,location text,cuisine text,playlist text,playlists text[],price text,maps text,notes text,visited text[],updated_at timestamptz,updated_by text,import_batch_id uuid,cover_photo_id uuid);
create table public.dishes(id uuid primary key default gen_random_uuid(),restaurant_id uuid references public.restaurants,deleted_at timestamptz,photo_path text,name text,rating numeric,liked_by text[],notes text,updated_at timestamptz,updated_by text);
create table public.restaurant_ratings(restaurant_id uuid,rater_email text,rater_name text,rating numeric);
create table public.dish_ratings(dish_id uuid,rater_email text,rater_name text,rating numeric,notes text);
create table public.restaurant_photos(id uuid primary key default gen_random_uuid(),restaurant_id uuid references public.restaurants,user_id uuid,photo_path text);
grant usage on schema public,auth to anon,authenticated;
grant select on public.restaurants,public.dishes to anon,authenticated;
grant insert,update,select on public.restaurants,public.dishes,public.restaurant_photos,public.restaurant_ratings,public.dish_ratings to authenticated;
\ir ../migrations/20260906204603_shared_dish_photos.sql
insert into auth.users values ('11111111-1111-1111-1111-111111111111','{"full_name":"First friend"}'),('22222222-2222-2222-2222-222222222222','{"full_name":"Second friend"}');
insert into public.restaurants(id,deleted_at) values ('33333333-3333-3333-3333-333333333333',null);
insert into public.dishes(id,restaurant_id,deleted_at,photo_path) values ('44444444-4444-4444-4444-444444444444','33333333-3333-3333-3333-333333333333',null,'legacy-photo.jpg');
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true),set_config('request.jwt.claim.editor','true',true);
set local role authenticated;
insert into public.dish_photos(dish_id,photo_path,contributor_name) values ('44444444-4444-4444-4444-444444444444','11111111-1111-1111-1111-111111111111/one.jpg','Spoofed name');
do $$ begin
  if (select contributor_name from public.dish_photos limit 1) <> 'First friend' then raise exception 'Attribution not stamped'; end if;
  begin
    insert into public.dish_photos(dish_id,photo_path) values ('44444444-4444-4444-4444-444444444444','22222222-2222-2222-2222-222222222222/stolen.jpg');
    raise exception 'Cross-owner path allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',true);
set local role authenticated;
insert into public.dish_photos(dish_id,photo_path) values ('44444444-4444-4444-4444-444444444444','22222222-2222-2222-2222-222222222222/two.jpg');
do $$ begin
  begin update public.dish_photos set contributor_name='Changed'; raise exception 'Mutation allowed'; exception when insufficient_privilege then null; end;
  begin delete from public.dish_photos; raise exception 'Deletion allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.editor','false',true);
set local role authenticated;
do $$ begin
  begin insert into public.dish_photos(dish_id,photo_path) values ('44444444-4444-4444-4444-444444444444','22222222-2222-2222-2222-222222222222/denied.jpg'); raise exception 'Unapproved upload allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role anon;
do $$ begin if (select count(*) from public.dish_photos)<>2 then raise exception 'Shared photos missing'; end if; end $$;
reset role;
update public.dishes set deleted_at=now();
set local role anon;
do $$ begin if exists(select 1 from public.dish_photos) then raise exception 'Trashed photos visible'; end if; end $$;
reset role;
do $$ begin if (select photo_path from public.dishes limit 1)<>'legacy-photo.jpg' then raise exception 'Legacy photo changed'; end if; end $$;
-- Verify imports include shared dish galleries in the same transaction.
select set_config('request.jwt.claim.editor','true',true);
set local role authenticated;
select public.import_foodlog_batch('55555555-5555-5555-5555-555555555555','[{"name":"Synthetic imported place","location":"Synthetic area","cuisine":"Synthetic cuisine","photos":[{"photoPath":"22222222-2222-2222-2222-222222222222/place.jpg","isCover":true}],"dishes":[{"name":"Synthetic imported dish","photos":[{"photoPath":"22222222-2222-2222-2222-222222222222/imported.jpg"}]}]}]'::jsonb);
do $$ begin
  if not exists(select 1 from public.dish_photos where photo_path like '%/imported.jpg' and contributor_name='Second friend') then raise exception 'Imported gallery missing'; end if;
  begin
    update public.restaurant_photos set contributor_name='Spoofed';
    raise exception 'Attribution changed';
  exception when raise_exception then
    if sqlerrm <> 'Photo attribution cannot be changed' then raise; end if;
  end;
end $$;
reset role;
-- A cover can only reference a photo of the same dish.
set local role authenticated;
do $$ declare selected_photo uuid; other_dish uuid; begin
 select id into selected_photo from public.dish_photos where photo_path like '%/imported.jpg';
 select id into other_dish from public.dishes where name='Synthetic imported dish';
 update public.dishes set cover_photo_id=selected_photo where id=other_dish;
 begin
  update public.dishes set cover_photo_id=selected_photo where id='44444444-4444-4444-4444-444444444444';
  raise exception 'Wrong dish cover allowed';
 exception when raise_exception then
  if sqlerrm <> 'Choose a photo belonging to this dish' then raise; end if;
 end;
end $$;
reset role;
rollback;
