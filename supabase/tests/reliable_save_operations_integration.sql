-- Run only against a migrated database with at least one approved auth user.
-- Every synthetic row is rolled back.
begin;

select set_config(
  'request.jwt.claims',
  (
    select jsonb_build_object('sub', users.id, 'email', users.email, 'role', 'authenticated')::text
    from auth.users as users
    join public.approved_users as approved on lower(approved.email) = lower(users.email)
    limit 1
  ),
  true
);

set local role authenticated;

select public.save_restaurant_reliably(
  'a1000000-0000-4000-8000-000000000001',
  'a1000000-0000-4000-8000-000000000002',
  jsonb_build_object('name', 'RELIABILITY-ROLLBACK-PLACE', 'location', '', 'cuisine', '', 'price', '$$', 'updated_by', 'Synthetic tester'),
  4, true, true
);
select public.save_restaurant_reliably(
  'a1000000-0000-4000-8000-000000000001',
  'a1000000-0000-4000-8000-000000000002',
  jsonb_build_object('name', 'SHOULD-NOT-REPLAY', 'location', '', 'cuisine', '', 'price', '$$', 'updated_by', 'Synthetic tester'),
  1, false, true
);

select public.save_dish_reliably(
  'a1000000-0000-4000-8000-000000000003',
  'a1000000-0000-4000-8000-000000000002',
  'a1000000-0000-4000-8000-000000000004',
  jsonb_build_object('name', 'RELIABILITY-ROLLBACK-DISH', 'liked_by', jsonb_build_array(), 'photo_path', '', 'updated_by', 'Synthetic tester'),
  4.5, 'Synthetic review', true
);
select public.save_dish_reliably(
  'a1000000-0000-4000-8000-000000000003',
  'a1000000-0000-4000-8000-000000000002',
  'a1000000-0000-4000-8000-000000000004',
  jsonb_build_object('name', 'SHOULD-NOT-REPLAY', 'liked_by', jsonb_build_array(), 'photo_path', '', 'updated_by', 'Synthetic tester'),
  1, 'Wrong review', true
);

reset role;

do $test$
begin
  if (select count(*) from public.restaurants where id = 'a1000000-0000-4000-8000-000000000002') <> 1 then
    raise exception 'Reliable restaurant save created the wrong number of rows.';
  end if;
  if (select name from public.restaurants where id = 'a1000000-0000-4000-8000-000000000002') <> 'RELIABILITY-ROLLBACK-PLACE' then
    raise exception 'Restaurant retry reapplied its payload.';
  end if;
  if (select count(*) from public.dishes where id = 'a1000000-0000-4000-8000-000000000004') <> 1 then
    raise exception 'Reliable dish save created the wrong number of rows.';
  end if;
  if (select name from public.dishes where id = 'a1000000-0000-4000-8000-000000000004') <> 'RELIABILITY-ROLLBACK-DISH' then
    raise exception 'Dish retry reapplied its payload.';
  end if;
  if (select count(*) from public.restaurant_ratings where restaurant_id = 'a1000000-0000-4000-8000-000000000002') <> 1
    or (select count(*) from public.dish_ratings where dish_id = 'a1000000-0000-4000-8000-000000000004') <> 1 then
    raise exception 'A retry duplicated a rating or review.';
  end if;
  if (select count(*) from private.save_operation_receipts where operation_id in (
    'a1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000003'
  )) <> 2 then
    raise exception 'Reliable save receipts were not recorded.';
  end if;
end
$test$;

rollback;
