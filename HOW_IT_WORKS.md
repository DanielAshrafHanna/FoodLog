# FoodLog: How It Was Built

FoodLog is a lightweight shared restaurant journal. Table Notes is the design-system name for the Order Rail interface. You and friends can log places, dishes, photos, ratings, and notes. Everyone can read the log; only approved accounts can edit.

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
| `lib/photo-delivery.js` | Small photo copies, compression, bounded upload pool |
| `lib/navigation.js` | In-app history snapshots and view transitions |
| `lib/render-list.js` | Keyed restaurant-row reuse |
| `lib/photo-queue.js` | IndexedDB interrupted-upload queue |
| `lib/photo-gallery.js` | Gallery, carousels, retry-safe photo commit |
| `lib/foodlog-core.js` | Shared domain helpers, including incremental realtime refresh |
| `sw.js` | Service worker (app shell cache, network-first scripts) |
| `manifest.json` | Installable PWA metadata |
| `build.mjs` | Writes `config.js`, `build-id.txt`, stamps deploy assets |
| `server.mjs` | Local dev server; injects `BUILD_ID` into HTML/SW |
| `config.example.js` | Example Supabase config for local cloud testing |
| `supabase-schema.sql` | Full schema, RLS, storage policies (source of truth) |
| `supabase-migration-approval.sql` | Idempotent case-insensitive approval policy fix |
| `supabase-migration-improvements.sql` | Stable 3: owner admin, updated_by, realtime |
| `supabase-migration-pending-approvals.sql` | Pending sign-in requests for owner approve/deny |
| `supabase-migration-auth-pending-sync.sql` | Auto-add new `auth.users` to pending_approvals + backfill |
| `supabase-migration-pending-owner-insert.sql` | Owner can insert/update pending rows manually |
| `supabase-migration-lookups.sql` | Location/cuisine lookup tables + sync trigger |
| `supabase-migration-search.sql` | `search_vector` column + GIN index for future FTS |
| [`REGRESSION_GUIDE.md`](REGRESSION_GUIDE.md) | **Past bugs, causes, and “do not regress” rules** — keep updated when fixing auth/SW bugs |
| `.cursor/rules/regression-guide.mdc` | Cursor rule: read/update `REGRESSION_GUIDE.md` on auth/SW work |
| `.gitignore` | Ignores `config.js`, `build-id.txt` |

Brand logo: Dany's supplied leaf/map-pin artwork, retained unchanged in `assets/foodlog-logo-source.png`; the header uses the transparent 256px `assets/foodlog-leaf-logo.png`. Browser icons are `icons/foodlog-leaf-16.png`, `foodlog-leaf-32.png`, and `foodlog-leaf.ico`. Install icons are `icons/foodlog-leaf-192.png`, `foodlog-leaf-512.png`, plus padded mask-safe variants `foodlog-leaf-maskable-192.png` and `foodlog-leaf-maskable-512.png`; Apple uses the opaque 180px `foodlog-leaf-apple.png`. Display/install assets are resized copies of the supplied artwork, with a warm neutral canvas for opaque app icons. New asset paths avoid older logo caches. Active assets are referenced by HTML, the manifest, and the service worker; the full source is not precached.

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
2. Proxies static files from GitHub raw with a cache-busting `VERSION` query on fetch. Production normally uses `main`; a temporary preview can point `REPO` at another branch without changing Supabase.
3. Maps paths like `/`, `/app.js`, `/styles.css`, `/sw.js`, `/manifest.json`, icons.

**Important:** After pushing to GitHub, bump the Worker’s `VERSION` constant to the latest commit short hash (e.g. `dffc42e`) in **Workers & Pages → foodlog → Edit code → Deploy**. The dashboard label like `f035f6e0 (Active Latest)` is Cloudflare’s deployment ID, not this string. Pointing the Worker at a feature branch tests that frontend against the same production database; restoring `REPO` to `main` and `VERSION` to `954c4aa` returns the previous UI. See [REGRESSION_GUIDE.md](REGRESSION_GUIDE.md) for the preview/rollback pair.

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

