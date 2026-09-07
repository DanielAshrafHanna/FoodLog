-- Cache the full JWT value before extracting its email. This preserves the
-- approved-editor requirement while avoiding per-row auth helper evaluation.
drop policy if exists "Editors can insert own save receipts" on private.save_operation_receipts;
create policy "Editors can insert own save receipts"
on private.save_operation_receipts for insert
to authenticated
with check (
  actor_id = (select auth.uid())
  and actor_email = lower(coalesce((select auth.jwt()) ->> 'email', ''))
  and exists (
    select 1
    from public.approved_users
    where lower(approved_users.email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
  )
);
