# FoodLog Project Log

This file is the persistent engineering and product decision log for FoodLog. Read it before changing the project and update it whenever features, behavior, implementation decisions, or known issues change.

## 2026-07-23 — Project collaboration rules added

### Added

- Created `AGENTS.md` with repository-wide working rules.
- Required agents to address the user as Dany at the start of every user-facing response.
- Required agents to check applicable installed skills before beginning work.
- Added a safeguard preventing removal, disabling, replacement, or material reduction of existing functionality without Dany's explicit approval.
- Established this file as the required record of feature changes, implementation details, decisions, issues, verification, and follow-up work.
- Required agents to read this log before making project changes.

### Implementation notes

- No application feature or runtime behavior was changed.
- The log intentionally contains concise factual decisions and outcomes, not private chain-of-thought.

### Issues encountered

- No prior `AGENTS.md` or `thought_Process.md` existed, so both files were created.

### Verification

- Confirmed both instruction files are located at the repository root.

## 2026-07-23 — UI/UX skills researched and installed

### Added

- Installed the following user-level agent skills for future FoodLog design work:
  - `impeccable` from `pbakaus/impeccable`
  - `emil-design-eng` from `emilkowalski/skills`
  - `design-taste-frontend` from `leonxlnx/taste-skill`
  - `frontend-design` from `anthropics/skills`
  - `web-design-guidelines` from `vercel-labs/agent-skills`

### Decisions and rationale

- The first three skills were requested by Dany and were verified against the skills.sh community leaderboard.
- `frontend-design` was added because it is a highly adopted complementary guide for distinctive, production-grade frontend implementation.
- `web-design-guidelines` was added to provide a separate accessibility and UX-quality audit workflow.
- `ui-ux-pro-max` was considered but not installed because the skills.sh listing showed a failed result from one security-audit provider.
- Avoid installing large groups of overlapping skills by default. Prefer a small set with distinct roles: creative direction, interaction craft, implementation, and audit.

### Issues encountered

- The installer copied all five skills successfully into the user-level shared skills directory.
- It also emitted a PromptScript-specific warning that global installation is unsupported. This did not prevent the Codex-compatible copies from being installed.
- The optional `npx skills list -g` verification command did not return promptly and was stopped. Direct filesystem verification confirmed all five skill directories exist.

### Verification

- Confirmed these directories exist under `/Users/danielhanna/.agents/skills/`:
  - `impeccable`
  - `emil-design-eng`
  - `design-taste-frontend`
  - `frontend-design`
  - `web-design-guidelines`
- The newly installed skills become available to Codex on the next turn.

## 2026-07-23 — Development branch created

### Added

- Created and switched the local repository to the `Dev` branch for testing new features and UI/UX changes.

### Implementation notes

- The branch was created from the current `main` commit.
- Existing uncommitted files were preserved unchanged in the working tree.
- The branch has not been pushed to a remote.

### Issues encountered

- The first branch creation attempt was blocked because the sandbox could not write the Git reference lock file.
- Retrying with Dany's approved Git permission succeeded.

### Verification

- Confirm the active branch is `Dev` before beginning subsequent feature or design work.

## 2026-07-23 — FoodLog redesign context and visual direction established

### Added

- Added `PRODUCT.md` as the durable source of product purpose, users, capabilities, constraints, safety requirements, and accessibility commitments.
- Added the seed `DESIGN.md` for the Table Notes redesign.
- Added the Impeccable surface brief for the primary application surface at `.impeccable/surfaces/index-html.md`.
- Generated three high-fidelity composition references under `design/comps/`:
  - queue-led Order Rail;
  - photo contact sheet;
  - decision-led group picker.

### Decisions and rationale

- Reading the product as an Operate-mode shared dining journal for a small friend group.
- Set design dials to variance 6, motion 3, and density 6. The interface should be distinctive, restrained during repeated use, and information-dense enough for planning.
- Selected the queue-led Order Rail composition as the application shell because it best preserves the existing list/detail workflow, keeps advanced filtering visible, and has the clearest mobile fallback.
- The group picker will reuse the decision-led composition's shortlist, voting, comparison, and persisted-result treatment.
- The photo contact-sheet composition remains a visual reference but will not replace the primary scanning workflow.
- Existing product truth, copy meaning, routes, workflows, and all current features remain preserved.

### Issues encountered

- The Impeccable external concept challenger catalog was unreachable, so its direction roll ran in degraded mode without catalog challengers or quality-bar boards.
- The user-approved Table Notes brief and the locally generated three-composition study provided sufficient grounded direction to continue.

### Verification

- Confirmed `PRODUCT.md`, `DESIGN.md`, the surface brief, and all three composition PNGs exist.
- No production database, storage, schema, or deployment changes were made.

## 2026-07-23 — Table Notes safety foundation, redesign shell, and group picker implemented locally

### Added

- Added pinned local frontend/runtime dependencies and a committed lockfile:
  - Supabase JavaScript 2.110.8;
  - Bricolage Grotesque and Atkinson Hyperlegible Next self-hosted variable fonts;
  - Vitest 3.2.7, Playwright 1.61.1, jsdom, axe-core, and Supabase CLI 2.109.1 for verification.
- Added the additive, unapplied migration `supabase/migrations/20260723194423_table_notes_safety_picker.sql` with:
  - indefinite soft-delete fields and recoverable RLS for restaurants, dishes, photos, ratings, and playlists;
  - append-only activity logging;
  - explicit function search paths and reduced trigger-function privileges;
  - consolidated content policies using cached auth expressions;
  - picker session, candidate, vote, three-vote enforcement, close, reopen, and persisted tie-selection support;
  - an idempotent transactional import RPC keyed by an import batch UUID.
- Replaced application-level permanent deletion of FoodLog content with Move to Trash and Restore flows. Storage files are retained indefinitely.
- Added compensating upload behavior: newly uploaded orphan files are removed only when their database reference fails; replaced or trashed media is retained.
- Added duplicate-submit locking, inline form status, preserved drafts on failure, and a trailing realtime refresh queue.
- Added validated import preview, duplicate review, explicit cloud/local destination, existing local-replace compatibility, local merge, and transactional cloud import wiring.
- Implemented the Table Notes shell with self-hosted editorial/interface fonts, compact top rail, visible Place/Map/Pick navigation, queue/detail layout, mobile focused detail with Back, visible Want to go and playlist actions, visible dish review controls, minimum touch targets, focus styles, reduced motion, image dimensions/lazy loading, and clarified Not rated copy.
- Added shareable URL state for search, filters, playlist, sort, selected place, active surface, and selected picker session.
- Implemented Pick Our Next Place locally and against the additive staging schema: sessions, candidate nomination, comparisons, up to three votes, close, one-time tie resolution, persisted result, reopen, and result links.
- Added production-credential refusal for local/preview builds, an offline fallback page, pinned app-shell assets, awaited service-worker cache writes, and Cloudflare Worker routes for the new local modules/fonts.
- Added Vitest unit coverage and a Playwright desktop/mobile suite.

### Decisions and rationale

- Existing non-content administrative deletions remain intentional: denying a pending approval, revoking editor access, and toggling Want to go are state-management actions, not permanent deletion of restaurant-journal content.
- Existing local import replacement behavior remains available as an explicit option; safer merge is the default outside cloud mode.
- Playlist Trash records preserve the affected restaurant IDs so restoration can reinstate memberships.
- Service workers are blocked only inside the ordinary Playwright interaction suite to prevent update-triggered reloads from contaminating unrelated tests. PWA lifecycle cases remain a separate explicit test surface.

### Issues encountered

- The first Vitest run exposed malformed nested import handling; array guards were added and all unit tests then passed.
- The first Playwright run could not start because sandboxed local ports were blocked and the pinned Chromium binary was absent. Dany approved local test-server execution and the test-only browser download.
- Early browser runs exposed ambiguous Edit selectors, a mobile-hidden Trash control, service-worker reload timing, and a missing accessible name on the icon-only mobile filter control. Each issue was fixed before rerunning.
- The Supabase migration has not been applied or validated against a live development branch. Production backup, storage inventory, restore drill, leaked-password protection, and the database-linter remediation remain gated behind staging access and explicit production approval.

### Verification

- `npm test`: 7 unit tests passed.
- `npm run test:e2e`: 10 desktop/mobile browser tests passed.
- Covered local Trash/restore without permanent deletion, picker create/add/vote/close/reopen, navigation, URL state, keyboard selection, and critical axe accessibility checks.
- `node --check app.js` and `node --check sw.js` passed.
- No production database, schema, storage object, credentials, or deployment was changed.

## 2026-07-23 — Final local safety review and acceptance hardening

