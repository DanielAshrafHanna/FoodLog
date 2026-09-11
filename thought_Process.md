# FoodLog Project Log

## 2026-09-11 — Center map picker on current location

- Added Center on me to the Add/Edit restaurant map picker. It requests the browser's precise location, zooms according to reported accuracy, and shows a conventional blue position point with an accuracy area.
- Current location is only a navigation aid. It does not create or move the restaurant pin and does not enable Use this location; the editor must still tap, drag, or choose the map center before confirming the restaurant location.
- Added clear states for map loading, locating, permission denial, unavailable position, timeout, retry, and unsupported browsers. The location action stays disabled until Leaflet is ready so a fast tap cannot be lost during map setup.
- Rounded confirmed coordinates to six decimal places to prevent floating-point noise in generated Google Maps links.
- Impeccable guidance informed the explicit separation between the user's position and the saved restaurant position, responsive toolbar layout, and permission/error copy.
- Verification: 90 unit/syntax checks passed. Six focused browser tests passed across desktop and mobile, covering current-location centering with mocked permission/coordinates, keeping confirmation disabled until a restaurant point is chosen, map selection/cancel behavior, search, and pasted Google Maps links. Desktop/mobile screenshots were inspected; layout detection and git diff --check passed. Changes remain local, uncommitted, and undeployed.

## 2026-09-11 — Searchable map selection in restaurant capture

- Added Choose on map to the shared Add/Edit restaurant form. Search can jump to a restaurant, address, or distant city; selecting a result previews its pin before committing the link.
- Tap the map, drag the marker, or pan with the keyboard and Choose map center. Use this location writes a coordinate Google Maps link to the draft; Cancel preserves the previous link. Existing paste/Check link and optional Apply details remain.
- Reused Leaflet and OpenStreetMap tiles with attribution and the existing Photon search. This is not Google's embedded map; Google Maps JavaScript would require a separate configured key and billing. Provider choice was asked asynchronously and the existing provider used as the stated default.
- Map resources are released when the editor closes; generation checks prevent a late map load from reopening canceled selection. Map loading errors offer retry and link entry. Arbitrary points do not invent a restaurant name or address.
- Verification: 90 unit/syntax checks and four desktop/mobile map interaction tests passed. The confirmation pass verified actual loaded map tiles and screenshots on both widths; search responses were fixtures, while Leaflet and tiles loaded live. Layout detection and git diff --check passed. Changes remain local, uncommitted, and undeployed.

## 2026-09-11 — Triage static nested-card warning

- Inspected nested sections and their styles in index.html. Settings nests a functional collapsible Sync region inside its dialog; admin content uses only a dividing line. Capture includes conditional duplicate warnings and a legacy Basics section explicitly hidden during guided-form setup in app.js.
- The detector reports only a generic section nesting match with line 0, not a rendered defect. No UI or functionality was changed for this finding.
- Added an Impeccable exception for nested-cards in index.html only, with the inspection evidence recorded in its reason. Other rules and other files remain checked; future visible nesting in this file needs manual review.

## 2026-09-11 — Separate persistent selectors from applied filters

- Grouped All / Not visited / Been into a segmented visit control; My list remains a separate pill with its existing purple selected state.
- Moved removable filters into their own single-line horizontally scrollable row, separated by a hairline, with the result count outside the scroll area. Every existing removal action remains available.
- Reserved a 56px summary row even with no filters, using “No filters applied” at rest. Adding filters cannot wrap the header or push subsequent content down. Persistent selectors also scroll on narrow widths instead of wrapping.
- Kept the existing fonts and theme tokens; removable chips now have smaller corners to distinguish them from permanent selectors. Impeccable layout and frontend-design guidance informed grouping and stable spacing.
- Verification: 90 unit/syntax checks passed; six focused desktop/mobile browser tests passed, including stable header height, long-tag horizontal overflow, no page overflow, keyboard removal, and existing visit/search actions. Inspected both generated screenshots. The initial server start hit sandbox EPERM; the approved browser-test run succeeded.
- The layout detector reported an existing generic nested-card warning elsewhere in index.html. No application features, cloud data, or deployment changed.

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

## 2026-08-18 — UX audit: navigation, capture, visited state, and filters

### Scope

- Code-reviewed `index.html`, `app.js`, `styles.css`, `lib/foodlog-core.js`, `DESIGN.md`, and `PRODUCT.md`.
- Compared current flows with Nielsen heuristics, Vercel Web Interface Guidelines, UXPin/UX Patterns filter guidance, progressive-disclosure practice, and Google Maps saved-list behavior.
- No application behavior, schema, storage, or deployment was changed.

### Current scores (clean, easy navigation as the goal)

- Navigation: **6.5 / 10**
- Adding a restaurant or dish: **7.5 / 10**
- Visited vs not-yet-visited: **4.5 / 10**
- Filters: **6 / 10**
- Overall browse-and-capture flow: **6.5 / 10**

### How the product currently works

- Primary destinations are Places, Map, and Pick. Mobile uses a bottom dock; desktop uses the top rail. Search is live. Playlist chips filter immediately. Location, cuisine, price, and rating live in a Filters sheet and apply on Apply.
- New restaurant capture requires only a name. Intent is `Want to try` or `Already visited`. Want to try checks Want to go; Already visited opens rating, visited-by, and notes. Dish capture is name-first from the selected restaurant, with Save & add another.
- Unvisited vs visited is inferred, not a first-class list state. Want-to-go bookmarks mark places to try. `Not rated` and empty `visited` names imply not yet eaten. Detail shows visited-by names in cuisine-styled pills. There is no Visited / Not visited list badge or filter.

### Highest-value UX gaps

- Duplicate Map entry points: primary nav Map and the Places list-header list/map toggle.
- No applied-filter chips, so hidden sheet filters are easy to forget. Sort is counted as a filter. Search and playlist are not counted in the badge.
- No durable visited/unvisited visual language in the queue. A rated place can still show Want to go.
- Add dish is only available after opening a restaurant. Add place sits in the top rail, not the thumb-zone dock.
- Visited-by pills reuse the cuisine pill class, so people look like cuisine tags.

### Skills already intended vs skills worth installing next

- Already recorded for this project: `impeccable`, `emil-design-eng` plus the Emil companion set, `design-taste-frontend`, `frontend-design`, `web-design-guidelines`. Those copies were installed on Dany's machine, not in this Cloud Agent environment.
- Highest-value next installs, if Dany wants them: `jezweb/claude-skills` `ux-audit` for live walkthroughs; `firassb/ai-ux-skills` for critique and UX writing; `hannsxpeter/uxauditor` for scored reports. Keep `ui-ux-pro-max` uninstalled after the earlier security-audit warning.

### Decision

- This pass is an audit only. No feature was added, removed, or redesigned. Implementation remains gated on Dany's explicit approval.

## 2026-08-18 — Visit status, applied filters, and cleaner browse/capture

### Added

- Installed local agent skills for this Cloud Agent session (gitignored under `.agents/`): `ux-audit`, `firassb/ai-ux-skills` (writing/critique/accessibility), and `web-design-guidelines`. `ui-ux-pro-max` remains uninstalled.
- First-class Been / Want to try markers on list tickets and detail titles. A place is Been when it has an active rating, visited-by name, or active dish.
- Visit-status chips (All, Want to try, Been) in the list header, with URL/localStorage persistence.
- Dismissible applied-filter chips for search, location, cuisine, price, rating, and visit status. Sheet filters now apply as soon as a select changes.
- `Mark as been` on Want to try detail views. Want to go bookmarks remain separate.
- Mobile dock Add for editors. On phones the top-rail Add is hidden so there is one Add control in the thumb zone; desktop Add place stays in the top rail.
- Add dish moved into restaurant detail actions so it is the next obvious editor action.
- Visited-by names use people pills instead of cuisine styling.
- New restaurant capture keeps Plan it collapsed until the editor opens it.

### Changed

- Places / Map / Pick remain the destination controls. The duplicate list-header list/map toggle was demoted; Map is unchanged through primary navigation.
- Filter badge no longer counts sort. It counts location, cuisine, price, rating, and visit status.
- `Show all` and `Clear all` also reset visit status.

### Not removed

- Want to go, playlists, search, Filters sheet, Apply/Clear, Map, Pick, dish reviews, and capture fields remain available.

### Verification

- Unit coverage for visit-status derivation.
- Browser coverage for visit chips, applied-filter removal, Mark as been, collapsed Plan it for Maps capture, and mobile dock Add.

## 2026-08-18 — Personal Want to go list filter

### Added

- A Want to go chip in the Places header that shows only the signed-in editor's bookmarks. Local-only mode also shows it because Want to go is already available there.
- The chip is independent of All / Want to try / Been, so it can be combined (for example Want to go + Want to try).
- URL `wantgo=1`, the same filter prefs key, a dismissible applied-filter chip, and inclusion in Show all / Clear all / the filter badge.
- Hidden for signed-out and pending users. Their bookmarks are never loaded (existing RLS), so the filter does not run against other people's lists.

### Not removed

- Shared Been / Want to try status, Want to go bookmarking, playlists, and the other browse filters remain.

### Verification

- `npm run check`: 33 unit tests passed.
- `npm run test:e2e`: 40 passed, 4 skipped as designed, including a new personal Want to go filter case on desktop and mobile.
- Stamped this frontend `ae91ff9`. The live Worker still serves `d650d45` until Dany sets `VERSION` to `ae91ff9`.

## 2026-08-18 — Rename Want to try / Want to go

### Changed

- Shared visit status copy is now **Not visited** / **Been**. Capture intent is **Not visited yet** / **Already visited**.
- Personal bookmark copy is now **My list** (Add to my list / On my list / Remove from my list). The header filter chip is **My list**.
- Internal values stay the same: `visit=want`, `wantgo=1`, and table `restaurant_want_to_go`. No schema change.

### Why

- Both old labels started with "Want to", so they were easy to mix up. Not visited is a shared journal fact. My list is a private bookmark.

### Not removed

- Bookmarking, visit-status filtering, Mark as been, and the personal list filter all remain.

### Verification

- `npm run check`: 33 passed.
- `npm run test:e2e`: 40 passed, 4 skipped as designed.
- Stamped `38852fb`. Live preview needs Worker `VERSION` set to `38852fb`.

## 2026-08-18 — Test the UX branch against production Supabase without merging

### Decision

- Dany asked to test the new browse/capture UI with live data and keep a path back to the old design.
- No new Supabase project or paid Preview Branch is required. This change is frontend-only; visit status is derived from existing ratings, visited-by names, and dishes.
- GitHub `main` stays on the current production design (`954c4aa`). The feature branch remains `cursor/ux-flow-improvements-ee5a`.
- The live site is served by Cloudflare Worker `foodlog`, which injects the existing production `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` at `/config.js`. Pointing `REPO` at the feature branch tests that UI against the same database.

### Implementation notes

- Stamped `index.html` and `sw.js` with build id `d650d45`.
- Updated the Worker template so a preview deploy fetches `refs/heads/cursor/ux-flow-improvements-ee5a` with cache-buster `d650d45`.
- Rollback is a Worker switch back to `REPO` `.../FoodLog/main` and `VERSION` `954c4aa`, then Deploy. Pushing `main` alone does not restore `food.danyhanna.uk`.
- Data written during the preview (new places, dishes, ratings, Mark as been) remains in production after the UI is restored. There is no schema to roll back.

### Remaining rollout constraint

- `git push` of this branch does not change the live site until the Cloudflare Worker is redeployed with the preview `REPO`/`VERSION`. Wrangler is not authenticated in this Cloud Agent environment, so the Worker update still needs a dashboard Deploy or a `CLOUDFLARE_API_TOKEN`.

## 2026-08-18 — Cloudflare MCP cannot upload the foodlog Worker

### What was attempted

- Dany approved using the connected Cloudflare MCP to put the UX branch on `food.danyhanna.uk`.
- The MCP is authenticated. `workers_list` / `workers_get_worker_code` returned the live `foodlog` Worker (`id` `0b900dc66f46416fb883ac73f89e64f1`), still fetching GitHub `main` with `VERSION` `954c4aa`.
- Live `https://food.danyhanna.uk` still serves build `954c4aa` (no visit-status chips).

### Cause

