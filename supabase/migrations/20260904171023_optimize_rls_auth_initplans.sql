-- Cache Supabase Auth helper results once per statement inside every existing
-- public-table policy. ALTER POLICY changes only USING/WITH CHECK expressions;
-- policy names, commands, roles, permissiveness, and table grants are preserved.
do $migration$
declare
  policy_record record;
  cached_using text;
  cached_check text;
begin
  for policy_record in
    select schemaname, tablename, policyname, qual, with_check
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and (
        coalesce(qual, '') ~ 'auth\.(uid|jwt|email)\(\)'
        or coalesce(with_check, '') ~ 'auth\.(uid|jwt|email)\(\)'
      )
  loop
    cached_using := policy_record.qual;
    cached_check := policy_record.with_check;

    if cached_using is not null then
      cached_using := replace(cached_using, 'auth.uid()', '(select auth.uid())');
      cached_using := replace(cached_using, 'auth.jwt()', '(select auth.jwt())');
      cached_using := replace(cached_using, 'auth.email()', '(select auth.email())');
      cached_using := replace(cached_using, '(select (select auth.uid()))', '(select auth.uid())');
      cached_using := replace(cached_using, '(select (select auth.jwt()))', '(select auth.jwt())');
      cached_using := replace(cached_using, '(select (select auth.email()))', '(select auth.email())');
    end if;

    if cached_check is not null then
      cached_check := replace(cached_check, 'auth.uid()', '(select auth.uid())');
      cached_check := replace(cached_check, 'auth.jwt()', '(select auth.jwt())');
      cached_check := replace(cached_check, 'auth.email()', '(select auth.email())');
      cached_check := replace(cached_check, '(select (select auth.uid()))', '(select auth.uid())');
      cached_check := replace(cached_check, '(select (select auth.jwt()))', '(select auth.jwt())');
      cached_check := replace(cached_check, '(select (select auth.email()))', '(select auth.email())');
    end if;

    execute format(
      'alter policy %I on %I.%I%s%s',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename,
      case when cached_using is null then '' else format(' using (%s)', cached_using) end,
      case when cached_check is null then '' else format(' with check (%s)', cached_check) end
    );
  end loop;
end
$migration$;