### Added and changed

- The final Impeccable review found two release-blocking partial-data risks and five UX gaps. All locally actionable findings were addressed without removing functionality.
- Normal Supabase reads now require an active restaurant and explicitly discard trashed nested dishes, photos, restaurant ratings, and dish ratings. Playlist lookups also explicitly exclude Trash.
- Added transactional RPCs to the unapplied migration for:
  - restaurant plus the current editor's rating;
  - dish plus the current editor's rating/review;
  - playlist rename, Move to Trash, and Restore.
- Dish media cleanup now remains safe when a transaction fails: the database transaction rolls back the new reference before the client removes only the newly uploaded orphan.
- Added a privacy-preserving Want-to-go totals function. The picker shows the group count separately from the current editor's own saved state.
- Restaurant tickets now reserve a stable photo slot, using the first restaurant/dish image or an editorial initials placeholder.
- Restored permanent access to Settings on small phones; the control remains at least 44×44 pixels.
- Replaced remaining blocking error alerts with scoped form feedback or the application status toast. Confirmation dialogs remain for consequential Trash and access-management actions.
- Added source-level safety/PWA regression contracts and browser coverage for mobile Settings, touch size, ticket media, dark theme, and reduced motion.
- Ignored dependency and browser-test output directories in `.gitignore`.

### Decisions and rationale

- Cloud journal saves call the new transaction RPCs rather than attempting client-side rollback. A database transaction is the only reliable way to keep a row and its rating/review logically atomic.
- Want-to-go identity remains private in the picker; only aggregate totals are exposed by the new function.
- Existing legacy helper functions and older CSS layers were not removed during this batch because Dany has not approved functionality or compatibility cleanup.
- Production and the existing Supabase project remain unchanged. The migration is additive but must first be applied and tested on an isolated development branch.

### Issues encountered

- The final reviewer correctly identified that recoverable RLS rows could reappear for approved editors through nested reads.
- A first reduced-motion browser assertion failed because Chromium serializes `0.001ms` as `1e-06s`; the test was corrected to accept the equivalent computed value.
- Local Supabase lint/migration execution is still unavailable because no local Postgres service is running. The installed Postgres command does not return normally in this environment, and the Docker engine is unavailable.
- The connected Supabase branch-list operation returned a connector validation error. Before retrieving branch pricing or creating a development branch, Dany must confirm use of the organization `DanielAshrafHanna's Org` (`oxotqxvyyxjgpcthhtzt`), followed by the tool's required explicit cost confirmation.
- The in-app browser blocked a local navigation action under its URL security policy. Browser automation was not retried through an alternate route; Playwright independently verified the same picker flow.

### Verification

- `npm run check`: 15 unit and source-contract tests passed.
- `npm run test:e2e`: 14 desktop/mobile browser tests passed; two project-specific cases were intentionally skipped (mobile-only Settings test on desktop and the 1,000-row timing loop on mobile).
- Browser verification covers Trash/restore, picker create/add/vote/close/reopen, navigation, URL state, keyboard use, critical axe checks, mobile Settings/touch target, photo tickets, dark/reduced-motion modes, and 100/500/1,000-place fixtures.
- `npm run build` completed in local-only mode and refused to inject production credentials.
- `git diff --check` passed on the working tree.
- No production data, schema, storage objects, credentials, branch, or deployment was changed.

## 2026-07-23 — Cloud test publishing preflight

### Findings

- Dany requested publishing the `Dev` implementation to GitHub for cloud testing.
- The full working tree belongs to the FoodLog safety/redesign/picker implementation; no unrelated local change was identified during scope review.
- The Git remote is `DanielAshrafHanna/FoodLog`, and `Dev` still points at the current `origin/main` base until the implementation is committed.
- There is no repository GitHub Actions workflow that applies Supabase migrations.
- A pushed Git branch is reflected in Supabase only when the project GitHub integration and Automatic branching are enabled. The migration is not applied merely because the file exists on GitHub.
- The Cloudflare Worker currently fetches the production `main` branch, so pushing `Dev` will not update the production website.

### Issue encountered

- GitHub publishing is blocked before commit/push because the saved `gh` authentication token for `DanielAshrafHanna` is invalid. Re-authentication with `gh auth login -h github.com` is required by the repository publishing workflow.

### Current state

- No files have been staged or committed and nothing has been pushed.
- No Supabase database, branch, schema, data, storage object, or production deployment was changed.

## 2026-07-24 — Direct Git publishing authorized

### Decision

- Dany confirmed that repository Git access is already authorized and explicitly requested a direct push.
- The invalid GitHub CLI token is treated as separate from Git's repository credential path. Publishing will proceed with local Git on the existing `Dev` branch; draft PR creation will use the GitHub connector or be reported separately if unavailable.

### Verification before publishing

- `npm run check`: 15 unit and source-contract tests passed.
- `npm run test:e2e`: 14 browser tests passed with two intentional project-specific skips.
- The initial browser test run was blocked by the filesystem/network sandbox from opening port 4173. Rerunning with Dany's previously approved test-server permission succeeded.
- `git diff --check` passed.
- A secret-pattern scan found only literal key-format detection text inside the pinned upstream Supabase browser bundle; no project credential or database connection string was found.

### Publishing result

- Committed the complete reviewed implementation on `Dev` as `82ff3cf` (`Implement Table Notes safety redesign and group picker`).
- Pushed `Dev` to `origin/Dev` without merging or modifying `main`.
- The first two push attempts disconnected during `send-pack`. The repository was only 5.51 MiB of loose objects; retrying with HTTP/1.1 and a fixed 500 MiB POST buffer succeeded.
- Opened draft pull request #1 from `Dev` to `main`: `https://github.com/DanielAshrafHanna/FoodLog/pull/1`.
- GitHub reported no workflow runs or commit statuses immediately after opening the PR, so no Supabase Preview check was observed.
- The Supabase branch-list connector still returns `Project reference is missing when validating permissions`; it could not independently confirm whether Automatic branching created a preview.
- Production `main`, the production Cloudflare Worker, and production Supabase data/schema/storage remain unchanged.

## 2026-07-24 — Free Supabase development project attempt

### Decision

- Dany declined the paid Supabase Preview Branch price of `$0.01344` per hour and approved creating a separate `FoodLog Dev` project only if it remained on the Free plan.
- Supabase confirmed the organization `DanielAshrafHanna's Org` is on the Free plan and initially quoted `$0` per month for another project.

### Issue encountered

- Supabase rejected creation of `FoodLog Dev` because Dany already has the maximum two active Free-plan projects.
- The active projects are `FoodLog` (`lmkkmzpwsdhlpjugrwjr`) and `portfolio-exit-planner` (`igfyiupvogkgzddyvnab`).
- The other listed projects are already inactive and do not free an additional active-project slot.

### Current status and safety

- No Supabase project was created and no existing project was paused, deleted, migrated, or otherwise changed.
- Pausing `portfolio-exit-planner` would free a slot and is reversible, but requires Dany's explicit approval because it would make that project unavailable until restored.
- Merging `Dev` into `main` remains a separate production rollout choice. It would not provide an isolated database test environment and must not be treated as equivalent to staging.

## 2026-07-24 — Production rollout authorized with Git checkpoint

### Decision

- Dany explicitly approved testing the reviewed `Dev` release on `main` after the free isolated-project option was unavailable.
- Created and pushed the annotated tag `production-before-table-notes-20260724` at production commit `e4d8c53c8d4367bc43931810782193a1ee82ebd7`.
- A frontend rollback must use that tag. The database migration is additive and must remain backward-compatible because reverting Git does not revert database schema or policy changes.

### Pre-rollout safety record

- Supabase Free does not provide scheduled downloadable database backups. A current logical dump was not available through the connected account tools.
- Captured a non-destructive production inventory before migration:
  - 28 restaurants, 21 dishes, 8 restaurant-photo records, 13 restaurant ratings, 21 dish ratings, 2 playlists, and 4 Want-to-go records;
  - 30 storage objects totaling 14,099,095 bytes in the public `plate-photos` bucket.
