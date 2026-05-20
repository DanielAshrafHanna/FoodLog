-- When someone registers in Supabase Auth (e.g. first Google attempt), add them to pending_approvals
-- so the owner sees them even if the browser PKCE step fails before "Last sign in".

create or replace function public.sync_auth_user_to_pending()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  provider_name text;
  display text;
begin
  if new.email is null or trim(new.email) = '' then
    return new;
  end if;

  if lower(trim(new.email)) = 'danielhanna0001@gmail.com' then
    return new;
  end if;

  if exists (
    select 1 from public.approved_users
    where lower(email) = lower(trim(new.email))
  ) then
    return new;
  end if;

  select coalesce(
    (select i.provider from auth.identities i where i.user_id = new.id order by i.created_at limit 1),
    new.raw_app_meta_data->>'provider',
    ''
  )
  into provider_name;

  display := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    split_part(new.email, '@', 1)
  );

  insert into public.pending_approvals (email, display_name, provider, requested_at, last_seen_at)
  values (
    lower(trim(new.email)),
    display,
    coalesce(provider_name, ''),
    coalesce(new.created_at, now()),
    coalesce(new.last_sign_in_at, new.created_at, now())
  )
  on conflict (email) do update set
    display_name = excluded.display_name,
    provider = case when excluded.provider <> '' then excluded.provider else pending_approvals.provider end,
    last_seen_at = coalesce(excluded.last_seen_at, pending_approvals.last_seen_at);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_pending on auth.users;
create trigger on_auth_user_created_pending
  after insert on auth.users
  for each row
  execute function public.sync_auth_user_to_pending();

-- Backfill users already in Auth but missing from pending (e.g. failed PKCE after account creation).
insert into public.pending_approvals (email, display_name, provider, requested_at, last_seen_at)
select
  lower(trim(u.email)),
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(u.raw_user_meta_data->>'name'), ''),
    split_part(u.email, '@', 1)
  ),
  coalesce(
    (select i.provider from auth.identities i where i.user_id = u.id order by i.created_at limit 1),
    u.raw_app_meta_data->>'provider',
    'google'
  ),
  u.created_at,
  coalesce(u.last_sign_in_at, u.created_at)
from auth.users u
where u.email is not null
  and trim(u.email) <> ''
  and lower(trim(u.email)) <> 'danielhanna0001@gmail.com'
  and not exists (
    select 1 from public.approved_users a
    where lower(a.email) = lower(trim(u.email))
  )
  and not exists (
    select 1 from public.pending_approvals p
    where lower(p.email) = lower(trim(u.email))
  )
on conflict (email) do nothing;