1. **Email/password** — the dedicated account dialog has Sign in (`signInWithPassword`) and Create account (`signUp`) modes. Signup uses the current origin for email confirmation, shows Check your email when no session is returned, and offers bounded confirmation resend. A returned session still goes through the approval check.
2. **Google** — `signInWithOAuth` (PKCE); redirect uses `window.location.origin` via `getAuthRedirectUrl()`.
3. On return, `?code=` means **success** (exchange via `getSession()` + `detectSessionInUrl`); `#error=` / `?error=` mean failure — see [`REGRESSION_GUIDE.md`](REGRESSION_GUIDE.md).
4. After login, client queries `approved_users` (lowercase email).
5. Not approved → row in `pending_approvals` (client and/or `auth.users` trigger).
6. **Sign out** — `signOut()`, clears session, reloads public data.

**Before editing auth:** read the pre-ship checklist in [`REGRESSION_GUIDE.md`](REGRESSION_GUIDE.md).

**Account discovery:** signed-out visitors see Continue with Google and Use email above the journal on desktop and phone. Phone restaurant details retain a Google shortcut. Settings also opens the same account dialog. Signed-in, unapproved users see Waiting for editing approval and Check approval.

**Sync panel:** collapsed by default (status on the header row); tap **Sync** to expand sync status, account actions, and owner tools. Open/closed state is remembered per browser.

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
- **Visit history** — the Visited choice records the current person's display name; earlier saved names remain as detail pills. There is no typed-person field.
- **Branding** — “Shared restaurant journal” (not “private food map”).
- **PWA** — manifest + icons; installable on phone.

### Data and sync

- **Realtime** — Supabase `postgres_changes` on `restaurants`, `dishes`, `restaurant_photos` refreshes data when friends edit (enable Realtime on these tables in Supabase if needed).
- **Import to cloud** — superuser import can push JSON into Supabase (restaurants + dishes; photos not bulk-imported yet).
- **Sync errors** — message + offline “cached at …” using `lastSyncedAt`.

## Image And Gallery Flow

**Dish photo:** preview → compress (1200px JPEG) → upload original plus a 480px sibling `*-thumb.jpg` when `thumb_path` columns exist → save paths on `dish_photos` / legacy `dishes.photo_path`.

**Restaurant gallery:** multi-select → same compress/upload pair → `restaurant_photos` rows.

**Display:** list tickets, dish carousels, and gallery grids use the small copy when present and fall back to the original. The detail hero and lightbox still use the full file. Production now has `thumb_path` on `restaurant_photos`, `dish_photos`, and `dishes` (empty string until a small copy is written). Existing originals stay in Storage; empty `thumb_path` keeps serving the full file.

**Offline photos:** `sw.js` cache-first caches public `plate-photos` object GETs in a 300-entry LRU cache. Auth and REST calls to `supabase.co` are still skipped.

**Interrupted uploads:** copy picker Files into independent Blobs before resetting the input, then store image bytes in IndexedDB (`foodlog-photo-queue-v1`) with a reserved storage path so a reload can resume. Register the complete selection synchronously and serialize writes/removal per photo ID to prevent stale recovery records. If device persistence fails, try uploading the live copy immediately. If that also fails, keep the form open for Retry; recovery after reload is unavailable for unpersisted photos.

**Lightbox:** tap/click photo to expand the full image.

Only approved editors see upload/delete controls. The owner Settings action **Create small photo copies** backfills thumbs for existing objects after the migration is applied.

## Restaurant Form