- Static migration review found no `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, `DELETE FROM`, or Storage object deletion. The migration adds nullable Trash fields and new tables/functions, atomically replaces RLS policies, and retains existing records and storage files.
- The production site was verified before rollout to show 28 places and 21 dishes.

### Verification

- `npm run check`: 15 tests passed.
- `npm run test:e2e`: 14 browser tests passed with two intentional project-specific skips.
- `npm run build:deploy` stamped `index.html` and `sw.js` with release build ID `026e7a6`.
- Updated the repository Worker template cache-buster to `026e7a6`; the live Cloudflare Worker still requires a matching deployment after `main` is updated.

### Supabase rollout result

- Applied the production migration successfully as version `20260723213008_table_notes_safety_picker`.
- Aligned the committed migration filename with Supabase migration history so GitHub deployment automation will not treat the same migration as pending.
- Added and applied `20260723213206_picker_foreign_key_indexes` to cover the three picker foreign keys identified by the post-migration advisor.
- Post-migration counts exactly matched the pre-migration inventory, including 28 restaurants, 21 dishes, and all 30 storage objects totaling 14,099,095 bytes.
- Verified the previously deployed frontend remained backward-compatible after the schema/RLS change and still rendered 28 places and 21 dishes.
- Security advisor warnings decreased from 8 to 3. Two remaining warnings describe the intentionally public, aggregate-only `get_want_to_go_totals` function; the third is leaked-password protection, which requires an Auth configuration change outside the available project tools.
- The foreign-key advisor warnings were resolved. Remaining performance notices concern existing RLS initialization plans, intentionally separate active/Trash read policies, and unused-index observations that require usage history before any removal.

### Public runtime issue and containment

- Merged `Dev` into `main` as merge commit `3642586` and pushed it successfully.
- The live Worker immediately served the new HTML, but returned `404` for `/lib/foodlog-core.js`, `/vendor/supabase-2.110.8.js`, the self-hosted font routes, and `/offline.html`.
- Root cause: the Cloudflare dashboard Worker still has the older route allowlist. Updating the GitHub Worker template does not update the deployed Worker, and the connected browser is not authenticated to Cloudflare.
- The incomplete module graph left the new static shell visible with zero places; direct public Supabase queries still returned all 28 restaurants and the Want-to-go aggregate without errors.
- Containment: temporarily restore `app.js`, `index.html`, `styles.css`, and `sw.js` from checkpoint tag `production-before-table-notes-20260724` on `main`. Keep the additive database schema, migrations, documentation, tests, and complete new runtime on `Dev`.
- Re-enable the Table Notes runtime only after deploying the Worker route additions and verifying all new asset URLs return `200`.
- Pushed the temporary runtime restoration as main commit `1dfa466`.
- Cloudflare continued serving its cached new HTML after the Git rollback because the deployed Worker still uses the unchanged fixed upstream cache key. The rollback will not be authoritative until the Worker cache-buster is redeployed or that edge cache expires.
- Cloudflare deployment is currently blocked because the available browser session is at the Cloudflare sign-in page and no Worker API token is configured locally. Dany must sign in before the route/cache update can be completed.

## 2026-07-24 — Cloudflare connector rollout recovery

### Access and deployment decision

- Dany confirmed that the connected Cloudflare API can manage the account directly, so browser authentication is no longer required.
- Inspected the deployed `foodlog` Worker and confirmed the route failure was its six-route static allowlist, not Supabase or the application data.
- Preserved the existing Worker architecture, compatibility date, custom domain behavior, and the `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` bindings. The deployment will inherit those bindings by name without reading or rewriting their values.
- Restored the four reviewed Table Notes runtime files from `Dev` to `main`. No product feature or production record was removed.

### Verification before recovery deployment

- `npm run check`: 15 tests passed.
- `npm run test:e2e`: 14 browser tests passed with two intentional project-specific skips.
- The Worker change is limited to the new core module, pinned Supabase bundle, three font files, offline page routes, and the `026e7a6` cache-buster.

### Recovery deployment and live-picker correction

- Pushed the restored Table Notes runtime to `main` as commit `185df39`.
- Deployed the route-complete Worker through the Cloudflare connector. The first binding-inheritance request was rejected before deployment because the upload API accepts only `version_id: "latest"` for inherited bindings; retrying with that documented value and strict inheritance preserved `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`.
- Cloudflare deployed Worker version `97a4dcf7-92f6-4ac6-b567-49978accb3b7` at 100%. All previously missing module, vendor, font, offline, and service-worker routes returned HTTP `200`.
- Live browser verification showed all 28 restaurants in Places. It also exposed an anonymous Picker error: the session query requested nested voter IDs and email addresses even though production correctly grants anonymous visitors only aggregate vote access.
- Kept the privacy-preserving database grants unchanged. Updated the Picker query so only approved editors request nested voter identity rows; anonymous and unapproved visitors read `decision_vote_totals` aggregates without receiving voter emails.
- Stamped the first corrected frontend and Worker with cache version `20260724a`.
- After the Picker query correction, `npm run check` passed 15 tests and `npm run test:e2e` passed 14 tests with two intentional project-specific skips.
- The live retest showed the remaining denial came from the `security_invoker` aggregate view requiring anonymous access to its underlying vote table. Kept the anonymous table and `voter_email` privileges denied.
- Added migration `20260723215428_public_picker_vote_totals_rpc.sql` and applied it to production as `public_picker_vote_totals_rpc`. The narrowly scoped function returns only session ID, restaurant ID, and vote count; `PUBLIC` execution is revoked and only `anon` and `authenticated` may call it.
- Verified as the `anon` role that the aggregate RPC succeeds while direct vote-table and `voter_email` access remain denied.
- Updated the frontend to use the aggregate RPC and stamped the final public runtime and Worker with cache version `20260724b`.
- The Supabase CLI was not installed locally, so the migration was applied with the connected Supabase migration tool and the committed filename was aligned to the resulting production migration version.
- Post-DDL advisors report the intentional aggregate function execution warnings plus the existing aggregate and leaked-password warnings. No RLS, search-path, or missing-index defect was introduced; existing performance notices remain deferred pending usage evidence and removal approval.
- Published final GitHub release commit `53d7381` and deployed Cloudflare Worker version `00d19c1a-00be-4d9f-a001-b04303a67c34` through deployment `dcc5917d-1219-47d5-83ca-c26c3041ea11` at 100%.
- Confirmed both Worker Supabase bindings remain present and all previously missing public asset routes still return HTTP `200`.
- Final live browser verification on `20260724b` showed 28 places, a working anonymous Picker empty state, and no browser console errors.
- Final production inventory remained unchanged: 28 restaurants, 21 dishes, 8 restaurant photos, 13 restaurant ratings, 21 dish ratings, 2 playlists, 4 Want-to-go records, and 30 storage objects totaling 14,099,095 bytes.

## 2026-07-24 — Mobile restaurant-area scrolling fix

### Issue and cause

- Dany reported that phone users could scroll only near the screen edge; vertical swipes over the restaurant list did not move the page reliably.
- At a 390×844 viewport, the restaurant list measured 3,721px tall with equal client and scroll heights, so it was not independently scrollable. It nevertheless retained desktop `overflow-y: auto` and `overscroll-behavior: contain`, creating a touch-capturing inner scroll layer with nowhere to scroll.

### Change

- On phone/tablet layouts, the restaurant list now uses visible overflow and normal overscroll chaining so vertical gestures belong to the page.
- Horizontal clipping moved to the surrounding list panel using `overflow-x: clip`, which avoids creating another vertical scroll container.
- No restaurant actions, long-press shortcuts, navigation, data behavior, or desktop scrolling behavior changed.
- Added a mobile Playwright regression assertion requiring the restaurant list to have visible vertical overflow, automatic overscroll chaining, and no inner scrolling.
- Stamped the frontend and Worker for release `20260724c`.

### Verification

- `npm run check`: 15 tests passed.
- `npm run test:e2e`: 14 browser tests passed with two intentional project-specific skips.
- The Impeccable detector reported only pre-existing design-system drift advisories across the legacy stylesheet; the scroll fix introduced no new visual token or anti-pattern.
- Published commit `a4545e0` and deployed Cloudflare Worker version `d6982455-17b0-40a7-b047-3b1a432c995f` through deployment `1814c90c-e13b-417c-ac7b-203deade2a0a` at 100%, preserving both Supabase bindings.
- Live verification at 390×844 loaded all 28 restaurant rows with `overflow-y: visible` and `overscroll-behavior-y: auto`.
- A scroll gesture issued over the middle of the restaurant-card area moved the document from 900px to 1,520px, confirming that the full card area now scrolls the page. The live browser reported no console errors.

## 2026-07-24 — Want-to-go bookmark restored

### Change

- Dany preferred the old bookmark marker over the redesigned restaurant-row label “Saved” because the icon is easier to recognize while scanning.
- Restored the existing bookmark component inside the active Want-to-go row toggle. Unmarked restaurants still show the visible “Want to go” action.
- The active bookmark remains a 44×44px button with `aria-pressed`, a restaurant-specific accessible removal label, hover/focus feedback, and tap-to-remove behavior.
- Long press, the place action sheet, the detail-view Want-to-go control, group totals, and all persistence behavior remain unchanged.
- Added desktop and mobile browser regression coverage requiring the bookmark to appear, the “Saved” label to disappear, and the toggle to report its pressed state.
- Stamped the frontend and Worker for release `20260724d`.

### Verification

- `npm run check`: 15 tests passed.
- `npm run test:e2e`: 16 browser tests passed with two intentional device-specific skips.
- The Impeccable detector reported only pre-existing design-system drift advisories; the restored marker reuses the existing component and semantic Want-to-go tokens.
- Published commit `4e21e0a` and deployed Cloudflare Worker version `00c958ae-6b2f-40cd-a5f4-6c9bb1b3adf7` through deployment `764080b7-c655-4e37-9e42-596f912e87fc` at 100%, preserving both Supabase bindings.
- Live release `20260724d` loaded all 28 restaurants with no browser errors. The deployed `app.js` contains the bookmark row renderer and no longer contains the old conditional “Saved” row label.
- Live verification was read-only; no production Want-to-go state or restaurant data was changed.

## 2026-07-24 — Mobile ticket separation and dark palette restoration

### Issues and causes

- Dany’s phone screenshots showed that unselected restaurant rows blended into the list because their Table Notes border remained transparent on mobile, leaving whitespace as the only separator.
- The white shade over “John’s Palate” came from the legacy `playlist-bar-scroll` edge-fade pseudo-elements. The mobile layout allows the chip strip to extend wider than its 360px scroll viewport, so the fixed right fade was painted across the middle of the visible chip row.
- The Table Notes dark-theme override replaced the earlier warm charcoal, linen, amber, and purple palette with green-cast surfaces and accents that Dany preferred less.

### Changes

- Mobile restaurant rows now use the existing semantic hairline token and an 8px adjacent-ticket rhythm. The selected row keeps its stronger accent border and selected background.
- Mobile playlist edge-fade pseudo-elements are disabled, removing the white overlay without changing horizontal scrolling, playlist selection, counts, or management.
- Restored the pre-Table Notes dark-theme character using warm charcoal `#131416`, panel `#1c1e22`, soft panel `#25282d`, linen `#ede9e1`, amber `#f39a1f`, and the established purple Want-to-go variables.
- Raised the restored dark placeholder color to the existing muted linen value so it maintains a 5.04:1 contrast ratio against the input surface.
- Updated `DESIGN.md` so the restored dark palette remains intentional design-system guidance.
- Added mobile browser regression assertions for visible row borders, ticket spacing, and absent playlist fades, plus a regression contract for the restored dark-theme tokens.
- No feature, interaction, production record, Supabase schema, storage object, or restaurant data was removed or changed.