- The attached Cloudflare MCP servers (Bindings, Builds, Observability, Docs) can list/read Workers and create KV/R2/D1 resources. They do not expose a Worker script upload or deploy tool. Calling `workers_deploy` failed as not found.
- Earlier FoodLog rollouts used a separate Cloudflare connector that uploaded with inherited `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` bindings (`version_id: "latest"`). That write connector is not attached to this session.
- No `CLOUDFLARE_API_TOKEN` is present, so Wrangler also cannot deploy.

### Follow-up

- A Workers Scripts Edit API token would let a follow-up upload `cloudflare-worker.mjs` from this branch (preview `REPO`/`VERSION` `d650d45`) while inheriting the existing Supabase bindings, then later restore `main` / `954c4aa`.

## 2026-08-18 — Dany deployed the UX Worker preview

### Outcome

- Dany updated the live `foodlog` Worker. MCP `workers_get_worker_code` now shows `REPO` `.../refs/heads/cursor/ux-flow-improvements-ee5a` and `VERSION` `d650d45`.
- `https://food.danyhanna.uk` serves stamped HTML/JS/CSS/SW `d650d45`, visit chips, dock Add markup, applied-filter bar, and a non-empty production `/config.js`.
- Browser check on Places: 29 restaurants loaded; All 29 / Want to try 13 / Been 16; URL `?visit=`; Filters selects apply live and show dismissible chips. Same production Supabase data. GitHub `main` remains the rollback frontend (`954c4aa`).
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

- Dany clarified that the live Cloudflare preview reads `cursor/ux-flow-improvements-ee5a` and explicitly requested that the verified mobile queue fix be published to that branch.
- The fix was carried onto the UX branch without force-pushing or removing its visit-status, My list, mobile Add, filter, or copy improvements.
- Cherry-picked the verified implementation as UX-branch commit `86ce263` (`Fix mobile Safari restaurant queue`).
- Stamped `index.html` and `sw.js` with release ID `86ce263` and updated the UX-branch Worker template cache-buster to the same version.
- Reverified the complete UX branch after integration: `npm run check` passed 33 tests, and `npm run test:e2e` passed 41 desktop/mobile scenarios with five project-specific skips.
- This publication updates the repository source and release template only. It does not upload or deploy the Cloudflare Worker or modify production data, schema, or storage.
- Published UX-branch commits `86ce263` (`Fix mobile Safari restaurant queue`) and `269666d` (`Stamp mobile queue fix release`) to `origin/cursor/ux-flow-improvements-ee5a`, advancing the remote branch from `77c6bec` to `269666d` without force-pushing.
- An immediate live read of `https://food.danyhanna.uk` returned build metadata and asset URLs stamped `86ce263`, confirming that the Cloudflare-served branch resolved the new release files. The deployed Worker script itself was not uploaded or independently inspected during this push.

## 2026-09-04 — Reliability and review-workflow implementation (in progress)

### Audit and skill decisions

- Reviewed the existing Product Design audit, Impeccable, Web Interface Guidelines, Supabase, Cloudflare Workers, and Wrangler guidance before changing the repository.
- Installed the focused `frontend-ui-engineering` and `audit-verify-explain-grade-5` skills.
- Audited the direct `ui-ux-pro-max` skill folder in an isolated temporary checkout. Its runtime uses local files and the language standard library, does not execute network/package-manager/system-install/secret-access/subprocess behavior, and only persists a design system when explicitly asked. Installed that direct skill folder without its npm CLI.
- The initial source and policy audit confirmed that the existing `restaurant_ratings` and `dish_ratings` models support the requested focused workflows without a new table or destructive schema change.
- Production Supabase and Cloudflare settings remain unchanged while implementation and isolated verification continue.

### Review and authentication changes completed so far

- Added a focused restaurant-rating dialog that updates or moves only the signed-in user's `restaurant_ratings` record to Trash; the full restaurant editor remains available and unchanged for place metadata.
- Dish review lists now order the current user's review first, then order remaining reviews by most recent update, and render an explicit updated timestamp.
- Unsaved dish-review rating and notes are stored in `sessionStorage`, restored within the same browser tab, and can be explicitly discarded. Successful saves or Trash moves clear the draft.
- Clarified restaurant and dish metadata actions as `Edit restaurant details` and `Edit dish details`, separate from `Add/Edit your rating` and `Add/Edit your review`.
- Added an owner-only release-bar contract for `danielhanna0001@gmail.com`, using case-insensitive exact matching and build metadata placeholders.
- Added stale-refresh-token recovery that asks Supabase Auth to clear only the local session and reports `Session expired — sign in again`.
- Replaced the universal reduced-motion override with component-specific animation/transition behavior and raised shared form fields and mobile form actions to at least 44px.

### Interim verification

- `npm test -- --run`: 38 unit/source-contract tests passed, including new release visibility/formatting, stale-session recovery, review ordering, and draft parsing tests.

## 2026-09-05 — Reliability, reviews, and automatic-release implementation completed locally

### Mobile rendering root cause and fix

- The final 320px walkthrough exposed another path to the reported blank Places view in addition to the earlier WebKit `content-visibility` issue.
- A saved `panelView: map` preference could be restored while `activeSurface` remained `places`. The page showed the Places header/counts, but `renderList()` followed the Map branch and wrote no restaurant tickets.
- Startup now resolves URL navigation first and otherwise restores the saved Map/List destination into both state fields. Returning to Places renders the full queue. A desktop/mobile browser regression recreates the stale saved preference and verifies Map restoration followed by a three-row Places queue.
- The existing mobile WebKit safeguard remains unchanged, and its regression now runs at 320×844 with 29 rows.

### Completed application changes

- Added focused Add/Edit/Trash/Restore workflows for the current user's restaurant rating using `restaurant_ratings`; the full restaurant editor remains available.
- Ordered dish reviews with the signed-in user's review first, added safe updated-time markup, persisted unsaved review drafts in the current tab, and kept review Trash/restore, owner moderation, full dish editing, and long-press access.
- Added friendly expired-refresh-token recovery, owner-only automatic release labeling for `danielhanna0001@gmail.com`, 44px mobile form targets, and component-specific reduced-motion behavior.
- Added a screenshot-backed audit covering 320px, 390px, 768px, and 1440px light/dark layouts and documented the ranked future backlog without implementing those future features.

### Backend preparation

- Added `20260904171023_optimize_rls_auth_initplans.sql`, a forward-only migration that rewrites only existing public RLS `USING`/`WITH CHECK` auth helpers into cached `select auth.*` expressions.
- Added database contracts for RLS coverage, anonymous reads, editor-owned rating/review policies, owner moderation, recoverable Trash, and ID/count-only public aggregates.
- The local Supabase CLI is available, but `supabase test db --local` could not connect because no local Postgres/Supabase service is running. The migration therefore remains unapplied and production advisors were not rerun.
- Production project `lmkkmzpwsdhlpjugrwjr`, leaked-password protection, data, schema, policies, indexes, and Auth settings remain unchanged pending isolated database verification and Dany's explicit production-rollout approval.

### Cloudflare release preparation

- Replaced the raw-GitHub/manual-`VERSION` Worker source with Workers Static Assets from `dist/`, retained dynamic `/config.js` and Maps resolution, and added the metadata-only `GET /api/health` endpoint.
- Added source-controlled Wrangler configuration for Worker `foodlog`, `ASSETS`, current compatibility date, version metadata, observability, query redaction, and `keep_vars`. The custom domain remains dashboard-managed and is not changed in configuration.
- Builds now stamp ignored `dist/` assets and `release.json` without modifying tracked source. The owner label format is `UX Preview · YYYY.MM.DD · <short SHA>`.
- Documented Workers Builds for production branch `cursor/ux-flow-improvements-ee5a`. No dashboard connection, branch push, Worker upload, custom-domain change, or production deployment was performed.

### Skills and audit result

- Retained Impeccable and Web Interface Guidelines; installed `frontend-ui-engineering`, `audit-verify-explain-grade-5`, and only the audited direct `ui-ux-pro-max` skill folder. The ui-ux-pro-max npm CLI and unrelated MengTo catalog remain excluded.
- The required final Impeccable detector ran once in degraded regex mode because its optional parser modules were unavailable. It reported the existing advisory design-token/type/radius mismatches and no release-blocking error. The existing design sidecar mismatch was left untouched because it predates this change and is advisory.

### Final verification

- `npm run check`: 42 unit/source-contract tests passed.
- `npm run test:e2e`: 47 desktop/mobile scenarios passed; five project-specific scenarios were skipped as designed.
- `npm run cloudflare:check`: tests, build, 23-asset discovery, binding validation, and Wrangler dry-run completed. Wrangler could not write its optional sandboxed debug log but exited successfully.
- `npm audit --json`: zero known vulnerabilities across 236 dependencies.
- Visual checks found no horizontal overflow at 320px or 390px, confirmed restaurant tickets have real layout boxes and `content-visibility: visible` on mobile, and verified focused rating/review forms plus light/dark tablet/desktop layouts.

### Remaining rollout gate

- Do not apply the Supabase migration, enable leaked-password protection, connect Workers Builds, push the branch, or deploy production until Dany explicitly approves the production rollout after reviewing the isolated results and documentation.

## 2026-09-05 — Approved production rollout

### Approval and source publication

- Dany explicitly approved the production Supabase and Cloudflare rollout.
- Published commit `5ce66e6` (`Harden FoodLog reviews and production releases`) to `origin/cursor/ux-flow-improvements-ee5a` without rewriting branch history.

### Supabase production outcome

- Applied the forward-only `optimize_rls_auth_initplans` migration to production project `lmkkmzpwsdhlpjugrwjr`. Supabase recorded it as migration version `20260904222539`.
- Ran the production database security contract inside its rollback transaction; all assertions passed and no test data was retained.
- Re-ran the production advisors. The 42 `auth_rls_initplan` warnings are now zero and all 42 affected policies use cached auth expressions.
- Retained the four intentional `SECURITY DEFINER` aggregate advisories because anonymous browsing needs ID/count-only totals. The contract confirms those functions expose no identities.
- Retained the previously accepted eight unused-index and eleven multiple-permissive-policy advisories; this rollout did not remove indexes or consolidate intentional policies.
- Leaked-password protection remains disabled because Supabase restricts it to paid Pro plans and this project is on Free. No subscription or paid upgrade was authorized or made.

### Cloudflare production outcome

- Replaced the live raw-GitHub proxy Worker with the source-controlled module and Workers Static Assets bundle while preserving the `food.danyhanna.uk/*` route and inherited `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` bindings.
- Enabled `ASSETS`, version metadata, compatibility date `2026-09-04`, query-string redaction, invocation logs, and sampled traces. `/config.js`, `/api/maps/resolve`, and `/api/health` run through the Worker; other files use static assets.
- The first live verification found generic binary MIME metadata on directly uploaded assets. Re-uploaded all assets with explicit browser content types, generated fresh stamped hashes for the HTML and release JSON that had already been consumed, redeployed atomically, and verified the corrected headers live.
- Live checks passed for the app shell, CSS, JavaScript, manifest, offline page, font, runtime configuration, Maps input rejection, and health metadata. `/api/health` returned `status: ok` with the deployed release.
- The immediate rollback target remains deployment `00801734-8542-4b33-93a8-0520e010fdd7` / version `642608e1-9d5d-4cd7-aa80-a9ce46ddcb9d`.

### Remaining account-level setup

- Cloudflare Workers Builds is not connected yet. The authenticated deployment connector can upload and deploy Workers, but it is not authorized to create the user API/build token required by the Builds API, and Wrangler has no local login. Production is live, but future branch pushes will require a manual deployment until Dany connects the GitHub repository in the Cloudflare dashboard or supplies a narrowly scoped build token.
- Enabling Supabase leaked-password protection requires Dany's separate approval for a paid Pro-plan upgrade; the rollout did not incur that cost.

## 2026-09-05 — Astra visit workflow and interface refinement (in progress)

- Created the user-requested `astra` branch from the latest UX branch, preserving all existing capabilities and data paths.
- Added a searchable Log a visit recap with a personal Needs my rating view, restaurant rating, dish review checklist, and an Add dish handoff. It reuses existing owner-scoped rating/review dialogs and save operations; each item saves independently.
- Refined the existing Table Notes design: actionable browse introduction, wider restaurant-name area, horizontal ticket actions, quieter selected rows, and a shorter placeholder hero when a restaurant has no photo.
- No database migration, data reset, restaurant/review deletion, or storage change is part of this task.
- Cloudflare inspection confirms `foodlog` has the existing live Supabase configuration and no Workers Builds trigger. Deployment/linking and browser verification are in progress.

### Verification and corrections

