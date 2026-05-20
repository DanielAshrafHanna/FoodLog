-- Owner can manually add emails to the waiting list (optional, before they sign in).

drop policy if exists "Owner can insert pending approvals" on public.pending_approvals;
create policy "Owner can insert pending approvals"
on public.pending_approvals for insert
to authenticated
with check (lower((select auth.jwt() ->> 'email')) = 'danielhanna0001@gmail.com');

drop policy if exists "Owner can update pending approvals" on public.pending_approvals;
create policy "Owner can update pending approvals"
on public.pending_approvals for update
to authenticated
using (lower((select auth.jwt() ->> 'email')) = 'danielhanna0001@gmail.com')
with check (lower((select auth.jwt() ->> 'email')) = 'danielhanna0001@gmail.com');