### Verification before publishing

- `npm run check`: 15 tests passed.
- `npm run test:e2e`: 16 browser tests passed with two intentional device-specific skips.
- Local visual verification at 390×844 confirmed separate restaurant tickets, no playlist fade overlay, charcoal dark surfaces, linen structural accents, amber highlight, and the purple Want-to-go color.
- The Impeccable detector reported advisory design-system drift across the legacy stylesheet; the new dark palette is documented in `DESIGN.md`, and no blocking finding was introduced by the mobile fixes.
- Release candidate: `20260724e`.

### Publishing and live verification

- Published release commit `1b842bc` to `main`.
- Uploaded Cloudflare Worker version `ede01eae-ec5e-4a2e-8542-53632ff85582` and deployed it at 100% through deployment `3c6efb6c-ebd0-451b-81c9-f1dd91b1f89d`.
- Strict binding inheritance preserved the existing `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` bindings without changing their values.
- Live release `20260724e` at 390×844 loaded all 28 restaurants. Unselected rows computed to the semantic hairline border, adjacent tickets retained visible separation, and both playlist fade pseudo-elements computed to `none`.
- Live dark-mode verification computed the restored charcoal, surface, linen, amber, and purple values exactly as documented. The original light-theme preference was restored after testing.
- The live browser reported no console warnings or errors. Verification did not write to Supabase or change any restaurant, rating, playlist, Want-to-go, photo, or picker data.

## 2026-07-24 — Mobile Add control and restaurant-detail navigation

### Issues and causes

- Dany reported that the phone Add-place control appeared as a blank green rectangle. `renderAuth()` replaced the button's structured markup with plain text, while the mobile CSS made that plain text transparent and expected the removed icon span to remain visible.
- The mobile “Back to places” control inherited browser-default styling: a 26.5px target, square corners, an outset border, and no Table Notes surface treatment.
- Mobile restaurant details kept the browse hero and list header visible, so the selected restaurant did not feel like a focused navigation state.

### Changes

- Preserved permanent Add-button markup with separate plus icon and label elements. Authentication rendering now updates only its accessible label, title, and sign-in requirement state, so it cannot destroy the visible icon or text again.
- Mobile shows a 44px-high `+ Add` control; desktop continues to show `+ Add place`. The compact 620px breakpoint hides only the secondary brand text so Add, Trash, Settings, and Theme remain reachable without horizontal overflow.
- Rebuilt “Back to places” as a 44px Table Notes control using the existing panel, border, accent, radius, and focus tokens.
- Mobile restaurant detail is now focused: the browsing hero, result header, and duplicate mobile sign-in bar are hidden only while detail is open. The top rail and Places/Map/Pick dock remain available.
- Added optional swipe-right navigation that follows the finger, uses horizontal/vertical axis locking, distance and velocity thresholds, leftward friction, pointer capture where supported, transform/opacity-only settling, and an immediate reduced-motion path. Interactive controls are excluded from swipe starts, and the visible Back button remains the primary navigation.
- Opening a restaurant stores the page position and moves to the top of the focused detail. Back restores the prior list position and keyboard focus; swipe restores the position without forcing focus.
- Updated `DESIGN.md` with the mobile detail navigation contract. No restaurant action, edit flow, data operation, Supabase object, storage object, or production record was removed or changed.
- Stamped the frontend, service worker, and Worker cache key for release `20260724f`.

### Verification before publishing

- `npm run check`: 15 tests passed.
- `npm run test:e2e`: 17 browser tests passed with three intentional project/device-specific skips.
- Added browser coverage for visible Add content and its 68×44px minimum phone target, the styled 44px Back control, focused detail state, swipe-right dismissal, vertical-gesture preservation, URL cleanup, and visible Back-button fallback.
- Local browser inspection at 390×844 confirmed readable Add content, a 44px Back target with a solid semantic border and 10px radius, focused detail composition, and no horizontal overflow. The 620px compact layout also retained all top-rail controls without overflow.
- The Impeccable detector reported advisory design-system drift across the existing stylesheet; no blocking finding was reported. The new control sizes, radii, colors, motion duration, and behavior are documented and use current design tokens.
- Release candidate: `20260724f`.

### Publishing and live verification

- Published release commit `22959de` to `main`.
- Uploaded Cloudflare Worker version `2c6569d5-a2dd-4af8-9baf-12615f2cd0b2` and deployed it at 100% through deployment `a9a20b7a-3263-48b3-9e28-939acd91241c`.
- Strict binding inheritance preserved the existing `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` bindings without changing their values.
- Live release `20260724f` loaded all 28 restaurants. At 390×844, Add displayed `+ Add` with readable foreground color, and focused restaurant detail displayed a 44px Back control with a solid semantic border and 10px radius while hiding the browse hero.
- The live browser reported no warnings or errors. Verification was read-only and did not change any restaurant, dish, rating, review, playlist, Want-to-go record, photo, picker session, Supabase schema, or storage object.

## 2026-07-24 — Larger restaurant thumbnails and selectable main photos

### Product and interface changes

- Increased restaurant-list photo crops from 64×64px to 76×76px on desktop and from 54×54px to 72×72px on mobile. Ticket minimum heights and intrinsic sizing were adjusted to prevent crowding and layout shifts.
- Added a visible `Use as main` action to active restaurant-gallery photos and a `Main photo` badge for the selected image. The action has a 44px target, disables all cover-photo choices while the request is in flight, and reports success or failure through the existing scoped toast feedback.
- The list now chooses images in this order: explicitly selected main restaurant photo, newest active restaurant photo, first dish photo, then restaurant initials. Existing behavior therefore remains the fallback until an editor makes a selection.
- Documented the crop sizes, selection behavior, and fallback order in `DESIGN.md`.

### Data-safety implementation

