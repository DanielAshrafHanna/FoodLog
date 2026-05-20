-- Pending approval requests: users sign in first, owner approves from the app.

create table if not exists public.pending_approvals (
  email text primary key,
  display_name text not null default '',
  provider text not null default '',
  requested_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists pending_approvals_requested_idx on public.pending_approvals (requested_at desc);

alter table public.pending_approvals enable row level security;

drop policy if exists "Users can request approval" on public.pending_approvals;
create policy "Users can request approval"
on public.pending_approvals for insert
to authenticated
with check (
  lower(email) = lower((select auth.jwt() ->> 'email'))
  and not exists (
    select 1 from public.approved_users
    where lower(approved_users.email) = lower((select auth.jwt() ->> 'email'))
  )
);

drop policy if exists "Users can refresh own pending request" on public.pending_approvals;
create policy "Users can refresh own pending request"
on public.pending_approvals for update
to authenticated
using (lower(email) = lower((select auth.jwt() ->> 'email')))
with check (lower(email) = lower((select auth.jwt() ->> 'email')));

drop policy if exists "Users can read own pending status" on public.pending_approvals;
create policy "Users can read own pending status"
on public.pending_approvals for select
to authenticated
using (lower(email) = lower((select auth.jwt() ->> 'email')));

drop policy if exists "Owner can list pending approvals" on public.pending_approvals;
create policy "Owner can list pending approvals"
on public.pending_approvals for select
to authenticated
using (lower((select auth.jwt() ->> 'email')) = 'danielhanna0001@gmail.com');

drop policy if exists "Users can clear own pending" on public.pending_approvals;
create policy "Users can clear own pending"
on public.pending_approvals for delete
to authenticated
using (lower(email) = lower((select auth.jwt() ->> 'email')));

drop policy if exists "Owner can delete pending approvals" on public.pending_approvals;
create policy "Owner can delete pending approvals"
on public.pending_approvals for delete
to authenticated
using (lower((select auth.jwt() ->> 'email')) = 'danielhanna0001@gmail.com');

create or replace function public.normalize_pending_approval_email()
returns trigger
language plpgsql
as $$
begin
  new.email = lower(trim(new.email));
  return new;
end;
$$;

drop trigger if exists pending_approvals_normalize_email on public.pending_approvals;
create trigger pending_approvals_normalize_email
before insert or update on public.pending_approvals
for each row execute function public.normalize_pending_approval_email();

do $$
begin
  alter publication supabase_realtime add table public.pending_approvals;
exception
  when duplicate_object then null;
end $$;
