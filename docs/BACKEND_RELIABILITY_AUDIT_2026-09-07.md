# FoodLog backend reliability audit — 2026-09-07

Scope: deployed Supabase catalog/functions/advisors, aggregate data/storage integrity, current astra source, Cloudflare Worker configuration, and bounded public reads. No existing production records or files were changed. The first reliability phase now implements findings 1, 2, and the cache-failure portion of 6; frontend publication is recorded in the engineering log. Transactional synthetic database checks were rolled back.

## Baseline

- All 17 public application tables have RLS enabled. Rating primary keys enforce one review per dish/restaurant and rater email. Save RPCs transactionally write the parent and current user's rating.
- Active collection: 29 restaurants and 23 dishes. No exact active dish-name duplicates within a restaurant; no exact restaurant-name/location duplicate groups. These checks do not establish semantic uniqueness.
- 44 Storage objects. Every path referenced by dish legacy images, restaurant photos, and dish photos has a matching Storage metadata row (including Trash references). Three objects have no reference in those tables. Their provenance is unknown; do not automatically delete them. Metadata existence does not prove file decoding or backup recoverability.
- Three exact public nested collection requests returned HTTP 200, 33,224 bytes, and 29 restaurants in 412, 185, and 177ms from this machine. These are spot checks, not production percentiles or mobile latency guarantees.
- Performance advisor: 10 unused-index informational findings and 12 overlapping-policy warnings. Existing public/editor policy overlap preserves Trash access; do not flatten permissions or remove indexes merely to clear advisories.
- Security advisor: two intentionally public ID/count-only SECURITY DEFINER aggregate functions, plus disabled leaked-password protection. Aggregate exposure was previously documented as intentional. No new unrestricted-table finding.
- Luna MAX operational agent ran npm run check: 48 tests passed across four files, plus syntax checks. This does not execute PostgreSQL contract tests or browser E2E. Prior rollout SQL checks are documented separately in thought_Process.md.

## Ranked findings and implementation plan

### 1. High — local dish changes can disappear on cloud reconciliation

Evidence: app.js saveDish falls back to local mutation when remoteReady is false, but does not mark its restaurant pendingSync. lib/foodlog-core.js mergePendingRestaurants preserves pending restaurants, otherwise selects the remote copy. A pure synthetic reproduction with an existing cloud restaurant and a locally added dish returned offlineDishSurvivesMerge=false. This is a confirmed state-merge gap; no production loss was observed. Normal post-sync network failures can instead take the RPC error path, so it does not affect every offline save.

Implemented for restaurant and dish metadata/reviews with an account-isolated local operation queue and pending state. Cloud reconciliation preserves pending nested dishes. Durable photo blobs remain a separate IndexedDB phase.

### 2. High — parent creates are not safe to retry after an ambiguous response

Evidence: live save_restaurant_capture calls save_restaurant_with_rating with null ID; save_dish_with_rating inserts a new generated ID when p_dish_id is null. No request/idempotency key exists. Client-side duplicate lookups run before saves; they cannot make concurrent requests atomic. The duplicate override intentionally permits distinct similarly named places/dishes, so a blanket unique-name constraint would break a feature.

Implemented with client operation/entity UUIDs and private actor-scoped receipts. Rollback integration called each RPC twice with a changed second payload and retained one parent plus one rating/review. Duplicate guidance remains separate.

### 3. High — simultaneous metadata edits use last-write-wins

Evidence: live save RPC updates filter on ID, active state, and restaurant association, but not the version read by the editor. Complete arrays/fields such as liked_by, playlists, visited, and notes are replaced. Separate friend reviews already have separate keys, which is good; shared metadata remains vulnerable to stale form submissions.

Add a version counter and expected-version argument for metadata edits. Merge independent field changes where safe; show the conflicting fields when both people changed the same value. Never silently overwrite either draft. Test two sessions editing the same starting version and ensure one is asked to reconcile.

### 4. High — photo recovery covers row insertion but not the complete lifecycle