- Added the additive migration `supabase/migrations/20260724143557_restaurant_cover_photo.sql`.
- The migration adds nullable `restaurants.cover_photo_id`, an indexed foreign key to `restaurant_photos`, and an approved-editor `set_restaurant_cover_photo` RPC. Selecting an image changes only this reference; it does not copy, replace, reorder, trash, or delete any photo or storage object.
- Added database validation that the chosen image is active and belongs to the same restaurant. If a selected image is moved to Trash, a trigger clears the reference so the existing newest-photo/dish-photo fallback is used while the stored media remains retained.
- Export/import preserves the selected cover using a per-photo `isCover` marker and resolves it to the newly generated photo UUID during the existing transactional import.
- Local-only mode mirrors the same selection and fallback behavior. Moving the locally selected image to Trash clears its cover marker without removing it.
- Updated the baseline schema documentation with the additive cover-photo column, foreign key, and partial index.

### Verification and remaining rollout constraint

- `npm run check`: 16 unit/contract tests passed.
- `npm run test:e2e`: 19 desktop/mobile browser tests passed with three intentional project/device-specific skips.
- Added browser coverage that selects the older of two gallery images, verifies the list crop changes, confirms both gallery records remain intact, and enforces the 72px mobile crop.
- Added safety-contract coverage for the RPC, same-restaurant validation, nullable foreign key fallback, and absence of permanent photo deletion.
- `npm run build` completed successfully in local-only mode. Its temporary service-worker build stamp was restored to the current published release because this feature has not been approved for deployment.
- The Impeccable detector reported advisory design-system drift across the existing stylesheet; the new cover-photo controls use existing semantic tokens, documented sizes, exact transitions, and the established control radius.
- No production Supabase schema, database row, storage object, GitHub branch, or Cloudflare deployment was changed. The migration must be applied before publishing the frontend because the new remote query selects `cover_photo_id`; deployment remains blocked pending Dany's explicit production rollout approval.

### Production rollout approval and database migration

- Dany explicitly approved the production rollout.
- Recorded a read-only pre-migration inventory: 28 restaurants, 21 dishes, 8 restaurant photos, 13 restaurant ratings, 21 dish ratings, 2 playlists, 4 Want-to-go records, and 30 storage objects totaling 14,099,095 bytes.
- Applied `20260724143557_restaurant_cover_photo` to production. Verified the nullable column, foreign key, same-restaurant validation trigger, Trash fallback trigger, and authenticated RPC grant.
- Post-migration privilege verification found that the `anon` role still inherited function execution through Supabase's default privileges. The RPC also rejected anonymous calls internally, but the API endpoint did not need to be reachable.
- Added and applied follow-up migration `20260724143737_restrict_restaurant_cover_photo_rpc`, explicitly revoking anonymous execution while retaining authenticated execution.
- Re-ran the Supabase security advisor. The cover-photo RPC introduced no remaining security warning. The five existing aggregate-function/leaked-password warnings remain unchanged and are outside this release.
- Post-migration inventory exactly matched the pre-migration inventory, and all existing restaurants have a null cover reference until an approved editor chooses one. No restaurant, dish, rating, playlist, Want-to-go record, photo record, or storage object was changed or removed.
- Stamped the frontend and Worker release as `20260724g`.

### Publishing and live verification

- Published commit `7fbcfb9` to `main`.
- Uploaded Cloudflare Worker version `c6a155a5-8f5a-4958-b2b3-abc26e0d6d7b` with strict binding inheritance and deployed it at 100% through deployment `83e227ed-1b5e-4779-be49-24a99374b50b`.
- Confirmed both existing Supabase bindings were inherited without changing their values. The prior Worker version `2c6569d5-a2dd-4af8-9baf-12615f2cd0b2` remains available for immediate frontend rollback.
- Live release `20260724g` loaded all 28 restaurants with the stamped stylesheet and module script. At the active compact/mobile breakpoint, the first three restaurant media crops computed to exactly 72×72px.
- Opened a public restaurant containing two gallery photos and confirmed both images loaded. The anonymous view correctly exposed no cover-selection controls; editor-only selection is covered by the authenticated permission checks and desktop/mobile browser suite.
- The live browser reported no console warnings or errors. Verification was read-only and did not choose a cover photo or change any restaurant, dish, rating, review, playlist, Want-to-go record, photo, picker session, or storage object.

## 2026-07-25 — Cloud-sync repair, unsynced recovery, and smart duplicate warnings

### Issue and root cause

- Dany reported that a restaurant added on a phone did not appear on a PC.
- Production Supabase contains one older `SHANTUNG` record created on 2026-05-18 and no newly created Shantung row.
- The main-photo migration introduced a second foreign key between `restaurants` and `restaurant_photos`. The frontend continued to request an unqualified nested `restaurant_photos(...)` relation, so PostgREST rejected cloud loads as ambiguous.
- The failed initial load left `state.remoteReady` false. The restaurant form then used the local fallback and reported success without explaining that the new record existed only in that phone's cached journal.

### Changes

- Qualified the nested gallery read with `restaurant_photos!restaurant_photos_restaurant_id_fkey`, restoring the intended one-to-many relationship without changing the cover-photo reference or database schema.
- Added conservative recovery for local-only restaurant records. Explicit pending records and legacy local creations that never had a cloud `updatedBy` field remain visible after a fresh cloud load with an `Unsynced` marker and recovery instructions.
- Online approved editors now attempt the transactional Supabase save even if the full journal has not finished loading. RPC failures preserve the draft and report an error; offline saves remain available but are explicitly marked as device-only pending changes.
- Added smart duplicate detection using normalized names, spacing-insensitive comparison, punctuation/diacritic cleanup, generic restaurant-word removal, edit-distance, bigram, token, and location similarity.
- Possible matches appear inline while editing and are rechecked against a fresh active-restaurant query immediately before Save. Editors can open an existing match or explicitly confirm that a legitimate namesake should be added separately.
- Corrected the shared form submission lifecycle so controls are re-enabled only after the request lock is released, preventing a rapid retry from being ignored.
- Documented the duplicate-warning and offline-recovery interface contracts in `DESIGN.md`.
- Stamped the release candidate as `20260725a`.

### Verification

- `npm run check`: 21 unit and source-contract tests passed.
- `npm run test:e2e`: 21 desktop/mobile browser tests passed with three intentional device-specific skips.
- Coverage includes Shantung/Shan Tung spacing equivalence, likely misspellings, same-location ranking, short-name false-positive protection, editing exclusion, legacy local recovery, authoritative duplicate-query wiring, inline warning, explicit override, mobile rendering, and all existing regression flows.
- `git diff --check` passed.
- The Impeccable detector reported only the existing legacy stylesheet token-drift advisories and no blocking issue introduced by this change.

### Production safety status

- No restaurant, dish, rating, review, playlist, Want-to-go record, photo, storage object, or Supabase schema was changed during diagnosis or local implementation.
- The phone-only Shantung entry must remain in that phone's site data until release `20260725a` loads and marks it Unsynced. Clearing browser data before recovery would remove the only known copy.

### Publishing and live verification

- Published commit `a34ae15` to `main`.
- Uploaded Cloudflare Worker version `edcb9187-46a2-44ec-899b-43d5b35195ec` with strict binding inheritance and deployed it at 100% through deployment `55a4c4d5-2bca-4bbe-ba4c-0e8e54d14528`.
- Confirmed the deployed Worker retained both existing `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` bindings. The prior Worker version `c6a155a5-8f5a-4958-b2b3-abc26e0d6d7b` remains in deployment history for frontend rollback.
- Live release `20260725a` loaded all 28 active cloud restaurants, displayed the existing `SHANTUNG`, reported `Public view`, and did not show the previous sync failure.
- A post-deployment read-only Supabase check confirmed exactly 28 active restaurants and exactly one normalized Shantung match: the existing `SHANTUNG` row created on 2026-05-18. No duplicate row was inserted during testing.
- Deployment and verification did not change any restaurant, dish, rating, review, playlist, Want-to-go record, photo, picker session, Supabase schema, or storage object.
- Recovery remains device-specific: on the phone that created the unsynced Shantung entry, load `20260725a` without clearing site data. The entry should show `Unsynced`; open Edit and Save to retry cloud persistence. The duplicate warning will surface the older cloud `SHANTUNG` so the editor can compare it before explicitly creating a separate location.

## 2026-07-25 — Capture-first restaurant and dish editors (local release candidate)

### Product and interface changes

