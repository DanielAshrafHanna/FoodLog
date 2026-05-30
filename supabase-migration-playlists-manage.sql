-- Allow approved editors to rename and delete playlists.

drop policy if exists "Approved users can update playlists" on public.playlists;
create policy "Approved users can update playlists"
on public.playlists for update
to authenticated
using (
  exists (
    select 1 from public.approved_users
    where lower(approved_users.email) = lower((select auth.jwt() ->> 'email'))
  )
)
with check (
  exists (
    select 1 from public.approved_users
    where lower(approved_users.email) = lower((select auth.jwt() ->> 'email'))
  )
);

drop policy if exists "Approved users can delete playlists" on public.playlists;
create policy "Approved users can delete playlists"
on public.playlists for delete
to authenticated
using (
  exists (
    select 1 from public.approved_users
    where lower(approved_users.email) = lower((select auth.jwt() ->> 'email'))
  )
);