- Location and cuisine: searchable existing names/aliases, or explicitly confirm a missing entry before creating it.
- Maps URL normalized with `https://` if missing.
- **Price:** approximate EGP per person. Quick bite 0–450; Casual 450–1,200; Treat 1,200–2,000; Splurge 2,000+. These are approximate bands rather than exact bill calculations. Forms, cards, details, and filters share the same labels. Existing `$`/`$$`/`$$$`/`$$$$` tier codes remain the storage, export, and URL values; existing tiers are displayed with these ranges without rewriting records or requiring a migration. The existing Casual default remains.
- **Visits:** keep Not visited / Visited intent and the detail action Mark as visited. A new restaurant saved with Visited records the current person's name even without a review or dish. Remove the manual Visited by picker; edits and restored drafts preserve earlier `visited[]` entries verbatim, including commas within names. This is display-name history, not a verified account membership list. Existing reviews/dishes still contribute to shared visit status.

## Search, Filters, Sort

Search across name, location, cuisine, dish names, notes. Filter by location, cuisine, price, min rating, shared visit status (All / Not visited / Visited), and the signed-in editor's private Bookmarks. Sort: recent, top rated, A–Z.

## Owner Import / Export

Superuser only: `danielhanna0001@gmail.com`.

- **Export** — JSON of current loaded data.
- **Import** — choose local-only restore or confirm upload to shared Supabase log.

## Cloudflare Setup

- DNS: `food.danyhanna.uk`
- Route: `food.danyhanna.uk/*` → Worker `foodlog`
- Worker fetches: `https://raw.githubusercontent.com/DanielAshrafHanna/FoodLog/<ref>{path}?v={VERSION}` (`<ref>` is `main` in production, or `refs/heads/<branch>` for a frontend preview)
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

Stable 3 UX plus **pending approval queue**, early Google OAuth work, and owner approve/deny. Auth continued to be fixed on `main` after this tag — see [`REGRESSION_GUIDE.md`](REGRESSION_GUIDE.md) for the full list (including the critical `?code=` ≠ error fix at `7781ab7`).

```powershell
git show stable-3.0
git switch -c restore-stable-3.0 stable-3.0
```

**Current known-good auth on `main`:** at or after commit `7781ab7` (May 2026). Use `git rev-parse --short HEAD` for Worker `VERSION`.

### Stable 3.1 (`stable-3.1`)

Production-ready checkpoint after stable-3.0 auth fixes:

- Google OAuth PKCE working (`?code=` fix, service worker bypass, collapsible Sync panel)
- Pending approval from `auth.users` trigger + owner approve/deny UI
- Taller Approved editors list, image compression on upload (1200px / JPEG 80%)
- [`REGRESSION_GUIDE.md`](REGRESSION_GUIDE.md) + [`.cursor/rules/regression-guide.mdc`](.cursor/rules/regression-guide.mdc)
- [`cloudflare-worker.mjs`](cloudflare-worker.mjs) template for `VERSION` deploys

```powershell
git show stable-3.1
git switch -c restore-stable-3.1 stable-3.1
```

Set Worker `VERSION` to the short hash at this tag, then redeploy.

### Stable 3.2 (`stable-3.2`)

Feature release after 3.1: map view, lookup tables, improved client search, Postgres `search_vector` for future FTS.

```powershell
git show stable-3.2
git switch -c restore-stable-3.2 stable-3.2
```

Set Worker `VERSION` to the short hash at this tag (`c0cb9a7` at release), then redeploy.

## Stable 3 Features (Current `main`)

After `stable-2.0`, the app adds:

### Owner admin (superuser only)

- **Pending approval** — anyone who registers in Supabase Auth (first Google attempt) appears here automatically, even if their browser never finishes sign-in (empty “Last sign in” in the Auth dashboard). Tap **Approve** or **Deny**. Run [`supabase-migration-auth-pending-sync.sql`](supabase-migration-auth-pending-sync.sql) for the trigger + backfill.
- **Approved editors** — list, pre-approve by email, or remove access.
- Requires migrations [`supabase-migration-improvements.sql`](supabase-migration-improvements.sql) and [`supabase-migration-pending-approvals.sql`](supabase-migration-pending-approvals.sql).

### Google sign-in

