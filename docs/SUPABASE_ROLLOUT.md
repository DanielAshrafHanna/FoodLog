# Supabase reliability rollout

## Location/cuisine identity rollout — 2026-10-03

`20261003140000_canonical_location_cuisine.sql` is prepared and verified on disposable local PostgreSQL 14. It adds a lookup registry/aliases, normalized uniqueness, nullable restaurant FK columns, and private canonicalization triggers. The read-only `foodlog_lookup_catalog` RPC exposes only public taxonomy metadata; direct registry mutation and resolver RPC execution are withheld from browser roles. Existing restaurant contribution policies are unchanged.

Run `supabase/tests/lookup_catalog_local.sql` only on a disposable fixture database. Local validation also checks simultaneous equivalent creation. Existing restaurant names, location/cuisine text, timestamps, reviews, photos, and Trash are not bulk rewritten. Legacy IDs attach on subsequent metadata saves; the frontend derives identity from catalog metadata in the meantime. No fuzzy merge is performed.

Before production application, obtain Dany's explicit approval for this exact migration. Apply it independently of the older reliability rollout below. Verify catalog reads, resolver/table grants, installed triggers/FKs, and the existing restaurant count/metadata hash using read-only queries. No production fixture writes. Record applied status here and in `thought_Process.md`; uncertain spelling/alias changes have a separate preview in `docs/LOOKUP_NAME_REVIEW_2026-10-03.md`.

Frontend deployment may precede the migration: it retains legacy reads and local/cached lookup behavior. Database-level protection is pending until application. Rollback planning should retain restaurant text and legacy lookup tables; do not drop the registry after new associations have been created without reviewing them first.

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
