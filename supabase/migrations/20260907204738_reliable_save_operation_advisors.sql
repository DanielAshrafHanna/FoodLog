create index if not exists save_operation_receipts_actor_idx
on private.save_operation_receipts(actor_id);

drop policy if exists "Editors can insert own save receipts" on private.save_operation_receipts;
create policy "Editors can insert own save receipts"
on private.save_operation_receipts for insert
to authenticated
with check (
  actor_id = (select auth.uid())
  and actor_email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  and (select public.is_approved_editor())
);