- OAuth uses **PKCE**; redirect = `window.location.origin`.
- Supabase **Redirect URLs**: `https://food.danyhanna.uk/**`, `http://127.0.0.1:4173/**` (and **Site URL** = production).
- **Allow new users to sign up** must be on (first Google login creates an Auth user).
- Pending list: Auth trigger + client — see [`REGRESSION_GUIDE.md`](REGRESSION_GUIDE.md) §11–13.
- **Add to waiting list** — owner can add an email before they sign in.

### UX polish

- **Realtime toast** — “Log updated” when Supabase pushes changes from another device.
- **Sync retry** button when cloud fetch fails.
- **Visit attribution** — choose Visited or Mark as visited; the app records the current person without a name field. Historical names remain saved. Dish likes are personal account reactions on the card; no one types names on someone else’s behalf.
- **Share** — copies a link with `?place=<restaurant-id>` to open that place directly.
- **In-app history** — opening a place (mobile), switching Places/Map, and the phone back gesture use `pushState`/`popstate`. Filter edits still `replaceState`. Saving filters must not `replaceState` a Map or place-open change before that `pushState`. OAuth `?code=`/`error` URLs are ignored by the history handler.
- **Filter memory** — search, filters, and sort saved per browser.
- **Empty states** — clearer messages for no data vs no filter matches vs waiting for approval.
- **Last updated by** — shows editor **display name** (Google `full_name` when available), not email. Migration: [`supabase-migration-editor-profiles.sql`](supabase-migration-editor-profiles.sql).
- **Open in Maps** — clearer map button label.

### Data

- **Import to cloud** can upload dish photos and gallery images from data URLs in export JSON.
- **Email normalization** trigger on `approved_users`.
- **Realtime publication** enabled for restaurants, dishes, restaurant_photos.

## Stable 3.2 features (on `main` after `stable-3.1`)

- **Location/cuisine selection** — `lib/lookup-catalog.js` provides preferred names, Arabic/English aliases, familiar cuisine choices, ranked search, and exact identity. Add/Edit and quick metadata require deliberate new-entry confirmation; Maps suggestions pass the same Save guard. Full-form drafts retain confirmation until the value changes. Filters compare identity; imports preview exact canonical spelling changes and discard foreign registry IDs without fuzzy merging.
- **Lookup registry rollout** — [`20261003140000_canonical_location_cuisine.sql`](supabase/migrations/20261003140000_canonical_location_cuisine.sql) adds stable IDs, normalized uniqueness, aliases, public read-only catalog RPC, and private triggers enforcing identity for saves/imports/legacy clients. Existing `locations` / `cuisines` and restaurant text stay compatible. Existing records derive IDs from the catalog until their next metadata save; the migration does not rewrite historical restaurant rows. Migration was locally tested and applied to production on 2026-10-03 with explicit approval; preservation checks matched all 18 existing app tables. Frontend falls back to existing lists and cached catalog when unavailable.
- **Map view** — **List / Map** toggle; pins from Google Maps URLs that contain coordinates (Leaflet + OpenStreetMap). Add restaurant can paste a Google Maps link (`POST /api/maps/resolve`).
- **Search** — also matches visited names and liked-by on dishes.
- **Postgres `search_vector`** — GIN index on name, location, cuisine, notes (visited names stay client-side only). Migration: [`supabase-migration-search.sql`](supabase-migration-search.sql).

## Planned Improvements (Next)

- Cloudflare Pages deploy (when Git integration works).
- Apple Sign In (separate approval rows for relay emails).
- Server-side full-text search when the log outgrows client-side filtering.

## Useful Commands

```powershell
node --check app.js
npm run build          # config.js + build-id.txt + stamp sw.js
npm run build:deploy   # also stamp index.html (for GitHub + Worker)
npm run start          # local dev on :4173
git status -sb
git tag -l
git rev-parse --short HEAD   # Worker VERSION after deploy
```

**Avoid regressions:** [`REGRESSION_GUIDE.md`](REGRESSION_GUIDE.md)