- Full verification passed: 42 unit/source-contract tests, Worker dry-run with 23 static assets, and 53 desktop/mobile browser scenarios (five intentional project-specific skips).
- New recap tests verify independent rating/review saves, unchanged friend reviews, personal review queue updates, search/empty states, correct Add dish destination, 320px fit, and no serious/critical axe violations in the chooser.
- Corrected inherited full-width primary-button styling that squeezed recap text; retained the existing 72px minimum ticket-photo contract.
- Independent visual review identified a placeholder hero aspect-ratio conflict and ambiguous autosave copy. Removed the placeholder's aspect ratio and clarified explicit per-item saving, then recaptured the 320/390/768/1440px light/dark evidence.
- Added protection against an active browse filter redirecting the recap Add dish action to another restaurant: the handoff clears narrowing criteria and playlist before selecting its restaurant.
- The one-time Impeccable detector returned no findings. Production data remains unchanged; deployment is pending final review.
- Final independent reviewer returned **ship** for the new UI scope after reviewing all 12 corrected screenshots and the filtered Add dish handoff.
- The documentation agent hit an account usage limit; the primary agent completed the bounded DESIGN.md merge from source and screenshot evidence. No existing identity or unrelated design guidance was replaced.
- Dashboard GitHub connection was blocked by automatic approval review because it can initiate repository access. Requested explicit approval limited to DanielAshrafHanna/FoodLog and astra deployments; source publication remains authorized.

### Source publication and deployment status

- Published `f18390e` to `origin/astra`; local branch tracks it. The first push failed with HTTP 400; a retry with an increased per-command HTTP post buffer succeeded without rewriting history.
- Built the clean commit as `Astra Preview · f18390e`.
- Final documentation was completed inline because the documentation agent hit the account usage limit; the independent visual review did finish successfully.
- Cloudflare dashboard sign-in succeeded. Automatic approval review blocked the GitHub connection button pending explicit repository-scoped access approval.
- After the resumed session, the Cloudflare connector returned `Auth required` while attempting asset-session registration; no asset upload or deployment succeeded. `wrangler whoami` also confirmed no local authentication.
- Existing live Worker release and database remain unchanged. Remaining work: authorize FoodLog-only Git connection or renew deployment authentication, deploy astra, verify live release metadata and existing collection, and record the completed connection.

## 2026-09-05 — Bounded Luna subagent convention

- Dany approved a repository convention for using `gpt-5.6-luna` with `max` reasoning effort for small, bounded operational tasks such as branch publication, prescribed checks, and release-status collection.
- Subagents must receive a narrow, reviewable task and return evidence. The primary agent remains responsible for implementation choices, user-data or schema work, access grants, deployments, destructive actions, and final verification.
- This is an orchestration convention only; it does not change FoodLog application behavior or data.

## 2026-09-05 — Cloudflare Workers Builds connected to Astra

- Dany approved GitHub access limited to `DanielAshrafHanna/FoodLog` and signed in to GitHub.
- Connected the existing `foodlog` Worker to that repository in Cloudflare Workers Builds. The configured production branch is `astra`; non-production preview builds remain enabled.
- Workers Builds uses `npm ci && npm run check && RELEASE_CHANNEL="Astra Preview" npm run build`, followed by `npx wrangler deploy`. Cloudflare created and selected its managed build token; existing Worker runtime bindings and the `food.danyhanna.uk/*` route were not changed.
- Cloudflare requires a post-connection push to begin the first build. The next source publication will trigger it; release status and live site data still require verification.

### First Astra deployment verified

- The post-connection publication `e351cfe` triggered Cloudflare build `5e9e13aa-16f1-4ed4-ab85-7d5e37bcb27f`. It completed the configured install, 42-check test command, Astra Preview build, and deployment steps successfully.
- Live `GET https://food.danyhanna.uk/api/health` reports `Astra Preview`, build ID `e351cfe`, timestamp `2026-09-05T19:59:20.229Z`.
- Public live verification loaded the revised interface and the existing collection: 29 restaurants, 23 dishes, ratings, playlists, and restaurant detail records. No data, schema, storage, or runtime variables were changed by the release.

## 2026-09-06 — Restaurant and dish logging audit board

- Created and visually verified the Figma audit board: https://www.figma.com/design/I81MxAH9EtktLQlFJYPiEc. It contains the two captured live forms, numbered findings, the proposed connected visit journey, verification results, and limits. No frontend functionality changed.
- Recommended compact restaurant intent controls, earlier dish-review placement, less empty photo space, clearer footer hierarchy, and explicit accessible names for custom people inputs.
- Corrected the initial audit: restaurant creation already presents a post-save Add dish action. Preserve it. Confirmed the actual continuity gap: adding a dish from the visit recap closes the recap and saving does not reopen it.
- Selected existing desktop/mobile browser tests passed: 10/10 covering name-only restaurant creation, restaurant/dish duplicates, draft recovery, repeat dish entry, and recap-to-dish handoff.
- Additional disposable local-browser verification blocked all non-local requests. Created restaurant `8bdce744-9e45-4854-826b-e11334981f29` (AUDIT-20260906-Capture) and dishes `80593c22-bd2d-4dc6-ba30-8d56426e9ae1`, `ed2d35d3-bd3d-42ed-afff-bbaee0ccc4e7`, `c233a6f0-c596-4ee4-aeaf-197ddc442e46`. Verified repeat-entry clearing and absent recap return. Cleared local/session storage to zero keys and closed the disposable context. No production test records or uploaded photos were created.
- Initial extra test used overly similar dish names and correctly hit duplicate protection; its finally cleanup succeeded. Retested with distinct synthetic dishes successfully. Raw evidence and the reproduction script are in `/tmp/foodlog-add-audit/`.
- Figma screenshot uploads initially failed sandbox DNS, then succeeded through approved network access. Both image fills and the rendered board were verified.
- Remaining limits: cloud-write behavior, photo upload, failure recovery, and full screen-reader compliance were not tested. This audit was not deployed; frontend improvements remain separate work.

## 2026-09-06 — Logging form improvements implemented

- Moved restaurant intent below the name and made the choices compact; retained all optional restaurant fields, drafts, duplicate checks, and post-save actions.
- Reordered dish capture to name, rating, review, photo, and people. Empty photo previews are hidden until a photo is selected. Mobile Save dish now spans the footer above Close and Save & add another. All existing actions remain available.
- Dish creation launched from a recap remembers that restaurant. Save or close returns to its refreshed recap with keyboard focus restored; Save & add another stays in the editor. Escape follows draft-preserving close behavior. Opening a duplicate dish retains the recap origin.
- Added accessible names to people/playlist entry inputs and aria-pressed state to selectable chips, including newly entered names.
- Verification: 42 unit/source checks passed. Full browser run passed 55 scenarios with five intentional skips; two new checks initially had an ambiguous test locator, fixed by scoping it to the recap. All 10 Astra desktop/mobile scenarios then passed, including repeat entry, recap return, cancelled-draft restoration, chip state, and no serious/critical automated accessibility findings in dish capture.
- Visual checks at 320, 390, and 1440px verified form fit. Corrected a narrow footer that squeezed Save dish and kept optional labels inline. The layout detector returned no findings in degraded regex mode; it could not evaluate computed contrast. Screenshots are in `/tmp/foodlog-capture-redesign/`.
- No production data, schema, or storage operations were performed. Changes are ready for publication to the existing astra deployment branch.

## 2026-09-07 — Guided capture and shared photo galleries (in progress)

- Replaced the single long restaurant and dish editors with three focused steps while retaining every existing field, draft, save, repeat-entry, duplicate, and recap action. Optional steps can be skipped by saving early; editing can jump between steps.
- Added restaurant photos during capture without changing visit state, multi-photo dish capture, a separate photo-only contribution form, and keyboard/swipe gallery navigation with contributor labels. Legacy photos remain visible with unknown attribution.
- Prepared an additive migration for dish_photos, server-stamped contributor names, immutable restaurant-photo attribution, authenticated owner-path checks, and realtime updates. Extended transactional imports to carry dish galleries. No production schema or data changes have been made yet.
- Implemented upload IDs/path reuse for retries and save controls that lock during requests. Corrected a navigation overlap caused by the old three-row editor grid; changed the guided container to a flexible vertical layout.
- Local PostgreSQL rollback tests passed for two contributors on one dish, spoofed attribution, unauthorized paths, unapproved writes, denied edits/deletes, hidden trashed-parent photos, and unchanged legacy photo paths. Tests use a dedicated empty local database with mocked auth helpers; full Supabase integration remains to verify.
- Luna MAX was dispatched for a bounded test-failure report but hit its account usage limit before returning findings. The primary agent is completing that work.
- Current changes remain local. Browser integration and final visual review are in progress; existing tests are being updated to navigate the newly separated optional steps.

### Verification and database rollout

- Full browser regression suite passed: 65 desktop/mobile scenarios; five intentional viewport-specific skips. Guided-step accessibility tests wait for transitions and check the active dialog; they report no serious/critical axe findings at 320px.
- New tests verify two restaurant photos before a visit, multi-photo dish creation/repeat entry, contributor browsing with keyboard/swipe, unchanged existing friend reviews, and choosing a cover while preserving the legacy photo. Added lost-response upload retry tests.
- Applied the additive shared_dish_photos migration to FoodLog. No existing row was deleted or rewritten. The schema includes a separate dish cover pointer so changing the visible photo preserves every previous image.
- Ran a transaction-only integration test on the migrated Supabase database using a simulated approved role. Verified server attribution, owner-path enforcement, cover selection, public gallery reads, and hiding galleries when a parent is trashed. Rolled back all synthetic records: restaurant 67ae1042-06cb-41c2-b34a-b812bcfc3a20, dish 5d73d9d8-a8e0-483b-bcc3-ffea71208802, photo row 735cc7b8-a5c4-486c-b27d-97c1e25dd197. Confirmed zero remain; no test storage objects were uploaded.
- Production counts before and after match: 30 restaurants (29 active), 24 dishes (23 active), 18 restaurant photos (13 active), 25 dish reviews, 17 restaurant ratings (16 active). The new dish gallery table is empty pending real contributions.
- Supabase security advisor reported no new gallery-function warnings. Existing aggregate RPC SECURITY DEFINER advisories and disabled leaked-password protection remain unchanged.
- Captured corrected guided screens at 320, 390, and 1440px in light/dark modes under .impeccable/review/. The one-time detector used degraded regex mode; it flagged a dynamically populated gallery image as missing src and design-token advisories, including inherited CSS. It did not assess computed contrast. Independent visual review is pending.

### Independent review corrections

- The independent reviewer requested recapture after identifying a desktop gallery width mismatch: the inner card was 900px inside a 720px dialog. Corrected parent/child sizing and added a browser assertion for heading, attribution, and previous-button bounds.
- Corrected photo-bearing dish-card layout so the gallery cover no longer consumes the entire horizontal row and squeezes reviews. Photos and dish content now stack within the card.
- Simplified mobile footers by keeping Close in the header, moving Discard draft beside its restored-draft message, and retaining Save, Save & add another, Continue, and Back. Moved restaurant context into the dish heading, centered themed intent radios, and replaced photo glyphs with inline SVG icons.
- After these fixes, all 20 affected browser scenarios passed. The unit suite now has 48 passing checks, including importing name-first restaurants and rejecting malformed gallery arrays.
- Verified the exact new public nested gallery query against production: HTTP 200, 29 restaurants and 23 active dishes. The isolated local PostgreSQL test database was dropped after rollback verification. No uploaded test objects exist.
- Corrected screenshots, including six synthetic gallery/contribution states, have been sent for a fresh full visual review. Frontend publication remains pending that review.

### Final publication readiness

- The independent reviewer could not finish its recheck after reaching the model usage limit. The primary agent completed the Impeccable review and documentation inline; this is not an independent final approval. Reviewed corrected light/dark captures at 320, 390, and 1440px. Local disposition: ship.
- Reduced gallery image height to reserve space for attribution and navigation; recaptured all three gallery widths and confirmed complete controls. DESIGN.md now records guided capture and shared-gallery behavior without changing the established visual identity. Generated PNG evidence remains local.
- Verification totals: 48 unit checks; 65 browser regression scenarios with five intentional skips, followed by 20 affected scenarios after review corrections. Final gallery smoke follows the height adjustment.
- Existing records and legacy photos remain intact. Production integration used rolled-back synthetic rows only; local browser fixtures were disposable. No production test photos were uploaded.
- Release is prepared for the already configured astra → Cloudflare Workers Builds pipeline. Live build identity and public data loading will be verified after publication.

