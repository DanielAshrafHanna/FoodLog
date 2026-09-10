# Supabase reliability rollout

## Prepared, not yet applied

`supabase/migrations/20260904171023_optimize_rls_auth_initplans.sql` is source-controlled and forward-only. It finds existing public-table policies that call `auth.uid()`, `auth.jwt()`, or `auth.email()` directly and rewrites only their `USING` / `WITH CHECK` expressions to use cached `(select auth.*())` calls.

It does not create or remove tables, columns, indexes, grants, roles, policies, or data. Policy names, commands, roles, permissiveness, and permission conditions are preserved.

`supabase/tests/foodlog_security_contracts.sql` is the post-reset/post-migration database contract suite.

## Why production is unchanged

The approved implementation plan says to apply Supabase settings and the migration only after isolated verification and Dany's explicit production-rollout approval. Committing a migration file records and reviews the intended schema change; it does not execute that SQL against project `lmkkmzpwsdhlpjugrwjr`.

## Approved rollout procedure

1. Back up the production database and confirm a tested restore path.
2. Apply all migrations to a disposable local database or isolated Supabase branch.
3. Run `supabase/tests/foodlog_security_contracts.sql` and the application unit/E2E suites.
4. Capture the Supabase security and performance advisor baselines.
5. After Dany explicitly approves production rollout, link the CLI to the confirmed project and apply the pending migration.
6. Enable leaked-password protection in Supabase Auth.
7. Rerun both advisors. Target zero `auth_rls_initplan` warnings.
8. Smoke-test anonymous reads, editor-owned writes, owner moderation, Trash/restore, aggregates, and sign-in/session-expiry recovery.

## Intentionally accepted findings

- Keep both public `SECURITY DEFINER` aggregate functions because anonymous browsing requires totals. Their contract tests allow only IDs and counts, never identities.
- Keep the eight unused indexes in this pass.
- Keep the 11 overlapping permissive policies in this pass because their overlap is intentional and consolidation could change authorization behavior.

If isolated verification is still unavailable, do not apply the production migration. Report the blocker and keep the source-controlled migration pending.