## Important Notes

- Publishable Supabase keys are fine in the browser; **never** put the service role key in frontend code.
- `config.js` and `build-id.txt` stay out of git.
- One shared notebook for everyone — not per-user silos.
- Login ≠ edit access; email must be in `approved_users`.
- Photos are public-read by design for the shared log UI.
- Google OAuth callback goes through Supabase; the app redirect must be the exact site origin (`https://food.danyhanna.uk` or local dev URL) listed in Supabase redirect URLs.

Location/cuisine maintenance uses `foodlog_admin_lookup_catalog` and `foodlog_manage_lookup`, restricted inside the database to the authenticated owner from `auth.users`. The UI exposes search, usage counts, inline rename, recoverable Delete and Restore under Settings → Locations & cuisines. `retired_at` removes suggestions without deleting associations; `merged_into_id` preserves the former tagamo3 registry entry while its aliases resolve to New Cairo. Canonical labels are applied in the client display/cache; historical restaurant rows are not bulk updated. The source migration is `20261003140100_lookup_management.sql`.


**Dish actions:** the visible Add/Edit review button opens the personal review form; Add photos opens a photo-only picker and does not modify reviews or review drafts. Edit dish details opens a dedicated name/liked-by dialog. More contains only Move dish to Trash, subject to existing ownership checks; it hides the whole dish with all its reviews and photos, and Settings → Trash restores them together. The confirmation describes that scope and recovery. Personal review Trash stays in the dedicated review editor and own-review actions and reuses guarded Undo. Detail rendering includes the dish deletion marker, and list rows count active dishes, so Trash/restore updates both surfaces.


Dish detail edits update only `name` and audit metadata, preserving earlier `liked_by` names. They never call a rating-save RPC or overwrite photo paths. The account-scoped pending-save queue supports `dish-details` for offline retry; if the dish already has a queued full save, merge the selected detail fields into that operation while retaining its review/photo payload. Similar names require explicit separate-dish confirmation. Errors retain typed values. Review and details forms lock during save; closing restores the original card shortcut, or the reviews summary when entering from the reviews list. Dish photo close also restores its Add photos opener.


Account likes use the additive `supabase/migrations/20261003210000_account_dish_likes.sql` migration (applied to production with explicit approval on 2026-10-03; provider migration version `20261003203516`). `dish_likes` has a composite dish/account primary key, display-name snapshot, boolean state, and timestamp. Public SELECT exposes only active likes whose dish and restaurant are active. Direct client writes are denied; `set_dish_like(dish_id, liked)` derives the account and name, requires existing editing approval, and sets only that person’s reaction. Repeating the desired state is idempotent; unlike retains the row with `liked=false`. Parent Trash retains all reaction rows and restore makes active likes visible again.

The frontend reads likes separately so an unavailable table cannot prevent the existing collection from loading. Successful reactions refresh cloud data; realtime events from the identity-free `dish_like_changes` table map through dish ID to the restaurant. This signal remains publicly readable after unlike while inactive personal reactions stay hidden. Failed/offline cloud reactions retain the displayed choice and offer retry; they are not silently queued. Local-only preferences roll back if storage fails. The new module is precached for PWA use. JSON export contains account likes; cloud import preserves their names as Earlier likes on the imported copy instead of impersonating accounts. Existing remote records are not rewritten or deleted.

### Browsing actions and responsive navigation (4 October 2026)

Desktop uses List / Map and the header Add restaurant entry. Phone layouts hide that view switch and use a standalone `#dockAddButton` creation pill outside the nav; its retained ID preserves existing handlers. The pill is available only to approved editors/local mode on the restaurant list. CSS hides it while an input, dialog, or popover is active; details use the existing contextual controls. `has-mobile-create` reserves list clearance only when the action is available. Responsive rendering shows the list at <=980px even with a saved Map surface; the saved desktop preference is unchanged. Existing browser-history, detail return, draft, and photo recovery handlers remain in use. No database migration is required.