### Guided capture release verified

- Published implementation commit ba83d10 to origin/astra. Cloudflare automatically deployed it; live health reports Astra Preview, build ba83d10, built 2026-09-07T09:32:20.983Z.
- Read-only live smoke passed: both new JavaScript modules return HTTP 200, restaurant rows render, and no page JavaScript errors were observed. The exact nested public gallery query returns HTTP 200 with 29 restaurants and 23 active dishes.
- Final gallery tests passed on desktop and mobile after reserving vertical room for navigation. This follow-up commit records release evidence only.

## 2026-09-07 — Backend reliability audit

- Completed read-only production catalog, function, advisor, Storage-reference, duplicate-group, and public-request checks; report: docs/BACKEND_RELIABILITY_AUDIT_2026-09-07.md. No production data/settings changes and no test records created.
- Confirmed all 17 public tables have RLS; active collection remains 29 restaurants/23 dishes. All database-referenced photo paths have Storage metadata. Three of 44 stored objects have no current journal-table reference; left untouched because provenance is unknown.
- Reproduced local-only dish loss during reconciliation using pure synthetic in-memory data. Identified missing parent-save idempotency, stale metadata overwrite risk, incomplete upload lifecycle recovery, refresh-await semantics, and uncaught cache-storage errors. These are audit findings, not implemented fixes.
- Three nested public reads returned HTTP 200, 33,224 bytes, at 412/185/177ms; this is a spot sample only. Existing advisor warnings remain documented rather than removing intentional permissions/indexes.
- Delegated bounded check/coverage inventory to gpt-5.6-luna at max reasoning. It completed npm run check successfully: 48 tests and syntax checks passed. SQL/cloud integration tests are separate from that command.
- Backup retention and photo-copy/restore status remain unverified. Recommended prioritized work: durable pending saves and safe retries, conflict-aware updates and upload reconciliation, then diagnostics and isolated release/restore checks. No backend implementation or deployment was performed in this audit.

## 2026-09-07 — Reliable place and dish saves

- Added a per-account durable operation queue for restaurant and dish metadata/review saves. Each operation and entity receives a stable UUID before the network request. Queued changes survive reloads, remain isolated from other signed-in accounts, and retry after access restoration or an online event.
- Cloud reconciliation now merges pending dishes into an existing restaurant instead of replacing them with a stale server copy. Pending places retain their existing behavior. The interface labels unsynced dishes and explains how many saves are waiting.
- Added two security-invoker RPCs backed by private, owner-readable operation receipts. A committed request replay returns its original entity ID without applying the restaurant, dish, rating, review, or bookmark mutation twice. Existing save RPCs remain available for older clients.
- Changed the display-cache write to best effort. A browser quota/security error after cloud acknowledgement is reported as a device-cache problem and no longer throws a generic cloud-save failure.
- Created migrations with the Supabase CLI. The main migration and two advisor follow-ups are forward-only and do not delete or rewrite existing journal rows. A proposed policy simplification was rejected by automatic approval review and was not applied; the final policy retains approved-editor enforcement and caches the complete JWT value correctly.
- Rollback validation called each reliable RPC twice with different second payloads. It produced one synthetic restaurant, one dish, one rating, one review, and two receipts while retaining the first payload. The transaction rolled back; the four fixed synthetic IDs and all receipts were verified absent.
- Production counts before and after remained 31 restaurants, 24 dishes, 18 restaurant ratings, 25 dish ratings, 19 restaurant photos, and zero dish photos. These totals include Dany's current data and were not modified by the test.
- New advisor findings were resolved: the receipt foreign key has a covering index and no auth RLS initialization-plan warning remains. Existing unused-index and overlapping-policy advisories remain unchanged.
- Verification before publication: 54 unit/source checks pass, including four queue tests and pending-dish reconciliation. The full browser regression passes 65 desktop/mobile scenarios with five intentional viewport skips. Durable binary photo queuing and conflict-aware metadata edits remain the next reliability phases.
- Published implementation commit `2dec3ab` to `astra`; Cloudflare deployed it as Astra Preview at `2026-09-07T20:55:41.581Z`. Read-only live smoke loaded 29 active restaurant rows, served the new reliable-sync module with HTTP 200, reported the expected build ID, and observed no page JavaScript errors.

## 2026-09-08 — FoodLog logo and installable app icon refresh

- Replaced the previous FoodLog mark with Dany's supplied 1254×1254 transparent bowl-and-leaf artwork. The header uses a transparent 256px derivative so the mark sits naturally on both themes.
- Regenerated the existing 16px, 32px, 180px, 192px, 512px, and ICO app/browser assets with an opaque warm-cream background. The original artwork remains unchanged in composition and is centered with safe padding.
- Split regular and maskable PWA icons instead of declaring one file for both purposes. Added dedicated 192px and 512px maskable files with extra safe-zone padding so Android launchers can crop them without cutting off the bowl, leaves, or steam.
- Updated the document favicon, Apple touch icon path, web manifest, service-worker precache, product documentation, and regression contract. No application workflow or data behavior was removed or changed.
- A bounded Luna MAX inventory subtask was attempted under the repository convention but hit its account usage limit. The primary agent completed the asset/reference inventory and verification.
- Verification passed: 55 unit/source checks, 65 desktop/mobile browser scenarios with five intentional viewport skips, and a Cloudflare dry-run that discovered all 29 built assets and the expected bindings. Wrangler could not write its optional sandboxed debug log but completed the dry-run.
- Local browser captures at 390×844 and 1440×900 confirmed the transparent header mark loads at its intrinsic 256×256 size and renders at 38px mobile / 40px desktop without layout shift or overflow.
- The final Impeccable detector found no logo-specific defect. It repeated existing page-wide contrast, dynamic empty-src gallery image, decorative depth/pattern, optional-label repetition, and design-token advisories. The stop hook's two cramped-padding findings were verified as false positives: the brand inherits top-rail padding and the snapshot intentionally uses padded divider rows. Its two repeated-container-text findings were the separate “(optional)” requirement markers on different fields. Added file-scoped detector exceptions for only those two rules in `index.html`; no visual or form guidance was removed.
- Production deployment was not inferred from the asset replacement request. Dany subsequently explicitly requested publication to `astra`; the reviewed logo commit is being published through the existing Cloudflare Workers Builds pipeline.
- Published implementation commit `f0d855c` to `origin/astra`. Cloudflare Workers Builds completed automatically and production health reported `Astra Preview · f0d855c` at `2026-09-08T08:41:44.518Z`.
- Final read-only production checks returned HTTP 200 and `image/png` for the transparent 256px header mark, opaque 192px/512px regular icons, 192px/512px maskable icons, and 180px Apple touch icon. The live manifest contains separate `any` and `maskable` declarations and the live HTML references the new header logo.

## 2026-09-08 — Guided logging hierarchy and mobile detail polish

- Refined the guided restaurant and dish editors so every step has one clear primary action. The first restaurant step now leads with `Save place` and offers `Add details`; the first dish step leads with `Save dish` and offers `Add my review`. Later steps use specific forward labels, and `Save & add another` appears only on the final Photos step. Early save, Back, Close, drafts, duplicate protection, repeat entry, and recap return all remain available.
- Simplified mobile restaurant detail around the two frequent actions: `Log visit` is the single full-width primary action, with `Add dish` and `Add rating` immediately below. Less frequent actions move into an accessible full-width `More` sheet containing Maps, list membership, visit status, Share, playlists, and Edit. Escape and Cancel restore focus to the opener. Desktop actions remain directly visible.
- Reordered mobile restaurant detail so dishes appear before the photo gallery. Added a one-time swipe-back hint, then stored its acknowledgement locally so it does not become recurring interface noise. Reduced-motion users do not receive the animated fade.
- Moved build/release diagnostics from the main top rail into Settings, where owner-facing technical information is available without competing with everyday navigation. Initial theme now follows the device preference until the person chooses and saves a theme.
- Added explicit photo attribution for current and legacy restaurant/dish images. Known contributors display as `Photo by <name>`; old photos remain intact and clearly state that contributor information is unavailable. No restaurant, dish, review, rating, photo, schema, or Storage record was changed.
- Improved semantic icons, sheet scrolling, touch targets, light/dark contrast tokens, and neutral elevation. Removed colored glow effects from interactive surfaces. Automated accessibility now treats contrast violations as release failures.
- Updated regression coverage for guided step labels and action visibility, repeat dish entry, legacy attribution, mobile More behavior, hidden utility actions, Escape focus restoration, and contrast. Verification passed: 56 unit/source checks; 65 desktop/mobile browser scenarios with five intentional viewport-specific skips; Cloudflare dry run with 29 assets and expected bindings; and a final Impeccable detector run with zero findings and no new suppressions.
- Wrangler could not write its optional debug log outside the sandbox during the dry run, as previously observed, but completed asset discovery and dry-run validation successfully. Publication to the configured `astra` branch and live read-only verification follow this local validation.
- Published implementation commit `f3553ff` to `origin/astra` through the bounded Luna MAX operational subtask. Cloudflare Workers Builds deployed it automatically as Astra Preview at `2026-09-08T14:25:29.152Z`.
- Read-only live verification confirmed the expected `f3553ff` build and the unchanged collection baseline of 29 active places and 23 active dishes. No production write, schema operation, manual Worker deployment, or test-data creation was performed.

## 2026-09-09 — Simpler restaurant actions and honest dish count

- Dany identified eight competing desktop restaurant actions and explicitly requested removal of the misleading Dishes logged progress card.
- Extended the existing More action sheet to desktop: the header now exposes Log a visit, Add dish, personal rating, and More. Maps, bookmarks, visit status, sharing, playlists, and editing remain available through the existing permission-aware sheet.
- Removed the dish-count statistics card and arbitrary progress calculation. The count now appears beside the Dishes heading; average restaurant rating remains unchanged.
- Verified 56 unit/source checks and 65 desktop/mobile browser scenarios (five intentional viewport skips). Local visual checks at 1440px and 390px confirmed four header actions and working More sheets. No production records or schema were touched.

### Maps-first restaurant action

- Dany confirmed that the guided recap should remain available but no longer occupy the primary restaurant-detail position. Renamed the global entry to `Review a meal`, moved the restaurant-specific entry into More as `Review this visit`, and promoted `Open in Maps` into the previous primary-action position.
- Restaurants without a Maps link promote Add dish so the detail view still has a clear primary action. The recap workflow, restaurant rating, dish reviews, and add-dish handoff remain unchanged.
- Verification passed: 56 unit/source checks and 67 desktop/mobile browser scenarios with five intentional viewport-specific skips. Impeccable reported no deterministic findings, and visual checks at 1440px and 390px confirmed the Maps-first hierarchy and the Review this visit action inside More.
- Published implementation commit `7ef323b` to `origin/astra`; Cloudflare deployed it automatically as Astra Preview at `2026-09-08T23:16:32.413Z`. Read-only live verification showed Open in Maps in the restaurant action area, More beside it, the Dishes heading count, and the unchanged collection baseline of 29 active places and 23 active dishes.

## 2026-09-09 — Contributor-owned editing and contextual dish actions

- Dany approved moving dish creation beside the Dishes section, replacing the always-visible dish edit button with a compact action menu, and using a hold gesture as an optional shortcut to the same menu. The visible buttons remain the accessible primary path.
- The in-progress UI keeps personal reviews and photo contributions available on every dish. Editing restaurant or dish metadata, choosing its main photo, and trashing a restaurant photo are now shown only to the original contributor or the exact FoodLog owner account, `danielhanna0001@gmail.com`.
- The existing `user_id` ownership columns are populated on all 31 restaurant rows, 25 dish rows, 19 restaurant-photo rows, and one dish-photo row in production; no ownership backfill or journal-row rewrite is needed. These totals include recoverable records.
- Created the forward-only `20260908233203_enforce_contributor_ownership.sql` migration with the Supabase CLI. It replaces broad editor update rules with contributor-or-owner rules for restaurants, dishes, restaurant photos, and photo-object paths. It contains no journal data update, delete, or truncate operation and has not yet been applied while implementation verification is in progress.
- The Supabase connector's automatic approval review rejected the production migration because the Codex account reached its tool-usage limit. No migration statement was applied. The frontend and migration remain reviewable in the branch, but database-enforced ownership is still pending until the connector becomes available or Dany applies the migration manually.
- Local verification passes 58 unit/source checks and 71 desktop/mobile browser scenarios with five intentional viewport skips. Focused interaction coverage confirms the contextual Add dish control, first-dish empty action, compact menu, focus restoration, and hold shortcut. Visual captures at 1440×1100 and 390×844 confirmed the desktop and mobile hierarchy. Cloudflare's dry run discovered all 29 assets and expected bindings; its optional sandboxed log write was denied as before, without failing the dry run.
- Published implementation commit `bacf2e8` to `origin/astra` after Dany's explicit confirmation. Cloudflare Workers Builds deployed it automatically as Astra Preview at `2026-09-09T08:37:57.693Z`; live HTML, JavaScript, and CSS contain the dish action sheet, contextual Add dish control, first-dish action, hold shortcut, and client ownership guard.
- Read-only post-deployment counts remain 31 total / 29 active restaurants, 25 / 23 dishes, 18 / 16 restaurant ratings, 27 / 25 dish ratings, 19 / 14 restaurant photos, and one dish photo. The app deployment did not mutate any of those rows or files. The production database policies remain unchanged because the ownership migration is still pending.

