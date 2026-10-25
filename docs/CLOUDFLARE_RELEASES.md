# Current Cloudflare release runbook — 25 October 2026

Worker `foodlog` serves [food.danyhanna.uk](https://food.danyhanna.uk). Workers Builds is connected to `DanielAshrafHanna/FoodLog`. Dany authorized publishing `design3.0` and switching production from `design2.0` on 25 October 2026. GitHub publication of source `9c94006` and the saved Cloudflare production-branch/build settings are verified. A fresh push after the settings change starts production rollout; verify live health separately. The previous live source and rollback branch are `design2.0` / `eeb4917`, with Worker version `434dfaac` (build `a5634af3-978b-453e-8174-938643fb233a`).

This section supersedes the older `main`, Astra, Stable Beta, proxy/Worker VERSION, and deployment instructions preserved below. Current deployment packages the Worker and `dist/` static assets atomically. Do not manually edit a Worker VERSION, paste a GitHub URL into Worker code, or commit `dist/`.

## Desired production configuration

- Production branch: `design3.0`
- Build command: `npm ci && npm run check && RELEASE_CHANNEL="Design 3.0" npm run build`
- Production deploy command: `npx wrangler deploy`
- Repository root: `/` (the repository root)
- Keep the existing custom domain, runtime variables/secrets, bindings, preview behavior, and `keep_vars` unchanged.
- This release includes no database migration or production-data modification.

## Switch branches manually

1. Open Cloudflare Dashboard → **Workers & Pages → foodlog → Settings → Build → Branch control**. Cloudflare may label the settings group **Builds**.
2. Edit the production branch, choose the desired existing GitHub branch, and Save.
3. In Build configuration, use the matching build command below. Keep production deploy command `npx wrangler deploy` and the existing root directory.
4. Start a **production build from the desired branch**. A new push to that branch starts one automatically. Saving the branch alone does not replace live traffic. If using a dashboard build/retry action, confirm its source branch and commit match the desired release; retrying an old build from another branch is not a branch switch.
5. Wait for the build and deployment to succeed. Open [health](https://food.danyhanna.uk/api/health): `status` must be `ok`, and `release.channel` / `release.buildId` must match the intended label and commit. Verify the website, stamped HTML, service worker and assets agree.

| Desired branch | Build command |
|---|---|
| `design3.0` | `npm ci && npm run check && RELEASE_CHANNEL="Design 3.0" npm run build` |
| `design2.0` (previous UI) | `npm ci && npm run check && RELEASE_CHANNEL="Design 2.0" npm run build` |

No merge into `main` is needed. Merely pushing `design2.0` when it has no new commits will not trigger a build. Use a dashboard production build for that branch, or publish a new commit on that branch.

## Immediate rollback

In **foodlog → Deployments**, choose a known-good successful Design 2.0 production deployment and use its rollback action. Verify health afterward. Also change **Settings → Build → Branch control** back to `design2.0` and restore the Design 2.0 build command so future pushes follow the restored branch. Rolling back a deployment alone does not change the configured Git branch.

The two UI branches use the same database. UI rollback preserves restaurant data but does not undo any real edits made while the newer UI was live. Never clear browser storage as a routine rollback step; it may contain unsynced work.

Official references: [Build branches](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/) and [Build configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/).

---

# Historical release configuration (superseded)

The following notes are historical evidence, not current instructions.

# Cloudflare release setup

## Repository configuration

- Worker: `foodlog`
- Production branch: `main`
- Worker entry point: `cloudflare-worker.mjs`
- Static asset directory and binding: `dist/` as `ASSETS`
- Worker-first routes: `/config.js` and `/api/*`
- Runtime variables: preserved with Wrangler `keep_vars`; secrets are never written to `dist/` or `/api/health`
- Observability: invocation logs and traces enabled with query-string redaction
- Custom domain: intentionally omitted from `wrangler.jsonc`, so the existing dashboard-managed domain remains unchanged

The build writes stamped files only to ignored `dist/`. It does not edit tracked HTML, service-worker, or Worker source. The production release is generated as `Main · YYYY.MM.DD · <short SHA>` and exposed in `release.json`.

## Workers Builds settings

- Production branch: `main`
- Build command: `npm ci && npm run check && RELEASE_CHANNEL="Main" npm run build`
- Deploy command: `npx wrangler deploy`
- Root directory: repository root

This produces one atomic Worker and Static Assets deployment per successful push. The previous raw-GitHub proxy and manual Worker `VERSION` constant are no longer part of the source-controlled Worker.

Non-production branch builds remain enabled. Feature branches can produce Worker preview versions without replacing production `main`. The architecture preview branch is `cursor/architecture-refactor-3eb1` (`RELEASE_CHANNEL="Architecture Preview"`).

The additive `thumb_path` columns are now on production FoodLog (`photo_thumb_paths`). That SQL only adds empty text columns and upload/RLS rules. It does not delete restaurants, dishes, ratings, photos, or Storage objects. Recount after apply: 33 restaurants (30 visible), 26 dishes (24 visible), 20 restaurant photos, 9 dish photos, 21 restaurant ratings, 30 dish ratings, 55 `plate-photos` objects totaling 17,810,725 bytes. Live `main` at `food.danyhanna.uk` still serves `Main · 59f4ef2` and the public REST API still returns those 30 places.

Workers Builds already uploaded architecture commit `452303e` as a non-production version (`9fc5e829-132c-42b6-95f3-6efae84e8645`) using `npx wrangler versions upload`. That does **not** replace `food.danyhanna.uk`. To put the branch on the custom domain, set Worker `foodlog` production branch to `cursor/architecture-refactor-3eb1`, keep deploy command `npx wrangler deploy`, and use build command `npm ci && npm run check && RELEASE_CHANNEL="Architecture Preview" npm run build`. Preserve `keep_vars` and the `food.danyhanna.uk/*` route. Rollback is the current Main deployment `59f4ef2`.

## Current live experiment: `design2.0`

As of 2026-09-12, Worker `foodlog` production branch is temporarily `design2.0` so `food.danyhanna.uk` can test the Olive & Porcelain redesign. GitHub `main` stays at `be6ea9d` and is not merged with this UI.

- Build command: `npm ci && npm run check && RELEASE_CHANNEL="Design 2.0" npm run build`
- Deploy command: `npx wrangler deploy`
- Runtime bindings, `keep_vars`, and the `food.danyhanna.uk/*` route are unchanged
- Non-production branch builds remain enabled
- Immediate rollback: restore production branch `stable-beta-ui` with `RELEASE_CHANNEL="Stable Beta UI"` and deploy (`b9a55d2` was the last Stable Beta UI live build)
- Git rollback: restore production branch `main` with `RELEASE_CHANNEL="Main"` and deploy, or roll back to the last Main Worker version serving `be6ea9d`

Changing the production branch in the dashboard does not swap live traffic by itself. A successful production-branch build that runs `npx wrangler deploy` does. Earlier `design2.0` pushes ran `npx wrangler versions upload` because `stable-beta-ui` was still the production branch.

## Previous experiment: `stable-beta-ui`

As of 2026-09-11, Worker `foodlog` production branch was temporarily `stable-beta-ui` so `food.danyhanna.uk` could test the mobile swipe-back underlay. GitHub `main` stayed at `be6ea9d`.

- Build command: `npm ci && npm run check && RELEASE_CHANNEL="Stable Beta UI" npm run build`
- Deploy command: `npx wrangler deploy`
- Runtime bindings, `keep_vars`, and the `food.danyhanna.uk/*` route were unchanged
- Non-production branch builds remained enabled
- Rollback at that time: restore production branch `main` with `RELEASE_CHANNEL="Main"` and deploy, or roll back to the last Main Worker version serving `be6ea9d`

The first push of `18f6823` happened before that branch switch, so Cloudflare only ran `npx wrangler versions upload` with `RELEASE_CHANNEL="Main"`. Push `860f165` ran production build `1b465352-9c93-4acc-88ee-ae2eb7ec3623`. Live `GET /api/health` then returned `Stable Beta UI · 860f165`. The last Stable Beta UI production deploy before Design 2.0 was `b9a55d2`.

## Health and release checks

- `GET /api/health` returns only `{ "status": "ok", "release": { "channel", "buildId", "builtAt" } }`.
- `/config.js` remains dynamic and `no-store` because it contains the public Supabase project configuration used by the browser.
- `/api/maps/resolve` remains Worker-handled and continues to accept only bounded HTTPS Google Maps URLs.
- All other paths are served by `env.ASSETS`.
- The owner release bar is shown only when the authenticated email exactly matches `danielhanna0001@gmail.com`, case-insensitively.

## Verification and rollback

Before changing production:

1. Run `npm ci`, `npm run check`, `npm run test:e2e`, and `npm run cloudflare:check`.
2. Verify a Cloudflare preview's static assets, `/config.js`, Maps resolution, `/api/health`, release-label consistency, and observability.
3. Confirm the current custom-domain route and runtime variable bindings are unchanged.
4. Roll back by selecting the last known-good Worker deployment/version in Cloudflare, then verify `/api/health` and the owner release label agree.

Cloudflare Workers Builds is connected to `DanielAshrafHanna/FoodLog`. A successful push to `main` runs the build and deploy commands above.

## Astra release history

- Verified source branch: `astra` in `DanielAshrafHanna/FoodLog`.
- Build command: `npm ci && npm run check && RELEASE_CHANNEL="Astra Preview" npm run build`.
- Deploy command: `npx wrangler deploy` (Worker `foodlog`; existing runtime variables and route preserved).
- Cloudflare Workers Builds is connected to `DanielAshrafHanna/FoodLog`, with `astra` as its production branch and builds enabled for non-production branches.
- Pre-Astra rollback version: `80b44222-bf92-4a98-8151-2630ec1f1dc8` (deployment `0fcae629-2698-4a39-b2be-c247b8ecc4e3`, release `21b9403`).
- This is a frontend-only release against the existing database. It includes no migration or data-reset command.
- Build command: `npm ci && npm run check && RELEASE_CHANNEL="Astra Preview" npm run build`.
- Deploy command: `npx wrangler deploy`; the Cloudflare-managed API token is used by the build.
- The first build completed successfully from commit `e351cfe` (build `5e9e13aa-16f1-4ed4-ab85-7d5e37bcb27f`). `GET /api/health` reports `Astra Preview · e351cfe`.
- Live public verification after deployment confirmed the existing collection remains available: 29 restaurants and 23 dishes. No database migration or data-reset command ran.

The Astra configuration was superseded on 2026-09-10 when the reviewed branch was merged into `main` and Workers Builds production branch was changed to `main`.
