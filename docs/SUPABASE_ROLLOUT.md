# Supabase reliability rollout

## Location/cuisine identity rollout — 2026-10-03

`20261003140000_canonical_location_cuisine.sql` was verified on disposable local PostgreSQL 14 and applied to production with Dany’s explicit approval on 2026-10-03 (remote migration version `20261003112750`, name `canonical_location_cuisine`). It adds a lookup registry/aliases, normalized uniqueness, nullable restaurant FK columns, and private canonicalization triggers. The read-only `foodlog_lookup_catalog` RPC exposes only public taxonomy metadata; direct registry mutation and resolver RPC execution are withheld from browser roles. Existing restaurant contribution policies are unchanged.

Run `supabase/tests/lookup_catalog_local.sql` only on a disposable fixture database. Local validation also checks simultaneous equivalent creation. Existing restaurant names, location/cuisine text, timestamps, reviews, photos, and Trash are not bulk rewritten. Legacy IDs attach on subsequent metadata saves; the frontend derives identity from catalog metadata in the meantime. No fuzzy merge is performed.

Production verification: all 18 existing public app tables retained identical row counts and full-row content hashes (excluding the two newly added nullable restaurant ID columns). All 41 restaurants, 29 dishes, 26 restaurant ratings, 34 dish ratings, and photo metadata remained unchanged. Catalog contains 32 entries; three canonicalization triggers and two validated foreign keys are installed. RLS, public catalog reads, blocked direct registry writes, and blocked private resolver execution were verified. No production fixture writes. Uncertain spelling/alias changes remain unapplied in `docs/LOOKUP_NAME_REVIEW_2026-10-03.md`.

Frontend retains legacy reads and local/cached lookup behavior. Database-level protection is now active. Existing restaurant ID columns remain null until a subsequent metadata save; historical text is unchanged. Rollback planning should retain restaurant text and legacy lookup tables; do not drop the registry after new associations have been created without reviewing them first.

## Owner catalog management and New Cairo — 2026-10-03

Applied the user-requested `20261003140100_lookup_management.sql` to production; remote version `20261003115652_lookup_management`. The CLI-generated source filename was moved after the prerequisite canonical migration to preserve local migration order. It adds recoverable retirement and a merge pointer, retains the old tagamo3 registry row, and transfers the explicitly approved New Cairo/tagamo3 aliases to one New Cairo identity. Catalog now exposes 31 entries. All 18 pre-existing app tables retained identical full-row hashes and counts before/after; no restaurant text, timestamps, reviews, photo metadata, or access records changed.

Only the authenticated `danielhanna0001@gmail.com` account can invoke owner catalog operations. The database checks `auth.uid()` against `auth.users`, not editable user metadata or a UI flag. Anonymous execution is revoked, the owner-check helper is private, and direct registry writes remain blocked. Rename preserves IDs/old aliases; Delete retires suggestions; Restore reverses retirement. Neither operation rewrites historical restaurant rows. Client display/cache resolves current canonical labels from the catalog.

Disposable database tests covered preservation, the approved alias merge, forged email/non-owner denial, name collisions, rename, delete/restore, historical usage counts, and old-client saves. Production verification used read-only checks. Supabase advisors flag the two new authenticated SECURITY DEFINER RPCs because they are intentionally callable gateways; both check the owner before any read/write. See [advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) and [function privileges](https://supabase.com/docs/guides/database/functions#function-privileges). Existing unrelated advisor warnings remain unchanged.

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

Security advisor follow-up: no findings name the new lookup objects. Existing warnings concern executable privileged playlist/aggregate functions and disabled leaked-password protection; these settings were not changed by this rollout. See [function advisor guidance](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) and [password protection guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