## 2026-09-09 — Simpler dish reviews and swipeable, recoverable photos

- Consolidated each dish card into a photo carousel, one tappable review summary, and More. The summary opens all reviews and the existing personal review editor; holding it opens the same sheet. More combines the previous Read/Edit review choices into one Reviews entry, preserving Edit dish details and Add photos. Cards without photos no longer spend space on a large placeholder; Add photos remains in More.
- Added native horizontal scroll snapping with attribution per slide, position feedback, and keyboard/mouse controls. Tapping opens the selected image in the existing gallery. Photo swipes do not trigger mobile Back navigation. The expanded gallery supports pinch/double-tap zoom, an explicit zoom button, keyboard zoom/panning, drag panning, and normal swipe/arrow navigation when unzoomed. Navigation resets zoom; closing returns focus to the card.
- Added contributor-owned Move to Trash in the gallery. A new RLS-protected `dish_photo_removals` table stores recoverable markers for both legacy and shared images; original dish/photo records and Storage files remain intact. Restore removes only the marker. The server resolves the original uploader and stamps the removal actor, ignoring supplied attribution. Unknown legacy uploaders are manageable only by the exact owner account. Request failures retain the displayed image and allow retry; duplicate submissions are prevented.
- Applied the previously pending contributor-ownership migration and the new removal-marker migration through Supabase. A separate forward-only policy follow-up resolves three JWT evaluation advisories introduced by the older migration. New marker policies and triggers have no public security-definer function. Existing aggregate-function, password-setting, unused-index, and overlapping-policy advisories remain outside this change.
- Local SQL allow/deny tests cover approved contributors, another contributor, the owner, anonymous access, and unapproved access. A cloud integration transaction verified shared contributions, own removal/restore, cross-user rejection, owner moderation, and intact originals/reviews. Its synthetic IDs end in `49201` (place), `49202` (dish), and `49203` (photo); the full IDs are recorded in `supabase/tests/dish_photo_removal_integration.sql`. The transaction rolled back and all five cleanup counts were zero. No test image was uploaded.
- Production totals before/after match: 31 restaurants, 25 dishes, 18 restaurant ratings, 27 dish ratings, 19 restaurant photos, 2 shared dish photos, and 47 Storage objects. Zero photo-removal markers remain from verification.
- Verification: 63 unit/source tests; 77 desktop/mobile browser scenarios with five intentional skips, plus one actual mobile touch-input scenario (desktop intentionally skipped). Coverage includes review consolidation/hold/keyboard access, selected-photo opening, zoom/reset/pan, gallery accessibility, denied removal, duplicate-submit prevention, reload persistence, and Trash restoration. Desktop/mobile visual checks caught and fixed grid-based image sizing on desktop; final images fit the gallery viewport. Impeccable reports zero deterministic anti-patterns; existing design-system advisories remain.
- Used a bounded gpt-5.6-luna MAX subagent for test/operational inventory. Primary agent implemented UI and database changes and performed database integration verification. Release validation and publication follow.
- Final Wrangler release validation passed: syntax/unit checks, production asset build, and Worker dry run (29 assets with expected bindings). Wrangler's optional log-file write hit the existing sandbox restriction; the dry run itself succeeded. The browser suite and real-touch scenario total 78 passing scenarios with six intentional viewport skips. No production record/file counts changed during verification.
- After Dany's destination-specific approval, Luna MAX pushed `c36c26b` to `origin/astra`. Cloudflare Workers Builds deployed it as Astra Preview at `2026-09-09T13:31:46.756Z`.
- Read-only live verification loaded 29 active places, advanced a dish carousel to photo 2 of 2, opened and decoded the selected image, enabled zoom, and opened the combined reviews sheet. Photo removal was hidden when signed out, and the page reported no JavaScript errors. No live content or Storage mutation was performed during publication checks.

## 2026-09-09 — Restore camera capture for dish photo contributions

- Restored a visible `Take photo` action to the existing-photo contribution dialog, alongside `Choose photos`. The camera input requests the device's rear-facing camera where supported; the library input retains multi-photo selection.
- Both sources feed the same validated contribution queue, previews, retry-safe upload path, attribution, and contributor ownership rules. No restaurant, dish, review, photo record, Storage object, or database schema was changed.
- Verification passed: 63 unit/source checks and the complete 78-scenario desktop/mobile browser suite with six intentional viewport skips. The contribution regression selects one synthetic image from the camera input and one from the library, confirms both previews, then preserves the established four-photo shared gallery result. Visual checks at 390px and 1440px confirmed two clear, equal 48px source controls with no horizontal overflow. Impeccable found no new deterministic anti-pattern.
- Cloudflare release validation discovered all 29 assets and the expected Worker bindings. Wrangler could not write its optional debug log outside the workspace sandbox, as previously documented, but the dry run completed successfully.
- Published implementation commit `11fda00` to `origin/astra`; Cloudflare Workers Builds deployed it as Astra Preview at `2026-09-09T13:46:29.348Z`.
- The Worker initially served the updated release and cache-busted HTML while Cloudflare's normal root URL still returned an older cached page shell. After Dany signed in, performed a URL-scoped purge for `https://food.danyhanna.uk/`; Cloudflare accepted it and the normal public URL now includes `Take photo`, `photoContributionCameraInput`, `capture="environment"`, and `Choose photos`. The purge changed cached delivery only and did not touch application data or Storage.

## 2026-09-09 — One global Add entry and contextual reviews

- Dany explicitly removed the Review a meal feature because restaurant and dish reviews are clearer when entered from the restaurant they describe. Removed the home action, searchable visit-recap dialog, recap return plumbing, and Review this visit entry from the place More sheet.
- Kept one responsive global Add place action: the existing top-rail button on desktop and the existing bottom-navigation Add button on mobile. No duplicate Add button was added to the browse introduction. Restaurant pages retain contextual Add dish, restaurant-rating, dish-review, photo, and More actions.
- Updated the design contract and browser regressions for the simpler information architecture. Local verification passed 63 unit/source checks and 72 desktop/mobile browser scenarios with six intentional viewport skips. Focused coverage confirms one visible global Add action at either viewport, direct restaurant and dish contribution paths, and absence of the removed recap surfaces.
- A local semantic browser inspection confirmed the browse introduction contains only its heading and supporting copy, while an open restaurant still exposes Maps, Add your rating, Add dish, and More. Impeccable reported zero deterministic anti-patterns; its existing design-system advisories remain outside this focused removal. No restaurant, dish, review, rating, photo, schema, or Storage data was changed.
- Cloudflare release validation completed the application build and Worker dry run with all 29 assets and expected bindings. Wrangler's optional debug-log write hit the existing sandbox restriction, but the dry run itself succeeded.
- Luna MAX published implementation commit `6fcce5a` to `origin/astra`; Cloudflare Workers Builds deployed it as Astra Preview at `2026-09-09T14:57:19.343Z`. Read-only live checks confirmed both normal and cache-busted pages omit the removed recap controls and retain the responsive `dockAddButton` and `quickAddButton` entries.

## 2026-09-09 — Herb and ceramic surface palette

- Added restrained color roles to the existing Table Notes identity. Restaurant browsing now uses cool herb surfaces for the list, tickets, selection, placeholders, and place-level information. Dish collections use a warm clay group surface, clean ceramic cards, a deeper warm review surface, and a WCAG-compliant clay accent for ratings and Add dish.
- Added two lightweight 144px SVG ceramic-speckle tiles for light and dark themes. The sparse green/clay or linen/amber marks texture grouped restaurant and dish surfaces without overlaying food photography, controls, or text and without imitating aged paper. Both assets are included in the PWA application shell for offline use.
- Added semantic light/dark surface tokens and documented their hierarchy in `DESIGN.md`. The visual distinction supplements existing headings, borders, and labels; color is not the only information cue. No application behavior, workflow, restaurant, dish, review, photo, database record, schema, or Storage object changed.
- Visual inspection covered light desktop restaurant and dish surfaces plus dark mobile detail. Additional 375px portrait and 844×390 landscape checks found no horizontal overflow or undersized visible detail actions. Measured new text pairs range from 4.78:1 to 16.78:1, meeting WCAG AA for normal text.
- Verification passed 63 unit/source checks and 72 desktop/mobile browser scenarios with six intentional viewport skips. Impeccable reported no deterministic anti-patterns for the new CSS or texture assets.
- Cloudflare release validation completed the production build and Worker dry run with 31 assets and the expected bindings. Wrangler's optional debug-log write hit the existing sandbox restriction, but the dry run itself succeeded.
- Luna MAX published implementation commit `a60ecc3` to `origin/astra`; Cloudflare Workers Builds deployed it as Astra Preview at `2026-09-09T19:08:27.547Z`.
- Read-only live verification confirmed the normal public page references `styles.css?v=a60ecc3`, the deployed stylesheet contains the restaurant and dish surface tokens, and both light and dark ceramic-speckle SVG assets load successfully. No application data or Storage content was read or changed during this release check.

## 2026-09-09 — Quieter restaurant list planning actions

- Dany explicitly requested removing the repeated My list and Playlists buttons from every restaurant row because they were not useful while scanning the list.
- Restaurant rows are now single selection targets. A saved place retains its small bookmark status mark, playlist membership remains readable as metadata, and the group rating remains at the row edge.
- My list and playlist management remain available through the selected restaurant's visible More menu. Holding a row or right-clicking remains an optional shortcut to that same accessible action sheet; it is not the only path.
- Removed the obsolete list-action hint, row-action rendering/event branches, and unused row-action styles. Updated the design and regression contracts plus browser coverage for the simplified hierarchy.
- Verification passed 63 unit/source checks and 72 desktop/mobile browser scenarios with six intentional viewport skips. The new regression confirms both planning buttons are absent from rows, My list remains reachable through restaurant actions, its filter still works, and playlist management remains visible in More. Impeccable reported no deterministic findings.
- The first browser run served the previous `dist` bundle and therefore still found the old row controls. Rebuilding `dist` resolved the test-environment mismatch; the complete rerun passed. Cloudflare release validation then rebuilt the app and completed a Worker dry run with 31 assets and expected bindings. Wrangler's optional debug-log write hit the existing sandbox restriction, but the dry run itself succeeded.
- No restaurant, dish, review, rating, playlist membership, bookmark record, photo, schema, or Storage object was changed. Publication to `origin/astra` follows this local validation.
- Luna MAX published implementation commit `e9c545e` to `origin/astra`; Cloudflare Workers Builds deployed it as Astra Preview at `2026-09-09T19:25:56.454Z`.
- Read-only live verification confirmed the normal public page references `app.js?v=e9c545e`. The deployed restaurant-row template contains the optional bookmark mark and rating, with no row-level My list button, Playlists button, obsolete hint, or row-action helper. No production data or Storage content was changed during the release check.

## 2026-09-09 — Matte and sculpted card surfaces

