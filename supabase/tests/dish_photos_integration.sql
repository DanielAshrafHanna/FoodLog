-- Runs against an already migrated FoodLog database. All synthetic rows roll back.
-- Simulates one existing approved identity without modifying their account or records.
begin;
do $$ declare actor record; begin
  select u.id,u.email into actor from auth.users u join public.approved_users a on lower(a.email)=lower(u.email) order by u.created_at limit 1;
  if actor.id is null then raise exception 'An approved identity is required for this contract test'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor.id,'email',actor.email,'role','authenticated')::text,true);
  if exists(select 1 from public.restaurants where id='67ae1042-06cb-41c2-b34a-b812bcfc3a20') then raise exception 'Test ID collision'; end if;
end $$;
set local role authenticated;
insert into public.restaurants(id,name,location,cuisine) values ('67ae1042-06cb-41c2-b34a-b812bcfc3a20','SYNTHETIC GALLERY CONTRACT 20260907','Synthetic area','Synthetic cuisine');
insert into public.dishes(id,restaurant_id,name,photo_path) values ('5d73d9d8-a8e0-483b-bcc3-ffea71208802','67ae1042-06cb-41c2-b34a-b812bcfc3a20','Synthetic dish','synthetic-legacy-path');
insert into public.dish_photos(id,dish_id,photo_path,contributor_name) values ('735cc7b8-a5c4-486c-b27d-97c1e25dd197','5d73d9d8-a8e0-483b-bcc3-ffea71208802',auth.uid()::text||'/synthetic-rollback-no-file.jpg','Spoofed');
do $$ begin
  if not exists(select 1 from public.dish_photos where id='735cc7b8-a5c4-486c-b27d-97c1e25dd197' and user_id=auth.uid() and contributor_name<>'Spoofed' and contributor_name<>'') then raise exception 'Attribution failed'; end if;
  begin
    insert into public.dish_photos(dish_id,photo_path) values ('5d73d9d8-a8e0-483b-bcc3-ffea71208802','00000000-0000-0000-0000-000000000000/not-owned.jpg');
    raise exception 'Cross-owner path allowed';
  exception when insufficient_privilege then null; end;
  begin update public.dish_photos set contributor_name='Changed'; raise exception 'Photo mutation allowed'; exception when insufficient_privilege then null; end;
end $$;
update public.dishes set cover_photo_id='735cc7b8-a5c4-486c-b27d-97c1e25dd197' where id='5d73d9d8-a8e0-483b-bcc3-ffea71208802';
set local role anon;
do $$ begin
  if not exists(select 1 from public.dish_photos where id='735cc7b8-a5c4-486c-b27d-97c1e25dd197') then raise exception 'Shared gallery hidden'; end if;
end $$;
set local role authenticated;
update public.restaurants set deleted_at=now() where id='67ae1042-06cb-41c2-b34a-b812bcfc3a20';
set local role anon;
do $$ begin
 if exists(select 1 from public.dish_photos where id='735cc7b8-a5c4-486c-b27d-97c1e25dd197') then raise exception 'Trashed gallery visible'; end if;
end $$;
reset role;
rollback;
select
 (select count(*) from public.restaurants where id='67ae1042-06cb-41c2-b34a-b812bcfc3a20') as remaining_test_restaurants,
 (select count(*) from public.dishes where id='5d73d9d8-a8e0-483b-bcc3-ffea71208802') as remaining_test_dishes,
 (select count(*) from public.dish_photos where id='735cc7b8-a5c4-486c-b27d-97c1e25dd197') as remaining_test_photos;