- Rebuilt both add flows around quick capture and progressive disclosure without removing any existing restaurant, dish, rating, review, playlist, Maps, photo, Want-to-go, edit, or Trash capability.
- Restaurant creation now requires only a name. Entries missing a location or cuisine display a `Needs details` marker in the list and accessible Add Location/Add Cuisine actions in the detail view.
- New restaurant capture starts with `Want to try` or `Already visited`. Want to try enables the initial bookmark by default; Already visited opens the rating, visited-by, and notes section.
- Organized restaurant fields into Basics, Plan it, Remember the visit, and an edit-only Danger zone. Location and cuisine use native keyboard-operable typeaheads that accept custom values and prioritize up to five recent choices.
- Replaced the price select with `$`–`$$$$` segmented choices and plain-language descriptions while preserving the stored values.
- Added a post-save state with Add a dish, Add photos, and Done. A committed cloud save is also cached by its returned UUID so a failed refresh cannot encourage a duplicate retry or block the next action.
- Added `Needs details` derivation as a shared helper and preserved empty strings for missing metadata; no table or column migration was required.
- Added dish duplicate detection scoped to the current restaurant, including punctuation, spacing, capitalization, and likely misspellings, with short-name false-positive protection, edit exclusion, Open existing, and explicit separate-dish confirmation.
- Replaced the visible native dish file input with Take photo and Choose photo controls. Existing compression, upload, compensating orphan cleanup, current-photo preservation, preview, Change, and Remove selection behavior remain intact.
- Added visible half-star decrease/increase controls to both rating pickers while preserving tap, slide, keyboard, Clear, and no-rating behavior.
- Renamed `Liked by` to `Who liked this? (optional)` and retained known-friend chips plus arbitrary-name entry.
- Added Save & add another; it clears only dish-specific fields and retains the restaurant context after a successful save.
- New-entry drafts are stored in `sessionStorage` after meaningful changes, restored on reopen, and cleared only by a successful save or explicit Discard draft. File objects remain memory-only and the restored draft explains when a photo must be chosen again.
- Added inline error summaries, first-invalid-field focus, scoped status feedback, full-screen phone editors, sticky safe-area actions, semantic fieldsets/disclosures, and 44px rating/photo/action controls.

### Smart Maps capture and PWA sharing

- Added a same-origin `POST /api/maps/resolve` Worker route with a 2,048-character HTTPS Google Maps allowlist, a 4KB request-body limit, manual Google-owned redirects, a maximum of five followed redirects, a 3.5-second timeout, explicit body cancellation, and no generic fetching or page-content scraping.
- The resolver returns only URL-embedded final URL, name, place ID, and coordinates. The frontend previews results and fills only empty fields; it never overwrites a typed restaurant name.
- Resolution failure retains the submitted link and lets the editor continue manually. No Google Places key, paid API, billing account, reviews, ratings, or copyrighted Google content is used.
- Added the equivalent resolver route to the local preview server for development testing.
- Added a GET-based PWA share target that accepts a shared Google Maps title/text/URL and opens the restaurant editor when the signed-in user has edit access. Ordinary paste remains the universal fallback.

### Additive database work

- Created the correctly timestamped local migration `supabase/migrations/20260725201803_capture_first_restaurant.sql` with the Supabase CLI.
- Added the uniquely named, security-invoker `save_restaurant_capture(jsonb, numeric, boolean)` RPC. It calls the existing transactional restaurant/rating function and inserts the initial Want-to-go bookmark in the same database transaction.
- The function uses an empty explicit search path, revokes execution from `public`, `anon`, and `authenticated`, then grants only `authenticated`. No existing function, table, column, policy, row, or storage object is changed or removed.
- The existing restaurant edit and dish transaction RPCs remain compatible and unchanged.

### Issues found and resolved

- The Supabase CLI initially failed because its telemetry file is outside the workspace sandbox. After explicit approval, the CLI created the timestamped migration successfully; no remote Supabase operation was run.
- The first browser run exposed test assumptions that Trash was always expanded, successful creation immediately closed the dialog, and both close controls shared the same accessible name. Tests were updated to target the intentional disclosure, success state, and exact footer control.
- A cloud restaurant save could previously be followed by a lookup-refresh error that made the whole action look unsuccessful after the database commit. Lookup refresh is now best-effort, and restaurant/dish results are cached by the returned database UUID if the trailing journal refresh fails.
- Closing the restaurant dialog from the post-save success state could recreate the just-cleared draft. Draft persistence now runs only while the editor body is active.
- The one-time Impeccable detector reported broad advisory token drift across the existing stylesheet and the known stale design sidecar. New capture styles were aligned to the documented 14px content, 10px control, and documented typography scale where applicable. The sidecar was not rewritten, per the approved plan.

### Verification and rollout status

- `npm run check`: 30 unit and source-contract tests passed.
- `npm run test:e2e`: 31 desktop/mobile browser tests passed with three intentional device/project-specific skips.
- Coverage now includes name-only capture, incomplete markers, both intents, initial Want-to-go behavior, restaurant/dish duplicate overrides, draft restore/discard, Maps parsing and non-overwrite, Google-only redirect handling, redirect limit, PWA share-target contract, half-star controls, camera/library controls, Save & add another, Trash restoration, cover photos, navigation, accessibility, reduced motion, URL state, and representative datasets.
- A local in-app browser pass verified the actual dark-theme restaurant and dish editor hierarchy, scrolling, disclosures, sticky actions, accessible names, and control availability.
- Release candidate stamps are `20260725b`.
- No production Supabase migration, production data write, storage change, GitHub push, or Cloudflare deployment was performed. Production rollout remains gated by Dany's explicit approval after preview review.

### GitHub publication decision

- Dany explicitly requested that the verified capture-first release be committed and pushed directly to `main`.
- This GitHub publication includes the unused additive Supabase migration and Worker resolver source, but does not apply the migration, deploy the Worker, change production data, or change storage.
- Published the capture-first implementation as commit `96e286f` on `origin/main`.

## 2026-07-26 — Aligned split detail and responsive restaurant cover hero

### Interface changes

- Corrected the desktop Places grid so the playlist rail, restaurant list, and selected restaurant detail all begin on the same row. The visible list-action helper now remains in the list column and can no longer occupy the detail column.
- Added an edge-to-edge selected-restaurant cover hero at the top of the detail panel: `16:7` on desktop and `16:9` on phones.
- The detail hero and restaurant-list thumbnail now share one media resolver. It prioritizes the explicitly selected restaurant cover, then the first active restaurant gallery photo, then the first active dish photo. A styled initials placeholder is used only when no active image exists.
- Selecting `Use as main` in the existing restaurant gallery immediately updates both the detail hero and list thumbnail. Gallery order, photos, cover controls, storage references, and Trash behavior remain unchanged.
- On phones, the existing Back action and swipe hint are overlaid on the cover using high-contrast translucent controls. The 44px Back target and existing swipe-right dismissal behavior remain intact.
- The detail title now responds to the panel's actual width. Actions move below the restaurant name in narrower desktop panels and return beside it only when both fit without squeezing or breaking the title.
- Release candidate frontend and Worker stamps are `20260726a`.

### Issue cause and resolution

- The detail panel was pushed beneath the restaurant list because `.list-panel` uses `display: contents`; when the list-action helper became visible, CSS Grid auto-placement put that helper in column three. The explicitly column-three detail panel was then placed in the next row.
- Desktop grid rows and columns are now explicit for the playlist, list, helper text, and detail panel. No HTML section or feature was removed.
- A rendered 1440px validation exposed a second issue where detail actions compressed the restaurant title. A named inline-size container now changes the header arrangement based on detail-panel width rather than viewport width.

### Verification and safety

- `npm run check`: 30 unit and source-contract tests passed.
- `npm run test:e2e`: 32 applicable desktop/mobile browser tests passed; four device/project-specific tests were intentionally skipped.
- Added regression coverage for exact desktop list/detail top alignment, helper containment within the list column, detail-hero visibility, and immediate hero updates when a new main photo is selected on desktop and mobile.
- Local rendered checks at `1440×900` and `390×844` confirmed aligned pane tops, readable titles/actions, a full-width cover stage, 44px mobile Back control, and no browser console errors.
- The Impeccable layout detector returned no layout findings; the full detector continues to report the repository's existing advisory design-token drift.
- No Supabase query, migration, production-data write, storage upload, photo deletion, GitHub push, or Cloudflare deployment was performed.

### GitHub publication decision

- Dany explicitly requested that the verified `20260726a` detail-layout and cover-hero release be committed and pushed directly to `main`.
- The push publishes frontend, Worker source, tests, service-worker cache metadata, and this engineering log. It does not deploy the Cloudflare Worker, apply a Supabase migration, or change production data or storage.

## 2026-08-08 — Production restaurant-capture RPC restored

### Issue and cause

- Adding a restaurant failed with PostgREST's schema-cache error for `public.save_restaurant_capture(p_rating, p_restaurant, p_want_to_go)`.
- The deployed frontend called the capture-first RPC, but production migration history and `pg_proc` confirmed that `save_restaurant_capture` was absent. The migration had been published to GitHub without being applied to production, so this was a deployment gap rather than a stale schema cache.