- Implemented Dany’s approved visual direction: unoutlined matte trays, shallow card depth, coordinated nested corners, and recessed clickable reviews. Preserved all content, controls, and workflows.
- Refined the existing theme-specific ceramic assets into deterministic fine grain; kept texture off detail text areas and photographs. Updated the existing food-surface CSS block and design contract without new dependencies.
- Verification: 63 unit/source checks passed. The full browser run passed 71 scenarios with six intentional viewport skips; its sole failure asserted the old visible row borders. Updated that visual contract to check opaque surfaces and depth while retaining touch, spacing, and scroll assertions; the targeted mobile rerun passed (72 scenarios verified in total).
- Inspected local light/dark screenshots at 1440px, 768px, 390px, and 375px with multiple cards, long names, missing photos, carousel controls, and populated/empty review summaries. No horizontal overflow was measured. Used a local logo image as the synthetic media fixture; existing gallery regressions cover photo interactions.
- Worker dry run passed with 31 assets and expected bindings. The existing optional Wrangler debug-log sandbox warning did not fail validation. `git diff --check` passed. No application data, schema, or Storage changes were made. Publication to `astra` follows.
- Luna MAX published implementation commit `1470eb1` to `origin/astra` without force. Cloudflare built Astra Preview at `2026-09-09T19:55:26.389Z`. Read-only live checks confirmed the normal page references this build and the deployed CSS and both grain assets match the committed files byte-for-byte.

## 2026-09-09 — Restaurant rating shortcut and unobstructed photo actions

- Moved the existing personal rating shortcut into the Average rating heading, using an underlined star-and-text treatment. Kept direct access because approved editors can rate restaurants they cannot edit.
- Replaced oversized photo Trash labels with accessible 44px icon controls and moved all photo management actions/status into a normal-flow footer. Removed the mobile fixed card aspect ratio so attribution determines its own height. Preserved gallery, cover selection, ownership checks, and recoverable Trash behavior.
- Verification passed: 63 unit/source checks, 72 desktop/mobile browser scenarios with six intentional viewport skips, and the Worker dry run with 31 assets. Added geometry assertions for image/caption/footer separation and 44px Trash targets; rating access remains covered through save/edit/remove flows.
- Visual checks in both themes at 1440px, 768px, 390px, and 375px confirmed readable long/legacy credits, unobstructed photo controls, and the quieter rating shortcut. No horizontal overflow was measured. `git diff --check` passed. No data, schema, or Storage changes were made. Publication to `astra` follows.

## 2026-09-09 — Optional review with dish photos and stronger review typography

- Added an opt-in personal review section to dish photo contributions, reusing the existing half-star picker and personal review upsert. Existing reviews prefill for explicit editing; photo-only saves leave all reviews untouched.
- Validate the optional rating before uploading. Photos retain the existing retry-safe queue; if review saving fails after photos succeed, keep the dialog and review values and permit a review-only retry without reuploading photos.
- Prioritized review prose with bold primary text and more spacing in both previews and the full sheet; timestamps remain secondary. A successful combined review save clears the same user/dish standalone draft so older text cannot overwrite it on the next edit.
- Verification passed: 63 unit/source checks and 76 desktop/mobile browser scenarios with six intentional viewport skips. The initial full run had one mobile test-helper failure because a selected URL restored detail after reload; corrected the helper and the entire guided suite passed. Final combined-save and simulated-review-failure checks passed on both viewports, including validation before uploads, existing-review prefill/update, draft cleanup, photo-only behavior, and no duplicate uploads on retry.
- Light/dark visual checks at 1440px, 390px, and 375px confirmed readable review hierarchy, accessible optional fields, reachable save controls, and no page/dialog horizontal overflow. Worker dry run passed with 31 assets; the recurring optional debug-log sandbox warning did not fail validation. No production content, schema, or Storage writes were performed during verification.

## 2026-09-10 — Quick add for missing location and cuisine

- Replaced the missing-field shortcuts’ full-editor navigation with a compact single-field dialog. Reused existing suggestions and new-value registration, with keyboard focus, validation, Cancel, and Save.
- The cloud save patches only the selected field plus audit metadata, under existing ownership/RLS rules. Local saves preserve other restaurant data and roll back the in-memory patch if device storage fails. Cloud/offline or pending-sync saves retain input with a clear retry message; the full editor and its offline behavior remain available.
- Added duplicate-submit locking and focus restoration. Verification passed: 63 unit/source checks and 80 desktop/mobile browser scenarios with six intentional viewport skips. Coverage includes both fields, existing suggestions and new values, unchanged ratings/dishes, reload persistence, empty input, cancellation/focus restoration, and a simulated save failure with duplicate-submit prevention and successful retry.
- Corrected a test locator syntax error before running the suite. Visual review caught an inherited mobile primary-button grid span; the scoped quick-editor rule now keeps Cancel and Save side by side. Final targeted tests passed on desktop/mobile, and light/dark screenshots at 1440px, 390px, and 375px showed no dialog/page overflow.
- Worker dry run passed with 31 assets and expected bindings; its recurring optional debug-log sandbox warning did not fail validation. `git diff --check` passed. No production content, database schema, or Storage objects were changed during verification.

## 2026-09-10 — Calmer guided form hierarchy

- Shortened restaurant and dish step headings and supporting copy, removed the redundant name helper, and retained all fields, save paths, and disclosure controls.
- Segmented Maps lookup in a quiet tonal surface; reduced helper weight and action size, removed empty status spacing, and separated visit status with a fine rule. Shared step typography is smaller and more consistent. Photos and rating guidance use concise copy.
- Rebuilt before verification. Passed 63 unit/source checks, 80 desktop/mobile browser scenarios (six intentional skips), and the Worker release dry run (31 assets; optional user-log sandbox warning only). Captured 24 restaurant-step screenshots across light/dark themes at 1440, 768, 390, and 375px; automated overflow checks passed. Inspected representative mobile/desktop Place, Details, and Memories views. Initial screenshot fixtures restored a draft notice; cleared fixture storage between cases and repeated capture.
- No dependencies, data model, permissions, or production content changed. Existing draft recovery and field behavior remain intact.

## 2026-09-10 — Dish photo upload recovery

- Investigated a live “Failed to fetch” report while saving a dish with photos and a review. Read-only database checks confirmed the dish and review had already saved; the photo upload was the failing stage, with no photo rows created.
- Added bounded retries for transient upload network failures. Permission and validation errors still fail immediately.
- The dish editor now distinguishes a later photo failure from a dish failure: it confirms that the dish and review are saved, keeps selected photos in the open editor, and changes the primary action to “Retry photos.” Opening or resetting the editor restores the normal “Save dish” label.
- No production records, schema, policies, or Storage objects were modified during diagnosis.
- The first browser regression run exposed a missing cached reference for the Save dish button, which prevented the dish editor from opening. Added the reference before publication and repeated verification.
- Final verification passed: 65 unit/source checks, 80 desktop/mobile browser scenarios with six intentional viewport skips, `git diff --check`, and the Worker release dry run with 31 assets. The recurring optional Wrangler user-log sandbox warning did not fail validation.

## 2026-09-10 — Photo progress and restaurant review text

- Added an accessible progress strip to restaurant capture, dish capture, and dish photo contribution. It reports the current photo, overall percentage, completed count, completion, and paused state while the existing sequential, retry-safe queue runs.
- Added an optional written review to the focused restaurant rating editor. Personal restaurant rating rows now display review prose with strong emphasis and a secondary timestamp, matching the dish review hierarchy.
- Added `restaurant_ratings.notes` as non-null text with an empty default through a tracked migration, then verified the live column. Existing RLS policies continue to govern the same rating row; no access or ownership rules changed. Full restaurant edits preserve an existing personal review when they update the score.
- Updated the existing security-invoker backup import function to retain personal restaurant review text. Verified the live function remains security invoker and includes the notes column; no production content was written during schema verification.
- Visual inspection covered light/dark themes at 1440px, 390px, and 375px for the review editor, saved review rows, and Photos-step progress state; no dialog overflow was found.
- Final verification passed: 65 unit/source checks, 80 desktop/mobile browser scenarios with six intentional skips, `git diff --check`, and the Worker release dry run with 31 assets. The migration column check passed; database advisors reported only pre-existing project warnings unrelated to this column.

## 2026-09-10 — Merge Astra into main and move production builds

- Dany requested promoting the reviewed `astra` work to `main` and changing the existing Cloudflare Workers Builds production branch from `astra` to `main`.
- `main` contained two unique mobile Safari queue commits and `astra` contained 53 newer commits. Merged `astra` into `main` with a merge commit so both histories and the WebKit queue workaround remain intact.
- Resolved the browser-test conflict by retaining the stricter 320px long-queue viewport. Combined both branches' factual publication history in this log.
- Merge verification passed: 65 unit/source checks, 80 desktop/mobile browser scenarios with six intentional viewport skips, `git diff --check`, and a Worker dry run with 31 assets and the expected bindings.
- Cloudflare's production-branch change requires the authenticated dashboard under Worker `foodlog`, Settings > Build > Branch control. The dashboard session reached GitHub sign-in and awaits Dany's account authentication before that external setting can be changed.
- Changed the source-controlled default release channel from `UX Preview` to `Main`, so ordinary production builds identify themselves as Main in the owner-only Settings release label and `/api/health`. The Cloudflare production build command must also stop overriding this value with `Astra Preview` when its branch setting is moved to `main`.
- An authenticated in-app Cloudflare session became available. Saved Worker `foodlog` with production branch `main` and build command `npm ci && npm run check && RELEASE_CHANNEL="Main" npm run build`. The repository, deploy/version commands, non-production build setting, managed token, runtime bindings, observability, and `food.danyhanna.uk/*` route were preserved.
- Published merge commit `7f84152` and the focused source-label commit `3d78613` to `origin/main`. The following documentation-only main commit is the first push made after saving the new branch control and therefore triggers the Main production build.
- Cloudflare Workers Builds completed the first production deployment from `main`. Live `GET https://food.danyhanna.uk/api/health` returned `status: ok`, channel `Main`, build `0f96a8e`, and timestamp `2026-09-10T13:06:18.212Z`. Existing runtime bindings and the custom route remained active; no application data, schema, or Storage content changed.

## 2026-09-10 — Architecture: smoother navigation and photo delivery

- Dany asked for a smoother, faster navigation flow that can handle many photos, while staying on free services and keeping every existing feature and visual.
- Verdict: the vanilla JS + Supabase + Cloudflare stack is the right fit. The roughness came from full-size photos in list tickets, full list/detail `innerHTML` rebuilds, `replaceState`-only history (phone Back left the site), and full-collection realtime reloads. A React rewrite was not done; it would not fix those issues by itself and would put the 80 browser regressions at risk.
- Phase 1: additive nullable `thumb_path` on `restaurant_photos`, `dish_photos`, and `dishes`. New uploads also write a 480px JPEG sibling. List/carousel/grid use the small copy when present and fall back to the original. The nested select detects a missing column so production keeps working until Dany approves the migration. Owner Settings can backfill existing photos after that. `sw.js` cache-first caches public `plate-photos` GETs (300 LRU) and still skips Auth/REST.
- Phase 2: `pushState` when a mobile place opens or Places/Map/Pick changes; `popstate` restores the snapshot. Filter edits and OAuth stripping stay on `replaceState`. View Transitions run only when the browser supports them and reduced motion is off.
- Phase 3: `render()` skips unchanged chrome/list/detail via fingerprints. Restaurant rows are reconciled by `data-id` so decoded images stay. Map markers are reused by restaurant id. Realtime events debounce 400ms and refetch only affected restaurant ids.
- Phase 4: selected photo Files go to IndexedDB with a reserved storage path; uploads run two at a time; `createImageBitmap` is used for compression when available. Detail-panel restaurant photos use the same retry-safe persist path when cloud-ready. No new 12/20MB limits were added to that path.
- Phase 5 (optional module split of `app.js`) was not done. New helpers live in `lib/photo-delivery.js`, `lib/navigation.js`, `lib/render-list.js`, and `lib/photo-queue.js`.
- Free-tier: no paid plan required. Supabase image transformations stay unused (Pro-only). Thumbs are created in the browser.
- Production schema, Storage objects, and the live Worker are not changed by this branch. Cloudflare production remains `main`.
- Map/Pick Back initially left the site: `saveFilterPrefs()` `replaceState`d the new `view=` URL before the surface `pushState`. History now promotes a surface or place-open change to `pushState` even when the caller asked to replace, writes the surface entry before persisting filters, and restores from the URL when `history.state` is missing. OAuth/share URL cleanup keeps the `foodlog` history state instead of replacing it with `{}`.
- Targeted `render()` skips were too narrow: restaurant and dish review edits, photo trash, and visit filters could leave stale DOM. Detail fingerprints now include ratings, dishes, and photo removals; list/detail paint again when filters change. Local rating and photo-trash writes bump `updatedAt`. Dish carousels allow horizontal touch pan so a real swipe changes photos. Verification: 79 unit/source checks, 85 browser scenarios with 7 intentional skips, Worker dry-run with 35 assets.

