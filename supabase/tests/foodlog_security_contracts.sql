-- Run after `supabase db reset` to verify the public security surface without
-- depending on production data. Any failed contract raises an exception.
begin;

do $test$
declare
  unprotected_table_count integer;
  aggregate_source text;
begin
  select count(*)
  into unprotected_table_count
  from pg_catalog.pg_class as tables
  join pg_catalog.pg_namespace as schemas on schemas.oid = tables.relnamespace
  where schemas.nspname = 'public'
    and tables.relkind in ('r', 'p')
    and not tables.relrowsecurity;

  if unprotected_table_count <> 0 then
    raise exception 'Expected every public table to have RLS; found % without it.', unprotected_table_count;
  end if;

  if pg_catalog.pg_get_function_result('public.get_want_to_go_totals()'::regprocedure)
      <> 'TABLE(restaurant_id uuid, want_to_go_count bigint)' then
    raise exception 'Want-to-go aggregate exposes an unexpected result shape.';
  end if;

  if pg_catalog.pg_get_function_result('public.get_decision_vote_totals()'::regprocedure)
      <> 'TABLE(session_id uuid, restaurant_id uuid, vote_count integer)' then
    raise exception 'Decision-vote aggregate exposes an unexpected result shape.';
  end if;

  select lower(prosrc)
  into aggregate_source
  from pg_catalog.pg_proc
  where oid = 'public.get_want_to_go_totals()'::regprocedure;
  if aggregate_source ~ '(user_email|rater_email|voter_email|display_name)' then
    raise exception 'Want-to-go aggregate references identity fields.';
  end if;

  select lower(prosrc)
  into aggregate_source
  from pg_catalog.pg_proc
  where oid = 'public.get_decision_vote_totals()'::regprocedure;
  if aggregate_source ~ '(user_email|rater_email|voter_email|display_name)' then
    raise exception 'Decision-vote aggregate references identity fields.';
  end if;

  if not exists (
    select 1 from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'restaurant_ratings'
      and cmd in ('INSERT', 'UPDATE')
      and coalesce(with_check, '') ilike '%rater_email%'
  ) then
    raise exception 'Restaurant-rating owner-write policy is missing.';
  end if;

  if not exists (
    select 1 from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'dish_ratings'
      and cmd in ('INSERT', 'UPDATE')
      and coalesce(with_check, '') ilike '%rater_email%'
  ) then
    raise exception 'Dish-review owner-write policy is missing.';
  end if;

  if not exists (
    select 1 from pg_catalog.pg_policies
    where schemaname = 'public'
      and roles @> array['anon'::name]
      and cmd = 'SELECT'
  ) then
    raise exception 'Anonymous read policies are missing.';
  end if;

  if not exists (
    select 1 from pg_catalog.pg_policies
    where schemaname = 'public'
      and lower(coalesce(qual, '') || ' ' || coalesce(with_check, '')) like '%deleted_at%'
  ) then
    raise exception 'Recoverable Trash policy contracts are missing.';
  end if;

  if not exists (
    select 1 from pg_catalog.pg_policies
    where schemaname = 'public'
      and lower(policyname) like '%owner%'
  ) then
    raise exception 'Owner moderation policies are missing.';
  end if;

  if exists (
    select 1 from pg_catalog.pg_policies
    where schemaname = 'public'
      and (
        coalesce(qual, '') ~ 'auth\.(uid|jwt|email)\(\)'
        or coalesce(with_check, '') ~ 'auth\.(uid|jwt|email)\(\)'
      )
      and not (
        coalesce(qual, '') ~ '\( SELECT auth\.(uid|jwt|email)\(\)'
        or coalesce(with_check, '') ~ '\( SELECT auth\.(uid|jwt|email)\(\)'
      )
  ) then
    raise exception 'Uncached auth helper calls remain in public RLS policies.';
  end if;
end
$test$;

-- Both aggregates must remain callable by anonymous visitors, but only their
-- declared ID/count columns can be read.
set local role anon;
select restaurant_id, want_to_go_count from public.get_want_to_go_totals() limit 0;
select session_id, restaurant_id, vote_count from public.get_decision_vote_totals() limit 0;
reset role;

rollback;