### Change

- Dany explicitly approved applying the existing additive capture-first migration to production.
- Applied the migration as production version `20260808195735_capture_first_restaurant`.
- Aligned the repository migration filename and its source-contract test with the production migration-history version so future migration tooling will not treat the same change as pending.
- The migration adds only `public.save_restaurant_capture(jsonb, numeric, boolean)`. It remains `SECURITY INVOKER`, uses an empty search path, retains all existing save/edit functions, and grants execution only to `authenticated`.
- Requested a PostgREST schema reload after the function was installed. No application feature, table, column, row, or storage object was removed or replaced.

### Verification

- Confirmed the exact RPC signature exists in `public`, is not `SECURITY DEFINER`, has `search_path` locked to empty, rejects `anon`/`PUBLIC`, and allows `authenticated`.
- Ran the full restaurant + rating + initial Want-to-go transaction as a real approved-user identity inside an explicit rollback. It returned a restaurant UUID, proving all three write paths execute together.
- Confirmed the rollback left production unchanged at 29 restaurants, 15 restaurant ratings, and 5 Want-to-go records; the verification restaurant did not persist.
- Supabase migration history includes `20260808195735_capture_first_restaurant`.
- Security and performance advisors reported no finding for the new function. The five pre-existing security warnings (two intentional aggregate RPCs reported for both anonymous and authenticated access, plus leaked-password protection) and the previously documented RLS/index performance notices remain unchanged and were not expanded into this fix.

## 2026-08-08 — Playlist total and visible-result mismatch clarified

### Issue and cause

- Dany reported that the Asian playlist displayed a total of 19 places while only three restaurant tickets were visible.
- A read-only production query confirmed all 19 active Asian restaurants and their complete playlist arrays are present in Supabase; no restaurant or playlist membership was missing.
- An initial hypothesis that a persisted `4.5+` minimum-rating filter caused the three results was rejected after Dany supplied a screenshot that included Yamatako at 3.5.
- Code review found a concrete recovery defect: FoodLog persists search text across sessions, but the Filters sheet's `Clear all` action reset only dropdowns and sorting. A lingering search could therefore continue narrowing the selected playlist after every visible filter was cleared. The exact search text on Dany's phone is device-local and was not available for direct inspection.
- FoodLog intentionally combines playlist, search, location, cuisine, price, and rating filters, but the playlist rail reported only the full membership total, hiding whichever criterion kept the list narrower.

### Change

- Preserved combined filtering and playlist membership behavior.
- When search or another filter narrows the selected playlist, the rail now reports the visible and total counts together, such as `3 of 19 places`.
- Added a visible, keyboard-accessible, 44px `Show all 19` recovery action. It clears search, location, cuisine, price, and minimum rating while retaining the selected playlist and sort order.
- Corrected the existing Filters sheet's `Clear all` action so it now clears persisted search text as its label promises, along with location, cuisine, price, minimum rating, and sort order.
- Moved playlist count rendering after the location and cuisine controls restore their selected values so the count cannot be computed from transient empty dropdown state during startup.
- Updated `DESIGN.md` with the durable playlist-count and recovery-action contract.

### Verification

- Read-only production verification found 19 active members in the Asian playlist; no database, schema, storage, or production data change was made.
- Added a 19-place Playwright fixture narrowed to three by persisted search; the visible set deliberately includes a 3.5-rated restaurant to prevent regression to the rejected rating explanation.
- Desktop and mobile regression checks confirm the initial list shows three tickets, the rail states `3 of 19 places`, the recovery target is at least 44px high, and activating it shows all 19 while keeping Asian selected and removing the search URL parameter.
- The same browser test reapplies the persisted search and confirms Filters → Clear all now empties search and restores all 19 results.
- `npm run check`: 30 unit and source-contract tests passed.
- `npm run test:e2e`: 34 desktop/mobile browser tests passed; four device-specific tests were intentionally skipped.
- The Impeccable detector reported only the repository's existing advisory design-token drift. The new recovery action uses the documented control height, colors, and label type size and introduced no blocking finding.
- Dany approved committing, pushing, and deploying the corrected implementation. Release candidate frontend, service-worker, and Worker stamps are `20260808a`.

### Publication and production rollout

- Published the verified application and migration-history alignment to `origin/main` as commit `882f4cb` (`Fix playlist filter recovery`).
- Uploaded Cloudflare Worker version 68 (`447061e3-be3f-449a-9759-89a79429fc7e`) and deployed it to 100% of production traffic as deployment `0b5eef12-48d0-4fef-9e6b-94dc27fabe97`.
- The deployment inherited the existing `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` bindings without exposing or changing their values, and retained compatibility date `2025-01-01`, no compatibility flags, and the standard usage model.
- Live checks against `https://food.danyhanna.uk` returned HTTP 200 for the document, application script, stylesheet, service worker, and runtime configuration endpoint. The live document carries build `20260808a` and the playlist recovery control; the served application script, stylesheet, and service worker match the tested repository files byte-for-byte.
- The production rollout publishes the current `main` application state, including the previously published `20260726a` detail-layout and cover-hero work that had not yet been Worker-deployed. No production restaurant record or storage object was changed by this frontend deployment.

## 2026-08-15 — Emil Kowalski UI/UX skill collection installed

### Tooling change

- Confirmed an older `emil-design-eng` copy was already available from the earlier UI/UX skill installation, then installed the current repository version into the user-level Codex skills directory.
- Installed the remaining companion skills from `emilkowalski/skills` into the user-level Codex skills directory:
  - `animate`
  - `animation-vocabulary`
  - `apple-design`
  - `ask-sonner`
  - `find-animation-opportunities`
  - `improve-animations`
  - `pick-ui-library`
  - `prototype`
  - `review-animations`

### Decisions and rationale

- Installed the repository's companion collection because Dany plans to use it for future frontend audits, UI/UX improvements, animation reviews, and prototyping.
- No FoodLog application behavior, production data, Supabase schema, GitHub state, or Cloudflare deployment was changed.

### Verification

- The installer completed successfully for all nine missing skills.
- Confirmed the installed skill directories exist under `/Users/danielhanna/.codex/skills/`.

## 2026-08-15 — Frontend usability and initial-load audit

### Audit scope and decisions

- Audited the live desktop and 390px mobile Places experience and reviewed `index.html`, `styles.css`, and `app.js` using the Emil Kowalski interaction guidance, the animation audit workflow, Impeccable, and the current Web Interface Guidelines.
- Preserved every existing surface and workflow. The audit found that focus treatment, 44px touch targets, reduced-motion handling, responsive navigation, image dimensions/lazy loading, URL-backed browse state, and large-list `content-visibility` were already in place and should remain unchanged.
- Prioritized initial-load work and mobile browsing density over decorative animation. The dedicated Chrome DevTools performance tracer was not configured, so this pass did not claim laboratory Core Web Vitals; evidence came from the live browser, response headers, local asset sizes, responsive inspection, and automated tests.

### Changes

- Removed Leaflet CSS and JavaScript from the eager document path. `app.js` now loads the integrity-pinned Leaflet assets only when Map is opened, shares one in-flight loader, exposes an accessible loading state, and offers a Retry map action after a network failure. The Map feature and its existing marker behavior remain intact.
- Added early font discovery for the Atkinson Hyperlegible Next body face and Bricolage Grotesque display face used in the first viewport.
- Added polite restaurant-count announcements and `aria-busy` state for restaurant and map loading so asynchronous changes are clearer to assistive technology.
- Reduced the small-screen hero and public-auth spacing while retaining all copy and controls, allowing the restaurant queue to appear sooner without changing desktop composition.
- Added a regression contract that prevents Leaflet from returning to the eager HTML path and protects both critical font preloads.

### Verification and remaining risks

- `npm run check` passed before implementation with 30 tests, and the post-change suite passed with the added performance contract.
- `npm run test:e2e` passed all 34 active desktop/mobile scenarios; 4 project-specific scenarios were skipped as designed. Axe reported no critical accessibility violations.
- Manual local verification at 390×844 found no horizontal overflow, no Leaflet asset in the initial document, a working on-demand OpenStreetMap after selecting Map, and no browser console warnings or errors.
- The Impeccable detector completed once after the UI changes. It reported advisory design-token drift across the pre-existing stylesheet, including values that are valid in `DESIGN.md` but missing from the stale `.impeccable/design.json` sidecar; it found no blocker introduced by this pass. The design sidecar was intentionally not regenerated because that was outside this request.
- The live Worker was inspected but not redeployed. Production will continue serving build `20260808a` until these repository changes are reviewed and deployed.