## 2026-09-10 — Apply additive thumb_path columns; Worker still on main

- Dany asked what “do not apply the thumb_path SQL until you say so” meant, and asked to test the architecture branch on the live Worker without deleting data.
- That sentence only meant the SQL was optional for local preview. The frontend already falls back to original photos when `thumb_path` is missing or empty. It was not a warning that the SQL would wipe the journal.
- Applied `photo_thumb_paths` on production FoodLog (`lmkkmzpwsdhlpjugrwjr`). The change is additive: `ADD COLUMN IF NOT EXISTS thumb_path text not null default ''` on `restaurant_photos`, `dish_photos`, and `dishes`; contributor thumb-update RLS; dish-photo identity trigger; storage INSERT policy so the owner can write sibling thumbs. No `DELETE`/`TRUNCATE`/`DROP` of application rows or Storage objects.
- Migration history lists the name twice (`20260910171916` and `20260910171947`) because apply was recorded twice. The second run is `IF NOT EXISTS` / replace-policy only. Schema has one `thumb_path` column per table.
- Post-apply counts match the pre-apply inventory: restaurants 33/30 visible, dishes 26/24 visible, restaurant_photos 20 (all `thumb_path=''`), dish_photos 9, restaurant_ratings 21, dish_ratings 30, Storage `plate-photos` 55 objects / 17,810,725 bytes.
- Public REST through the live publishable key still returns 30 restaurants and 24 dishes. `GET https://food.danyhanna.uk/` is HTTP 200. `/api/health` remains `Main · 59f4ef2` (`2026-09-10T13:08:23.107Z`).
- Workers Builds already built branch commit `452303e` as a non-production version (`9fc5e829-132c-42b6-95f3-6efae84e8645`, build `b81ba4c4-5f28-4e42-b140-da867c1e185b`). Deploy command for non-prod is `npx wrangler versions upload`, so `food.danyhanna.uk` is unchanged.
- Linking Worker `foodlog` production branch to `cursor/architecture-refactor-3eb1` needs Cloudflare dashboard or a deploy token. This session has no `CLOUDFLARE_API_TOKEN`; `wrangler whoami` is logged out; Cloudflare MCP `mcp_auth` reports success then immediately `needsAuth` and exposes no Worker tools; the dashboard login page has no existing session. Runtime bindings and `food.danyhanna.uk/*` were not modified.
- Rollback for the frontend remains Main `59f4ef2`. The new columns can stay; they do not hide or remove existing photos. Owner Settings backfill would only add sibling `*-thumb.jpg` files and is not run until Dany asks.

## 2026-09-10 — Architecture branch review and live test connection

- Reviewed `cursor/architecture-refactor-3eb1` against `main` at `59f4ef2`. The branch is a focused architecture improvement: responsive thumbnails reduce image transfer and decode work, IndexedDB preserves queued photo files, two-at-a-time uploads reduce save time, keyed row reconciliation avoids unnecessary image/DOM replacement, targeted realtime refreshes reduce collection reloads, and browser history now restores place, Map, and Pick surfaces.
- Confirmed the change preserves existing workflows and keeps Supabase image transformations unused. The additive `thumb_path` migration is already present in production and original-photo fallbacks remain available for rows without thumbnails.
- Verification passed: 79 syntax/unit checks; 85 applicable desktop/mobile browser scenarios with seven intentional device/viewport skips; the touch-swipe case passed a separate ten-run repeat; and the Worker dry run packaged 35 assets with the expected `ASSETS` and `CF_VERSION_METADATA` bindings. Wrangler's optional user-log sandbox warning did not fail the dry run.
- Saved Cloudflare Worker `foodlog` with production branch `cursor/architecture-refactor-3eb1` and build command `npm ci && npm run check && RELEASE_CHANNEL="Architecture Preview" npm run build`. Deploy/version commands, root directory, non-production builds, managed token, runtime variables, observability, and route remain unchanged.
- The first post-configuration push, `b285af7`, completed successfully and became the 100% active Worker version `7765e66d`. Live `/api/health` returned `status: ok`, channel `Architecture Preview`, build `b285af7`, and timestamp `2026-09-10T18:45:32.478Z`; the authenticated app also loaded its shared journal successfully from the custom domain.

## 2026-09-10 — Preserve the selected restaurant after mobile Back

- Fixed the architecture preview regression where opening any restaurant other than the first and returning to Places restored the old default selection. The detail history entry contained the tapped restaurant, but the underlying list entry still contained the initial restaurant.
- Before pushing a mobile detail entry, the app now replaces the current list history entry with the tapped restaurant and captured list scroll position. Returning through the visible Back action, a swipe, or the browser Back button restores that row and moves keyboard focus to it without replacing the existing row node.
- Added a regression that opens the second restaurant and verifies the selected id, focus, URL, mobile detail state, and DOM-node identity after browser Back. The original test failed against the reported behavior, then passed five consecutive runs after the fix.
- Final verification passed: 79 syntax/unit checks and all 85 applicable desktop/mobile browser scenarios, with seven intentional device/viewport skips. No application data, schema, permissions, or Storage objects changed.

## 2026-09-10 — Restore interrupted photo selections into their forms

- Fixed the architecture preview gap where IndexedDB retained selected photo files after a reload but the app only showed a toast and never returned them to an upload queue.
- Restaurant, dish, and dish-contribution selections now record their exact destination and signed-in editor. Opening the matching form recreates the previews and lets the existing upload flow continue. New restaurant and dish selections are re-keyed to the saved record id before upload, including reserved Storage paths after an interrupted attempt.
- Switching to another form releases only temporary object URLs, preserving the saved selection for its original destination. Removing a visible selection now also removes its IndexedDB record. Settings shows a device-local recovery summary and an explicit discard action for the current editor plus older unowned queue entries; entries belonging to another signed-in editor stay hidden and untouched.
- Empty destination ids are now exact queue scopes, so a new dish selection cannot be restored into an existing dish. The existing local fallback, ownership rules, upload concurrency, retries, progress indicators, and photo limits are unchanged.
- Verification passed: 81 syntax/unit checks; 87 applicable desktop/mobile browser scenarios with seven intentional device/viewport skips; the focused reload/restore/remove regression passed again after final cleanup; `git diff --check`; and the Worker dry run with 35 assets. Wrangler's recurring optional user-log sandbox warning did not fail the dry run. No production data, schema, Storage objects, Worker settings, or `main` branch changes were made.

## 2026-09-10 — Ignore macOS Finder metadata

- Added a repository-wide `.DS_Store` ignore rule on the architecture branch and removed the three untracked Finder metadata files from the local main checkout. No application code or behavior changed, and `main` was not modified.

## 2026-09-10 — Keep playlist selector height stable

- The playlist ticket grew when an editable playlist was selected and shrank on All places because the manage button used `hidden` (`display: none`).
- The manage control now keeps a reserved 44px slot. On All places and Unsorted it stays invisible, disabled, and out of the tab order; on an editable playlist it remains the same size and still opens rename/Trash.
- No playlist, rename, or Trash behavior was removed. Added a desktop/mobile Playwright contract that All places and Date night keep the same playlist-bar height.
- Verification: 81 unit/syntax checks; focused height tests passed on desktop and mobile Chromium; browser pass confirmed 292px height for All places, Date night, and Favorites, and the manage dialog still opens from Favorites.

## 2026-09-10 — Keep playlist and filter chrome from resizing

- Applying search or sheet filters inserted a full-width Show all row in the playlist ticket and a separate applied-filter band above the hero, so the playlist box grew and shrank the same way All places did.
- Show all now shares the existing 44px playlist header slot with the place-count hint. Applied filter chips join the visit-status row. The Filters badge stays overlaid on the button instead of changing its width.
- Show all, removable chips, Clear all, and the filter sheet still work. No filter action was removed.
- Verification: 81 unit/syntax checks; desktop/mobile Playwright height tests passed for search narrowing and stacked playlist filters; browser pass kept playlist height at 292px and list-header at 44px for search and Korean cuisine, with Show all and remove-chips still available.

## 2026-09-10 — Smoother filter state in the playlist ticket

- Dany found the previous treatment abrupt: the count text was swapped for a bordered "Show all N" button (so the count disappeared), applied chips looked identical to the visit toggles, and every state change hard-cut.
- `#playlistShowAllButton` is now one control that holds `#playlistFilterHint`. At rest it is `disabled`, plain muted text ("3 places"). When search or filters narrow the list it gets `is-active`, an `--accent-soft` tint, keeps the count ("1 of 3 places") and fades in a "Show all" label; `aria-label` is set only while active so the rest state is announced as the count. Tone changes over 180ms ease-out.
- Desktop (Table Notes column): the control is a full-width footer line under the playlist list; the header column was too narrow for count + action and overflowed into the list. Mobile (`max-width: 980px`): `.playlist-bar` becomes a two-column grid so the control sits in the header row as a pill beside the label, with the label collapsing via `max-width` and a "·" separator.
- Manage pencil and Filters badge now fade/scale with a `visibility` delay instead of snapping; applied chips are tinted accent chips with an SVG × (no unicode glyph) and a 200ms entrance. `renderAppliedFilters()` only rebuilds when the chip set changes (`data-signature`), so the entrance does not replay on realtime refreshes. All new motion is zeroed under `prefers-reduced-motion`.
- No functionality removed: Show all, removable chips, Clear all, badge count, and the filter sheet behave as before.
- Verification: 81 unit checks; full Playwright run 60 passed / 6 pre-existing skips on desktop and mobile Chromium. Height test now measures the pencil slot with `offsetWidth/offsetHeight` because the faded state is scaled. Browser pass in dark and light themes, desktop and 412px viewport: ticket height identical at rest and narrowed.

## 2026-09-10 — Remove dish rating hint copy

- Dany asked to remove the “Half-star steps · tap, slide, or use arrow keys.” line from the edit dish menu.
- Deleted that `<p class="star-input-hint">` from `#dishModal` only. Stars, half-step buttons, Clear rating, and the matching hint on the add-place visit section are unchanged.
- The same sentence remains on the restaurant capture rating field until Dany asks to remove it there too.
- Verification: opened Edit dish → Your take; stars, ±½, review, and liked-by remain, and the half-star hint is gone.

## 2026-09-11 — Even capture footer buttons on phones

- Dany flagged the Edit restaurant footer: Back was a 52px stub, Save place took leftover width, and Add memories was a full-width cream button of a different size. The same mismatch showed on Add dish → Photos.
- Phone capture footers now use a 44px full-width stack so every remaining action is the same size. Close stays in the header.

## 2026-09-11 — Remove capture footer Back

- Dany asked to remove the footer Back control from restaurant and dish editors because it did not fit and was not important. Explicit approval recorded here.
- `createCaptureGuide` no longer creates `.guide-back`. Place / Details / Memories and Dish / Your take / Photos remain the way to open an earlier step. Save, Continue (Add details / Add memories / Add photos), Save & add another, Close, and Discard draft are unchanged.
- Phone footers are a single column of 44px buttons. DESIGN.md now says step tabs, not a footer Back, are the return path.
- Verification: Edit restaurant Details footer is Save place + Add memories, both 356×44, no Back. Playwright mobile tests pass for tab return to Details and equal-width stacked footers.

## 2026-09-11 — Restaurant editor footer is Save only

- Dany asked to remove the Add details and Add memories footer buttons from the restaurant editor and keep Save. Explicit approval recorded here.
- Restaurant `createCaptureGuide` now uses `showNext: false`, so those Continue labels are not created. Place / Details / Memories tabs still switch sections. Save place stays on every step as the primary footer action. Dish Continue labels (Add my review / Add photos) and Save & add another are unchanged.
- Verification: Edit restaurant Details shows only Save place; Playwright uses the Details and Memories tabs instead of the removed buttons.

## 2026-09-11 — Playlist rename created a second playlist

- Dany reported that changing a playlist name in Manage playlist created a new playlist instead of renaming the existing one.
- Cloud cause: `rename_foodlog_playlist` rewrote restaurant memberships first. The `restaurants_sync_lookups` trigger then inserted the new name while the old catalog row still existed, and contributor RLS could skip restaurants the current editor does not own. Local cause: after a device-only rename, `loadLookups()` merged the still-remote old name with the new local name.
- Fix: new migration `20260911013000_fix_playlist_rename.sql` renames the catalog row first, then updates every member restaurant as `SECURITY DEFINER`. Trash/restore use the same rights. Client rename now replaces the lookup name in place, checks duplicates case-insensitively, and keeps the original name if the form is still open.
- Verification: 82 unit/syntax checks passed. Playwright renamed Date night to Friday dinner and kept the same member places without leaving Date night behind. Cloud `rename_foodlog_playlist` is now SECURITY DEFINER and updates the catalog row first.

