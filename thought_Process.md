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
- Stamped the corrected frontend and Worker with cache version `20260724a`.
- After the Picker query correction, `npm run check` passed 15 tests and `npm run test:e2e` passed 14 tests with two intentional project-specific skips.