Evidence: commitQueuedPhoto reuses pending.path after upload returns, and detects a row insert whose response was lost. uploadDishPhoto/uploadRestaurantPhoto generate the path internally; if Storage commits but its response is lost, pending.path is never assigned. Retrying can produce another object. Queues and File objects live in memory; refresh loses them. The older saveRestaurantPhotosRemote path removes uploaded files on a row-insert error without first reconciling an ambiguous successful insert. Three unreferenced objects exist, but their cause is not established.

Reserve the object path before upload, persist it with the operation, and reconcile object and row existence on retries. Unify old and new photo entry paths. Distinguish upload failure from metadata failure; use a read-only orphan inventory and age/grace-period review before any eventual cleanup. Test lost Storage response, lost row response, partial batch, refresh, and retry without duplicated or missing objects.

### 5. Medium — callers awaiting refresh may not actually await fresh data

Evidence: loadRemoteData returns immediately when another load is in flight, merely setting remoteReloadQueued. Save handlers await it expecting reconciliation. The loader also catches failures without returning a typed success/failure result. Eight realtime listeners can trigger collection reloads; a refresh reloads all nested records plus lookups/profiles. A failed optional want-to-go query prevents otherwise successful restaurant data from being applied.

Share an in-flight Promise, distinguish authoritative save success from refresh failure, and return explicit load results. Debounce event bursts; refresh only affected records where practical. Let optional totals degrade independently. Test overlapping save/realtime/reconnect loads, late responses, and one optional RPC failing. At the present 33KB collection size, pagination is lower priority than correct reconciliation.

### 6. Medium — local cache failures can masquerade as cloud save failures

Evidence: saveLocalData directly calls localStorage.setItem; it is invoked after successful remote saves and photo inserts. Quota/security errors throw into broad save catch blocks. A cloud commit may therefore appear unsuccessful because the local cache failed.

Implemented best-effort display-cache persistence and a specific device-storage warning. The pending queue is separate from the display cache; unit coverage verifies quota errors are returned rather than thrown.

### 7. Medium — monitoring and release checks do not cover the user save journey

Evidence: /api/health checks the release asset only. Cloudflare logs are enabled, but browser-to-Supabase saves bypass the Worker. Realtime subscribe has no status callback; the app cannot clearly report channel timeout/disconnection. Current npm run check executes unit/source checks, not SQL migrations/RLS or authenticated Storage flows. No .github workflow exists; Workers Builds runs the npm check/build commands.

Keep the cheap liveness endpoint and add separate monitored dependency readiness and privacy-safe save/upload/realtime diagnostics (operation ID, stage, duration, error code; no reviews, tokens, or photo contents). Add SQL contract tests in an isolated database and authenticated end-to-end tests on an isolated project to release checks. Verify alerts with controlled failures; do not create synthetic writes in production for routine probes.

### 8. Recovery gap — backup completeness has not been established

Current backup plan/retention, external file copies, and restore drills were not accessible through the tools used; absence of evidence is not proof that backups are disabled. Supabase database backups exclude Storage object contents: https://supabase.com/docs/guides/platform/backups . Establish database plus photo backups and restore both into an isolated environment. Record verified recovery time and maximum data-loss window before claiming recoverability. Keep Trash recovery intact.

## Additional lower-priority checks

- The public photo bucket and anonymous restaurant/review browsing are established behavior. The nested public query includes rater_email; consider a public projection exposing contributor display name and opaque ID instead. Do not disable sharing or alter access rules without a separate product decision.
- Public Maps short-link resolution has an allowlist, redirect cap, body limit, and a 3.5-second timeout per hop. It lacks an application-level rate limiter and a single end-to-end time budget; up to six fetch attempts can consume separate budgets. Dashboard WAF/rate rules were not inspected. Consider caching resolved links, one request deadline, and rate limiting as usage grows.
- Do not treat unused-index warnings as urgent at this collection size. Re-measure after reliable save/sync behavior is in place.

## Suggested delivery order

1. Loss prevention: durable pending operations, idempotent parent saves, and cache-error isolation.
2. Collaboration and photos: version checks, resumable upload lifecycle, reconciliation.
3. Reliability checks: shared refresh promises, independent optional loads, diagnostics, isolated SQL/E2E release checks, verified database-and-photo restore.

No evidence in this audit justifies replacing Supabase or Cloudflare. The recommended work strengthens the existing architecture.