## 2026-08-15 — Impeccable sidecar refresh and release preparation

### Design tooling maintenance

- Dany approved refreshing the stale Impeccable sidecar while preserving `DESIGN.md` as the authoritative human-readable design specification.
- Updated `.impeccable/design.json` to schema version 2 metadata generated from the current design: the complete light and dark palette, Want-to-go purple and recovery red roles, the 180ms mobile detail-swipe settlement, the playlist visible/total recovery contract, and the documented dark-theme character.
- Did not rewrite `DESIGN.md`, product context, surface briefs, application behavior, or production data as part of the sidecar maintenance.

### Verification and release state

- Confirmed `.impeccable/design.json` parses as valid JSON.
- Impeccable Doctor now reports an empty findings list with the rule registry available; the previous `design-sidecar-stale` finding is resolved.
- Confirmed the active Cloudflare `foodlog` deployment is version 68 at 100% traffic before rollout. The production Worker bindings and compatibility settings were inspected read-only and were not changed during preparation.
- `npm run check` passed all 31 unit and source-contract tests. `npm run test:e2e` passed all 34 active desktop/mobile scenarios; 4 project-specific scenarios were skipped as designed.

### Publication and production rollout

- Published the frontend optimization and sidecar refresh to `origin/main` as commits `791297b` (`Improve FoodLog frontend performance`) and `3de5f71` (`Stamp frontend release 791297b`). The document, stylesheet, application script, service worker, and Worker cache-busting version use release stamp `791297b`.
- Uploaded Cloudflare Worker version 69 (`01f2af60-5ade-4491-8cf3-9bd11b4e3d55`) and deployed it to 100% of production traffic as deployment `ae9a6774-941a-46f4-89c4-64b1dcd3f3cf`.
- The deployment inherited the existing Supabase binding names without exposing or changing their values and retained compatibility date `2025-01-01`, no compatibility flags, and the standard usage model.
- Live checks against `https://food.danyhanna.uk` confirmed the served document, application script, stylesheet, and service worker match the tested repository files byte-for-byte and carry release stamp `791297b`.
- A production browser smoke test at 390×844 confirmed no horizontal overflow, no eager Leaflet assets on Places, successful on-demand Leaflet loading and map initialization, working Places → Map → Pick → Places navigation, and no browser warnings or errors.

## 2026-08-15 — Direct multi-user dish review flow

### Product and data decision

- Added a dedicated review-only path so each approved editor can add or update their own rating and written review for an existing dish without opening the dish metadata editor.
- Preserved the established data model: `dish_ratings` remains one row per `(dish_id, rater_email)`, the dish shows the average and total review count, and every person's score and note remain visible separately.
- Kept reviewer attribution tied to the signed-in account. The interface identifies who is posting, and the existing RLS continues to prevent editors from writing another person's row. The owner moderation and recoverable Trash behavior remain unchanged.
- A read-only production query confirmed the deployed `dish_ratings` primary key is `(dish_id, rater_email)`, rating values are constrained to `0.5–5`, and active public-read plus approved-editor own-row insert/update policies are present. Production currently has 24 active dish reviews across 24 dishes, so no existing production dish yet demonstrates the multi-review state.
- No Supabase schema or migration change was needed, and no production row or storage object was changed. The verified frontend release was later published and deployed as recorded below.

### Interface change

- Every editable dish now exposes a visible `Add your review` or `Edit your review` action. The full reviews sheet exposes the same action, while long-press/right-click remains an optional reading shortcut.
- Added a focused review form with the current reviewer identity, accessible half-star picker, optional written review, required-rating recovery message, loading/error feedback, and an explicit `Move my review to Trash` action for existing reviews.
- Saving the focused form writes only the current user's `dish_ratings` row; dish name, photo, liked-by metadata, and other people's reviews are not changed.
- Preserved the existing dish editor's rating/review fields for compatibility rather than removing or replacing that workflow.

### Verification

- `npm run check`: 32 unit and source-contract tests passed.
- `npm run test:e2e`: 36 desktop/mobile browser scenarios passed; 4 project-specific scenarios were skipped as designed.
- Added regression coverage with two existing reviewers plus a third current user. It verifies the aggregate changes from two to three reviews, all three names/notes remain available, editing the current user's entry does not create a fourth row, a rating is required, and all visible composer buttons meet the 44px target.
- Local visual verification at 390×844 confirmed the composer and full review sheet fit without horizontal overflow, work in the existing dark theme, and produce no browser warnings or errors. A 40px inherited close-icon height found during inspection was corrected to 44px.
- The one-time Impeccable detector reported the stylesheet's existing broad advisory token mismatches and no blocking finding for this feature. The new review surfaces use the established panel, line, accent, danger, radius, and typography roles.
- The independent Impeccable finish review found no release blocker. It identified undersized hit areas on the review form's revealed Clear rating action and the owner-only review removal action; both were raised to 44px, the review Trash action was confirmed at 44px, and regression coverage now measures controls both before and after a rating is chosen.

### Publication and production rollout

- Dany approved deployment after the implementation and regression checks completed.
- Published the feature to `origin/main` as commit `954c4aa` (`Add multi-user dish reviews`) with production cache stamps in commit `99db37d` (`Stamp multi-user review release 954c4aa`). The document, stylesheet, application script, service worker, and Worker cache-busting version use release stamp `954c4aa`.
- Uploaded Cloudflare Worker version 70 (`efa062ea-1b08-4dfa-a6cb-1dbb476bb438`) and deployed it to 100% of production traffic as deployment `eca77103-1448-439e-bf7e-b2dc4f88dace`.
- The deployment inherited the two existing Supabase binding names, retained compatibility date `2025-01-01` and the standard usage model, and did not copy binding values into repository files or the release payload.
- Live checks against `https://food.danyhanna.uk` confirmed `index.html`, `app.js`, `styles.css`, and `sw.js` match the tested local release byte-for-byte and expose build stamp `954c4aa`.
- A read-only production browser smoke check confirmed the new review dialog is present, remains closed by default, the anonymous session does not expose editor-only review controls, the standard navigation loads, and the page has no horizontal overflow. No production review or account data was created or edited during verification.

## 2026-09-04 — Mobile Safari restaurant queue rendering fix

### Issue and cause

- Dany reported that the mobile Places view showed the correct 29-place and playlist counts but no restaurant tickets.
- The data and filter summaries were rendering, while the restaurant-list box collapsed beneath the playlist rail. The tickets used `content-visibility: auto`, and current WebKit has an open stale zero-height layout defect for long lists using that optimization.
- Chromium mobile tests continued to pass because the defect is WebKit-specific, so the existing row-count and scroll assertions did not protect the affected rendering path.

### Change

- Phone and tablet layouts up to 980px now render restaurant ticket contents normally with `content-visibility: visible`.
- Desktop retains `content-visibility: auto` and its large-list rendering optimization.
- Existing page-level mobile scrolling, playlist behavior, fixed bottom navigation, ticket actions, and restaurant data behavior remain unchanged.
- Added a 29-place mobile browser regression that requires every row to have a real layout box, the queue to grow in normal page flow, and the list to remain a non-scrolling container.
- Added the WebKit failure mode and safeguard to `REGRESSION_GUIDE.md`.

### Verification

- `npm run check`: 32 unit and source-contract tests passed.
- `npm run test:e2e`: 37 desktop/mobile browser scenarios passed; five project-specific scenarios were skipped as designed.
- A 390×844 rendered check with 29 synthetic places showed all 29 ticket boxes, a 5,218px queue in normal page flow, and `content-visibility: visible`. The same check confirmed desktop still computes `content-visibility: auto`.
- Visual inspection confirmed the first mobile ticket appears directly beneath the playlist rail, the fixed bottom navigation remains clear of the list, and the desktop three-column composition is unchanged.
- The one-time Impeccable detector reported only the stylesheet's existing advisory token mismatches and no finding caused by this fix.
- WebKit was not installed in the local Playwright runtime, so direct automated Safari execution remains unavailable. The workaround removes the affected rendering optimization from the mobile layout rather than depending on WebKit-specific detection.
- No production deployment, database, Supabase schema, storage object, or restaurant data was changed.

### GitHub publication

- Dany explicitly requested that the verified mobile queue fix be committed and pushed to `origin/main`.
- This publication updates the repository source only. It does not deploy or reconfigure the Cloudflare Worker, change its cache version, or modify production data, schema, or storage.
- Published the implementation, regression coverage, and documentation to `origin/main` as commit `eae2d07` (`Fix mobile Safari restaurant queue`).
- The push advanced `main` from `da77fdf` to `eae2d07`. No Cloudflare deployment was performed.
