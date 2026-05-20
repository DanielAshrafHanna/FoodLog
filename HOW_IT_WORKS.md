# FoodLog: How It Was Built

FoodLog (branded **Plate Log** in the UI) is a lightweight shared restaurant journal. You and friends can log places, dishes, photos, ratings, and notes. Everyone can read the log; only approved accounts can edit.

**Live site:** https://food.danyhanna.uk

**Repo:** https://github.com/DanielAshrafHanna/FoodLog

The goal is to keep it free, fast, mobile-friendly, and easy to maintain without a heavy frontend framework.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Plain HTML, CSS, JavaScript (no React/Next) |
| Hosting | Cloudflare Worker on `food.danyhanna.uk` |
| Database | Supabase Postgres |
| Auth | Supabase email/password + Google OAuth |
| Authorization | `approved_users` email allowlist + RLS |
| Images | Supabase Storage bucket `plate-photos` |
| PWA | `manifest.json` + `sw.js` service worker |
| Source control | GitHub `DanielAshrafHanna/FoodLog` |

## Main Files

| File | Purpose |
|------|---------|
| `index.html` | Page shell, forms, modals, filters, lightbox, PWA hooks |
| `styles.css` | Layout, dark/light theme, mobile order, galleries |
| `app.js` | State, rendering, filters, Supabase CRUD, auth, sync |
| `sw.js` | Service worker (app shell cache, network-first scripts) |
| `manifest.json` | Installable PWA metadata |
| `build.mjs` | Writes `config.js`, `build-id.txt`, stamps deploy assets |
| `server.mjs` | Local dev server; injects `BUILD_ID` into HTML/SW |
| `config.example.js` | Example Supabase config for local cloud testing |
| `supabase-schema.sql` | Full schema, RLS, storage policies (source of truth) |
| `supabase-migration-approval.sql` | Idempotent case-insensitive approval policy fix |
| `supabase-migration-improvements.sql` | Stable 3: owner admin, updated_by, realtime |
| `supabase-migration-pending-approvals.sql` | Pending sign-in requests for owner approve/deny |
| `.gitignore` | Ignores `config.js`, `build-id.txt` |

Icons: `icons/icon-192.png`, `icons/icon-512.png` (referenced by manifest and SW).

## Access Model

```mermaid
flowchart LR
  Guest[Not signed in] -->|read only| Log[Shared log]
  SignedIn[Signed in] -->|read only| Log
  SignedIn -->|check approved_users| Approved{Approved?}
  Approved -->|yes| Edit[Add edit delete]
  Approved -->|no| Log
  Owner[danielhanna0001@gmail.com] -->|plus| ImportExport[Import Export]
```

- **Guests:** view restaurants, dishes, and photos. No edit controls.
- **Signed in, not approved:** same as guests; sync panel shows “Waiting for approval”. Their email is stored in `pending_approvals` so the owner can approve without pre-typing.
- **Approved editors:** full CRUD on restaurants, dishes, and gallery photos.
- **Superuser** (`danielhanna0001@gmail.com`): Import/Export, **Pending approval** list (approve/deny), and optional pre-approve by email. Superuser is in `approved_users`.

## How The App Works Locally

On load, the app reads `window.PLATE_LOG_CONFIG` from `/config.js`.

**Local-only mode** (no Supabase config):

- Data from `localStorage` key `plate-log-data-v1`
- Seed sample restaurants if empty
- Photos as browser data URLs
- Sync panel: “Local only”

**Local cloud mode:** copy `config.example.js` to `config.js` with your Supabase URL and publishable key.

```powershell
npm run start
```

Opens http://127.0.0.1:4173 — runs `build.mjs` then `server.mjs`, which substitutes `__BUILD_ID__` in HTML and `sw.js` from `build-id.txt`.

## How The App Works Online

The Cloudflare Worker `foodlog`:

1. Serves `/config.js` from environment bindings (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`).
2. Proxies static files from GitHub raw `main` with a cache-busting `VERSION` query on fetch.
3. Maps paths like `/`, `/app.js`, `/styles.css`, `/sw.js`, `/manifest.json`, icons.

**Important:** After pushing to GitHub, bump the Worker’s `VERSION` constant to the latest commit short hash (e.g. `dffc42e`) in **Workers & Pages → foodlog → Edit code → Deploy**. The dashboard label like `f035f6e0 (Active Latest)` is Cloudflare’s deployment ID, not this string.

Committed `index.html` uses stamped query strings (`styles.css?v=…`, `app.js?v=…`) from `npm run build:deploy`.

## Database Design

### Content tables

- **`restaurants`** — name, location, cuisine, price, rating, maps, notes, `visited` (text array), timestamps
- **`dishes`** — per restaurant: name, rating, `liked_by`, notes, `photo_path`
- **`restaurant_photos`** — gallery images per restaurant (`photo_path`)

### Access control

- **`approved_users`** — `email`, `note`, `created_at`. Must match signed-in user (case-insensitive) to edit.

RLS: public **SELECT** on content tables; **INSERT/UPDATE/DELETE** only when email exists in `approved_users` (policies use `lower(email)`). Storage uploads/deletes restricted to approved users; reads are public via public bucket + `getPublicUrl()`.

### Migrations

- Full setup: run `supabase-schema.sql` on a new project.
- Existing project after stable 2.0: run `supabase-migration-approval.sql` if approval checks ever fail on mixed-case emails.

## Auth Flow

1. **Email/password** — `signInWithPassword`; form in sync panel.
2. **Google** — `signInWithOAuth`; redirect uses `getAuthRedirectUrl()`:
   - `http://127.0.0.1` / `localhost` → `window.location.origin`
   - production → `https://food.danyhanna.uk`
3. After login, client queries `approved_users` with `.ilike('email', email)`.
4. **Sign out** — full `signOut()`, clears session, reloads public data.
5. OAuth error URLs (`bad_oauth_state`, etc.) are stripped from the address bar on load.

Boot loads session once (no duplicate fetch on `INITIAL_SESSION` + `getSession`).

## Features Added In Stable 2.0

Compared to tag `stable-1.0`, stable 2.0 includes:

### Reliability and deploy

- **BUILD_ID cache busting** — `build.mjs` writes `build-id.txt`; `build:deploy` stamps `index.html` and `sw.js`; Worker `VERSION` must match latest Git commit after deploy.
- **Service worker** — `plate-log-cache-{BUILD_ID}`; network-first for HTML/JS/CSS/config; reload once on `controllerchange`.
- **Cloud offline cache** — `plate-log-cloud-cache-v1` in `localStorage` when Supabase is configured.
- **Auth fixes** — deduped boot fetch, case-insensitive approval check, production Google redirect, proper sign-out.

### UI/UX

- **Dark / light theme** — toggle in header; default light unless user chose dark (`plate-log-theme` in `localStorage`).
- **Mobile layout** — sync/auth panel moved up (`order: 2`); “Viewing only · Sign in” bar on small screens.
- **Dark mode on mobile** — CSS overrides so cards are not white-on-light-text.
- **Loading skeletons** — list and detail while first cloud fetch runs.
- **Image compression** — JPEG resize before upload to save storage.
- **Visited by** — comma-separated field on restaurant form; shown as pills on detail.
- **Branding** — “Shared restaurant journal” (not “private food map”).
- **PWA** — manifest + icons; installable on phone.

### Data and sync

- **Realtime** — Supabase `postgres_changes` on `restaurants`, `dishes`, `restaurant_photos` refreshes data when friends edit (enable Realtime on these tables in Supabase if needed).
- **Import to cloud** — superuser import can push JSON into Supabase (restaurants + dishes; photos not bulk-imported yet).
- **Sync errors** — message + offline “cached at …” using `lastSyncedAt`.

## Image And Gallery Flow

**Dish photo:** preview → compress → upload to `plate-photos` → save `photo_path` on dish.

**Restaurant gallery:** multi-select → compress → upload → `restaurant_photos` rows.

**Lightbox:** tap/click photo to expand.

Only approved editors see upload/delete controls.

## Restaurant Form

- Location and cuisine: dropdown from existing values or “+ Add new…”.
- Maps URL normalized with `https://` if missing.
- **Visited by:** comma-separated names → stored in `visited[]`.

## Search, Filters, Sort

Search across name, location, cuisine, dish names, notes. Filter by location, cuisine, price, min rating. Sort: recent, top rated, A–Z.

## Owner Import / Export

Superuser only: `danielhanna0001@gmail.com`.

- **Export** — JSON of current loaded data.
- **Import** — choose local-only restore or confirm upload to shared Supabase log.

## Cloudflare Setup

- DNS: `food.danyhanna.uk`
- Route: `food.danyhanna.uk/*` → Worker `foodlog`
- Worker fetches: `https://raw.githubusercontent.com/DanielAshrafHanna/FoodLog/main{path}?v={VERSION}`
- `/config.js` generated from Worker secrets (never commit real keys)

### Deploy checklist

1. Commit and push to `main`.
2. Note short hash: `git rev-parse --short HEAD`
3. Run `npm run build:deploy` and commit stamped `index.html` / `sw.js` if needed.
4. In Cloudflare Worker editor, set `const VERSION = "<that-hash>";` and deploy.
5. Hard-refresh the site; PWA users may get one auto-reload.

## Stable Checkpoints

### Stable 1.0 (`stable-1.0`)

First production-ready shared log: Supabase, RLS, auth, galleries, lightbox, mobile filters, owner import/export (local only).

```powershell
git show stable-1.0
git switch -c restore-stable-1.0 stable-1.0
```

### Stable 2.0 (`stable-2.0`)

Regression fixes after UI polish (post–1.0), plus PWA, theme, mobile auth placement, BUILD_ID deploy pipeline, visited field, cloud import option, realtime refresh, and Supabase approval migration. **Use this tag to roll back before new feature work.**

```powershell
git show stable-2.0
git switch -c restore-stable-2.0 stable-2.0
```

To return production Worker assets to this checkpoint, check out the tag, use its commit hash as `VERSION`, and redeploy the Worker.

### Stable 3.0 (`stable-3.0`)

Stable 3 UX plus **pending approval queue**, **Google OAuth (PKCE) fix**, and owner approve/deny from the sync panel. Apply `supabase-migration-pending-approvals.sql` before using pending approvals in production.

```powershell
git show stable-3.0
git switch -c restore-stable-3.0 stable-3.0
```

## Stable 3 Features (Current `main`)

After `stable-2.0`, the app adds:

### Owner admin (superuser only)

- **Pending approval** — anyone who signs in (Google or email) but is not approved yet appears here; tap **Approve** or **Deny** (no need to pre-type their email).
- **Approved editors** — list, pre-approve by email, or remove access.
- Requires migrations [`supabase-migration-improvements.sql`](supabase-migration-improvements.sql) and [`supabase-migration-pending-approvals.sql`](supabase-migration-pending-approvals.sql).

### Google sign-in

- OAuth uses **PKCE** and redirects back to `window.location.origin` (production: `https://food.danyhanna.uk`, local: `http://127.0.0.1:4173`).
- In Supabase **Authentication → URL configuration**, add those URLs under **Redirect URLs** (and set **Site URL** to production).
- **Enable sign-ups:** In Supabase **Authentication → Providers** (or Sign In / Users), turn on **Allow new users to sign up**. If this is off, new friends get `#error=signup_disabled` in the URL and never appear in Pending approval. They can still only edit after you approve them in `approved_users`.
- Approved emails are matched case-insensitively (stored lowercase in `approved_users`).
- **Add to waiting list** — owner can manually add an email to Pending approval before they sign in (optional; run `supabase-migration-pending-owner-insert.sql`).

### UX polish

- **Realtime toast** — “Log updated” when Supabase pushes changes from another device.
- **Sync retry** button when cloud fetch fails.
- **Visited by / Liked by chips** — tap known names or type a new one and press Enter.
- **Share** — copies a link with `?place=<restaurant-id>` to open that place directly.
- **Filter memory** — search, filters, and sort saved per browser.
- **Empty states** — clearer messages for no data vs no filter matches vs waiting for approval.
- **Last updated by** — shows `updated_by` on restaurant detail when the column is set.
- **Open in Maps** — clearer map button label.

### Data

- **Import to cloud** can upload dish photos and gallery images from data URLs in export JSON.
- **Email normalization** trigger on `approved_users`.
- **Realtime publication** enabled for restaurants, dishes, restaurant_photos.

## Planned Improvements (Next)

- Location/cuisine lookup tables (fewer typos).
- Postgres full-text search as the log grows.
- Map view (pins from Maps URLs).
- Cloudflare Pages deploy (when Git integration works).
- Apple Sign In (separate approval rows for relay emails).

## Useful Commands

```powershell
node --check app.js
npm run build          # config.js + build-id.txt + stamp sw.js
npm run build:deploy   # also stamp index.html (for GitHub + Worker)
npm run start          # local dev on :4173
git status -sb
git tag -l
```

## Important Notes

- Publishable Supabase keys are fine in the browser; **never** put the service role key in frontend code.
- `config.js` and `build-id.txt` stay out of git.
- One shared notebook for everyone — not per-user silos.
- Login ≠ edit access; email must be in `approved_users`.
- Photos are public-read by design for the shared log UI.
- Google OAuth callback goes through Supabase; the app redirect must be the exact site origin (`https://food.danyhanna.uk` or local dev URL) listed in Supabase redirect URLs.