## 2026-09-11 — Remove duplicate Manage playlists action

- Dany asked to remove Manage playlists because it opened the same Edit restaurant flow. Explicit approval recorded here.
- Removed the More-sheet Manage playlists item and the desktop detail Playlists button. Playlist membership still changes in Edit restaurant → Details. The playlist rail pencil still opens rename and Trash.
- Verification: 82 unit/syntax checks passed. Playwright confirmed restaurant rows and the More sheet have no Manage playlists control, while Edit restaurant details remains.

## 2026-09-11 — Remove Pick our next place

- Dany asked to remove the Pick / group-decision feature. Explicit approval recorded here.
- Removed the Pick nav item, Pick our next place panel, new-session dialog, local decision helpers, and remaining vote/session wiring. Places and Map stay. Old `?view=pick` links open Places.
- Verification: 79 unit/syntax checks passed. Places and Map remain; Pick nav and session tests were removed.

## 2026-09-11 — Rebuild the phone bottom dock after Pick removal

- Dany reported empty space in the bottom bar. Cause: the phone dock used a fixed `repeat(3, 1fr)` grid (`repeat(4, 1fr)` with Add) sized for Places / Map / Pick, so removing Pick left one empty column in every state.
- New dock: two equal destination tabs (Places, Map) plus, for editors, an Add action in an `auto` column so nothing is left blank. Tabs carry drawn SVG icons (list, pin, plus) with `aria-hidden`; accessible names stay exactly "Places", "Map", and "Add place". Dock is 16px radius / 6px padding with 10px item corners (concentric), 48px targets, 15px labels. Add is styled as an action, not a tab: `--accent-soft` fill, accent text, 1px inset ring, so it never competes with the active forest tab. Nav items gained `:active` scale(0.98), a two-layer `:focus-visible` ring, and a pointer-gated hover.
- Desktop rail is unchanged: `.primary-nav-icon` is `display: none` outside the phone breakpoint and `.primary-nav-item.dock-add` stays hidden there. The base `.dock-add` rule was made more specific because the new `display: inline-flex` on `.primary-nav-item` had started showing a second Add place on desktop.
- Verification: 79 unit/syntax checks passed. Screenshots at 390px: light with Add, dark with Map active, and visitor (no Add) all fill the dock with no gap. Playwright `foodlog.e2e.spec.js` 58 passed; the mobile touch-controls test now asserts the SVG icon instead of the old `+` text.

## 2026-09-11 — Stabilize dish review focus and card photo swipe

- Mobile review-sheet Escape and dish-photo swipe tests failed intermittently. Cause: sheets restored focus to a stored node that a later `renderDetail()` had replaced, and one `requestAnimationFrame` lost the race to the dialog's own focus restore. The swipe test also acted while the place-open view transition was still remounting `.dish-photo-track`.
- Fix: `closeDishReviewsSheet`, `closeDishActionSheet`, and `closeDishReviewModal` re-query the live dish control and focus it after two animation frames. Guided-capture tests wait for the detail panel (and a still-attached photo track) before asserting focus or sending the swipe.
- Verification: `npm run check` plus Playwright `foodlog.e2e.spec.js` and `guided-capture.e2e.spec.js` on both desktop and mobile projects.

## 2026-09-11 — Numbered capture steps and in-app Maps search

- Dany asked for numbers on the Add restaurant top bar so Place / Details / Memories read as separate sections, and for a way to add a Google Maps link without leaving the app to copy a URL. Paste-a-link stays.
- Capture tabs now show a 1–2–3 index (`aria-hidden`); the accessible name remains the section label so existing Place / Details / Memories / Dish controls are unchanged. Dish uses the same numbered rail.
- Add restaurant Maps card has Find on Maps search plus the existing paste field. `POST /api/maps/search` proxies Photon and builds a `/maps/place/Name/@lat,lng,17z` URL. Choosing a result fills the link and uses the existing Check/Apply preview. Worker and local `server.mjs` both serve the route.
- Verification: unit/syntax checks plus Playwright for numbered tabs, search-to-link, and the existing paste/Check link path.

## 2026-09-11 — Batch 1 visual audit fixes

- Started the frontend audit implementation with the low-risk visual batch only. Capture-tab gating, mobile detail order, hover gating, and filter URLs were left unchanged.
- `.hero-panel` now shows only on Places when the journal has no active places and is not loading. Populated Places no longer opens with the display thesis.
- Restaurant/dish name placeholders are hints (`Place name…`, `Dish name…`); Maps search uses `Search a place…`.
- Focus ring tokens now match DESIGN.md: Pass Forest `#174A3B` in light and Warm Amber `#F39A1F` in dark so the ring meets 3:1 on the canvas.
- Find on Maps / Check link stay at 44px. The viewport meta includes `viewport-fit=cover` so existing safe-area padding applies on notched phones.
- `.visit-status--want` uses Prep Surface and Quiet Ink. Purple remains on My list only.
- Map empty copy distinguishes “no link” from “link exists but is not pin-able” via `mapPinStatusHint`.
- Auth, OAuth, `sw.js`, Trash, playlist RPCs, and Worker search were not touched.
- Verification: `npm run check` 85 passed. Rebuilt `dist/` (`4375838-dev-72c5w`) and walked Places, Add restaurant, Map, and a 390px Places view in the live preview. Hero stays `display: none` when places exist; first mobile ticket sits under chips/playlists only (no thesis block). Placeholders are `Place name…` / `Search a place…` / `Dish name…`. Find on Maps and Check link measure 44px. Not visited is Prep Surface / Quiet Ink; My list bookmark stays purple. Map hint reads “2 places have Maps links that are not pin-able yet…”. Focus tokens are `#174a3b` light and `#f39a1f` dark. Focused Playwright could not launch in this agent environment (sandbox/host browser mismatch); the e2e assertions for hidden hero and `Place name…` are in place for the next local run.

## 2026-09-11 — Batch 2 capture tabs, hover, and sheets

- Capture tabs and dish Continue can open a later step without a name. `createCaptureGuide` no longer calls the name `validate` gate on `go()`. Save still uses `showFormValidation` (`Restaurant name is required.` / `Dish name is required.`) and the submit listener still reveals the invalid field.
- Hover fills and lifts for tickets, actions, chips, and sheets reset on coarse / no-hover pointers so a tap does not leave sticky hover. Fine-pointer hover is unchanged.
- Filter, More, dish-action, and review sheets now `overscroll-behavior: contain`. Reduced motion skips the sheet slide-up.
- Auth, OAuth, `sw.js`, Trash, playlist RPCs, and Worker search were not touched.
- Verification: `npm run check` 87 passed (`tests/capture-guide.test.js` covers unlocked tabs/Continue and required Save). Rebuilt `dist/` (`4375838-dev-7h2qi`) and walked the live preview on `http://127.0.0.1:4183`. Empty Add restaurant can open Details and Memories; Save place stays on Place with the name `invalid` and “Please fill out this field.” Empty Add dish can open Your take and Photos, and Continue (Add my review) advances without a name; Save dish returns to Dish with the same required-name state. `#filterSheet` / `.sheet-card` / `.sheet-body` compute `overscroll-behavior: contain`. With `prefers-reduced-motion: reduce` emulated, `.sheet` computes `transform: none` and `transition-duration: 0s`. Playwright could not launch in this agent environment; the e2e case `opens Details and Memories before a name, then Save still requires the name` is in place for the next local run. Hover gating is CSS-only (`@media (hover: none), (pointer: coarse)`); it was not re-proven on a coarse pointer in this session.

## 2026-09-11 — Batch 3 capture footer, playlist chips, and Filters label

- Restaurant capture footer Close is hidden at every width so the footer matches DESIGN Save-only. Header Close still dismisses the dialog. Dish footer Close is unchanged on desktop and remains header-only on phones.
- Playlist chips are exclusive filter chips (`role="group"` + `aria-pressed`), matching visit chips. The invalid tablist / tab / aria-selected markup is gone. Switching a playlist still filters the same ticket list; rename, counts, and Show all are unchanged.
- The Filters control keeps its visible “Filters” label at ≤620px. `aria-label="Open filters"` is unchanged.
- Auth, OAuth, `sw.js`, Trash, playlist RPCs, and Worker search were not touched.
- Verification: `npm run check` 87 passed. Rebuilt `dist/` (`4375838-dev-7qj1z`) and walked the live preview. Add restaurant footer is Save place only (`#cancelRestaurantButton` computes `display: none`); header Close still dismisses the dialog. Playlist switcher is `role="group"` with `aria-pressed` chips; Date night still filters to Silkroad and Gaya and shows rename. At 390px the Filters label is visible (99×44, no horizontal overflow) and still opens the sheet. Playwright could not launch in this agent environment; e2e now asserts Save-only restaurant footer, visible Filters text at 390, and `aria-pressed` playlist chips.

## 2026-09-11 — Batch 4 mobile detail, naming, and filter URLs

- On phones, a place with no restaurant ratings now shows dishes and photos before the empty ratings block. Desktop order is unchanged. Places that already have ratings still show ratings first. The empty-ratings sentence no longer says “above.”
- User-facing app name is FoodLog on the document title, home-screen title, and manifest. Table Notes stays the header subtitle and design-system name. `plate-log-*` storage keys and `plate-log-build` were not renamed. New approval notes say “Approved from FoodLog.”
- Filter URLs were already written by `browseUrl` / `loadFilterPrefs`. That path is now `browseQueryValues` + `writeBrowseQuery`, which leave `?code=` / error URLs untouched. `writeBrowseHistory` still returns early when `hasOAuthParams()` is true.
- Honest Map empty copy was already shipped in Batch 1. Auth, OAuth, `sw.js`, Trash, playlist RPCs, and Worker search were not touched.
- Verification: `npm run check` 88 passed. Rebuilt `dist/` (`4375838-dev-7xh03`) and walked the live preview. Home-screen / apple title and heading are FoodLog; subtitle stays Table Notes. On Untried Noodle Bar at 390px, dishes (y≈484) then photos (737) then ratings (1107); empty copy is “Use Add your rating to share your score.” On Silkroad at 390px, ratings stay first (y≈506 / 648) then dishes (911). Desktop Silkroad is still ratings (≈535) then dishes (≈1090). Not visited writes `/?visit=want`. Playwright could not launch in this agent environment; e2e now asserts the phone empty-ratings order, Silkroad ratings-first order, and `visit=want`.

## 2026-09-11 — Batch 5 capture errors, reduced motion, and phone scroll-padding

- The original audit only listed batches 1–4. Batch 5 is the leftover confirmed a11y/craft items: product capture-error copy, complete reduced motion, and phone focus clearance around the dock.
- `formValidationCopy` uses the product fallback when a required field is empty (`Restaurant name is required.` / `Dish name is required.`). Type mismatches still use the field’s native `validationMessage`. Capture forms already have `novalidate`; Save still blocks empty names.
- Reduced motion now also skips ticket-badge rotation and press `scale(0.98)`. Sheet slide-up was already skipped in Batch 2.
- At ≤980px, `html` scroll-padding matches the sticky rail and dock so focused controls are not hidden under author chrome.
- Dual `:root` token cleanup, list virtualization, cursor-on-buttons, and Worker pin geocoding were left unchanged. Auth, OAuth, `sw.js`, Trash, playlist RPCs, and Worker search were not touched.
- Verification: `npm run check` 90 passed. Rebuilt `dist/` (`4375838-dev-85fzb`) and walked the live preview. Empty Save place shows “Restaurant name is required.” and keeps the dialog open with the name invalid/focused. Empty Save dish shows “Dish name is required.” With `prefers-reduced-motion: reduce`, the press/badge rule computes `transform: none`. At 390px, `html` scroll-padding is 118px top / 86px bottom. Playwright could not launch in this agent environment; e2e now asserts the restaurant product error copy.

## 2026-09-11 — Commit frontend audit batches 1–5

- Dany asked to commit and push the uncommitted audit work on `cursor/architecture-refactor-3eb1`. Auth, OAuth, `sw.js`, Trash, playlist RPCs, and Worker search remain untouched.
