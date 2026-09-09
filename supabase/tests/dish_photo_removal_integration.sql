-- Run on migrated FoodLog. Existing accounts supply role claims only.
-- All journal rows are uniquely named synthetic records and the transaction rolls back.
begin;
do $$ declare first_actor record; second_actor record; owner_actor record; begin
 select u.id,u.email into first_actor from auth.users u join public.approved_users a on lower(a.email)=lower(u.email)
   where lower(u.email)<>'danielhanna0001@gmail.com' order by u.created_at limit 1;
 select u.id,u.email into second_actor from auth.users u join public.approved_users a on lower(a.email)=lower(u.email)
   where u.id<>first_actor.id and lower(u.email)<>'danielhanna0001@gmail.com' order by u.created_at limit 1;
 select u.id,u.email into owner_actor from auth.users u where lower(u.email)='danielhanna0001@gmail.com';
 if first_actor.id is null or second_actor.id is null or owner_actor.id is null then raise exception 'Requires two approved friends and owner'; end if;
 if exists(select 1 from public.restaurants where id='ad98ebc0-e24f-4a92-87cf-37fd66849201') or exists(select 1 from public.dishes where id='ad98ebc0-e24f-4a92-87cf-37fd66849202') or exists(select 1 from public.dish_photos where id='ad98ebc0-e24f-4a92-87cf-37fd66849203') then raise exception 'Test ID collision'; end if;
 perform set_config('foodlog.test.first',jsonb_build_object('sub',first_actor.id,'email',first_actor.email,'role','authenticated')::text,true);
 perform set_config('foodlog.test.second',jsonb_build_object('sub',second_actor.id,'email',second_actor.email,'role','authenticated')::text,true);
 perform set_config('foodlog.test.owner',jsonb_build_object('sub',owner_actor.id,'email',owner_actor.email,'role','authenticated')::text,true);
 perform set_config('request.jwt.claims',current_setting('foodlog.test.first'),true);
end $$;
set local role authenticated;
insert into public.restaurants(id,name,location,cuisine) values ('ad98ebc0-e24f-4a92-87cf-37fd66849201','SYNTHETIC PHOTO REMOVAL 20260909','Synthetic area','Synthetic cuisine');
insert into public.dishes(id,restaurant_id,name,photo_path) values ('ad98ebc0-e24f-4a92-87cf-37fd66849202','ad98ebc0-e24f-4a92-87cf-37fd66849201','SYNTHETIC SHARED DISH',auth.uid()::text||'/synthetic-removal-legacy-no-file.jpg');
reset role;
select set_config('request.jwt.claims',current_setting('foodlog.test.second'),true) is not null as second_role_ready;
set local role authenticated;
insert into public.dish_photos(id,dish_id,photo_path) values ('ad98ebc0-e24f-4a92-87cf-37fd66849203','ad98ebc0-e24f-4a92-87cf-37fd66849202',auth.uid()::text||'/synthetic-removal-shared-no-file.jpg');
insert into public.dish_ratings(dish_id,rater_email,rater_name,rating,notes) values ('ad98ebc0-e24f-4a92-87cf-37fd66849202',auth.jwt()->>'email','Synthetic reviewer',4,'Synthetic opinion');
insert into public.dish_photo_removals(dish_id,photo_path) select dish_id,photo_path from public.dish_photos where id='ad98ebc0-e24f-4a92-87cf-37fd66849203';
do $$ declare n integer; begin
 if (select count(*) from public.dish_photo_removals where dish_id='ad98ebc0-e24f-4a92-87cf-37fd66849202' and user_id=auth.uid())<>1 then raise exception 'Own removal failed'; end if;
 update public.dishes set name='Forbidden edit' where id='ad98ebc0-e24f-4a92-87cf-37fd66849202'; get diagnostics n=row_count; if n<>0 then raise exception 'Cross-user edit allowed'; end if;
 begin
   insert into public.dish_photo_removals(dish_id,photo_path) select id,photo_path from public.dishes where id='ad98ebc0-e24f-4a92-87cf-37fd66849202';
   raise exception 'Cross-user legacy removal allowed';
 exception when raise_exception then if sqlerrm<>'You can only remove your own photos' then raise; end if; end;
 delete from public.dish_photo_removals where dish_id='ad98ebc0-e24f-4a92-87cf-37fd66849202'; get diagnostics n=row_count; if n<>1 then raise exception 'Own restore failed'; end if;
end $$;
reset role;
select set_config('request.jwt.claims',current_setting('foodlog.test.first'),true) is not null as first_role_ready;
set local role authenticated;
insert into public.dish_photo_removals(dish_id,photo_path) select id,photo_path from public.dishes where id='ad98ebc0-e24f-4a92-87cf-37fd66849202';
reset role;
select set_config('request.jwt.claims',current_setting('foodlog.test.second'),true) is not null as second_role_ready;
set local role authenticated;
do $$ declare n integer; begin
 delete from public.dish_photo_removals where dish_id='ad98ebc0-e24f-4a92-87cf-37fd66849202'; get diagnostics n=row_count; if n<>0 then raise exception 'Cross-user restore allowed'; end if;
end $$;
reset role;
set local role anon;
do $$ begin
 if (select count(*) from public.dish_photo_removals where dish_id='ad98ebc0-e24f-4a92-87cf-37fd66849202')<>1 then raise exception 'Public marker read failed'; end if;
end $$;
reset role;
select set_config('request.jwt.claims',current_setting('foodlog.test.owner'),true) is not null as owner_role_ready;
set local role authenticated;
insert into public.dish_photo_removals(dish_id,photo_path) select dish_id,photo_path from public.dish_photos where id='ad98ebc0-e24f-4a92-87cf-37fd66849203';
do $$ declare n integer; begin
 delete from public.dish_photo_removals where dish_id='ad98ebc0-e24f-4a92-87cf-37fd66849202'; get diagnostics n=row_count; if n<>2 then raise exception 'Owner restore failed'; end if;
 if (select count(*) from public.dish_ratings where dish_id='ad98ebc0-e24f-4a92-87cf-37fd66849202')<>1 then raise exception 'Review lost'; end if;
 if (select count(*) from public.dish_photos where id='ad98ebc0-e24f-4a92-87cf-37fd66849203')<>1 then raise exception 'Original photo lost'; end if;
end $$;
reset role;
rollback;
select
 (select count(*) from public.restaurants where id='ad98ebc0-e24f-4a92-87cf-37fd66849201') as remaining_test_restaurants,
 (select count(*) from public.dishes where id='ad98ebc0-e24f-4a92-87cf-37fd66849202') as remaining_test_dishes,
 (select count(*) from public.dish_photos where id='ad98ebc0-e24f-4a92-87cf-37fd66849203') as remaining_test_photos,
 (select count(*) from public.dish_ratings where dish_id='ad98ebc0-e24f-4a92-87cf-37fd66849202') as remaining_test_reviews,
 (select count(*) from public.dish_photo_removals where dish_id='ad98ebc0-e24f-4a92-87cf-37fd66849202') as remaining_test_markers;
