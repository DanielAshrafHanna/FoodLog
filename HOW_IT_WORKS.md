# FoodLog: How It Was Built

FoodLog is a lightweight web app for recording restaurants, dishes, food photos, ratings, notes, locations, cuisine, prices, and Google Maps links. It started as a fast local app and was then upgraded to run online at:

https://food.danyhanna.uk

The goal was to keep it free, fast, mobile-friendly, and easy to maintain.

## Stack

- Frontend: plain HTML, CSS, and JavaScript
- Hosting: Cloudflare Worker on `food.danyhanna.uk`
- Database: Supabase Postgres
- Authentication: Supabase email/password auth and Google OAuth
- Authorization: an `approved_users` allowlist controls who can edit
- Image storage: Supabase Storage
- Source control: GitHub repo `DanielAshrafHanna/FoodLog`

There is no frontend framework yet. That was intentional: the app is small, so plain browser code keeps it fast and simple.

## Main Files

- `index.html`: page structure, forms, dialogs, filters, lightbox, and layout regions
- `styles.css`: visual design, responsive layout, mobile behavior, gallery styling, and lightbox styling
- `app.js`: app state, rendering, filters, local storage, Supabase CRUD, auth, image uploads
- `server.mjs`: tiny local dev server for testing on your machine
- `build.mjs`: creates `config.js` from environment variables during hosted builds
- `config.example.js`: example Supabase config format
- `supabase-schema.sql`: database tables, indexes, storage bucket, and security policies
- `.gitignore`: ignores generated/private local config

## How The App Works Locally

When the app opens, it looks for:

```js
window.PLATE_LOG_CONFIG
```

If there is no Supabase URL/key, the app runs in local-only mode. In that mode:

- Data is loaded from `localStorage`
- New restaurants and dishes save into the browser
- Uploaded photos are stored as local browser data URLs
- Restaurant gallery photos are stored in the browser data too
- The UI shows `Local only` in the sync panel

This makes local testing easy because the app still works without Supabase.

## How The App Works Online

On `https://food.danyhanna.uk`, the Cloudflare Worker serves a generated `/config.js` file containing:

```js
window.PLATE_LOG_CONFIG = {
  supabaseUrl: "...",
  supabasePublishableKey: "..."
};
```

Once those values exist, `app.js` creates a Supabase browser client:

```js
window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey)
```

Then the app switches to cloud mode:

- Everyone can view the shared restaurant log
- It shows a sign-in form for editing access
- Approved people sign in with Google or enter their email and password
- After sign-in, the app checks whether your email is in `approved_users`
- Approved users can add/edit/delete restaurants and dishes
- Signed-in but unapproved users can still view, but cannot edit
- Dish photos upload to Supabase Storage only for approved users
- Restaurant-level gallery photos also upload to Supabase Storage only for approved users
- The owner account gets extra Import/Export controls

## Database Design

There are three main content tables.

There is also one access-control table.

### `restaurants`

Stores one row per restaurant:

- `id`
- `user_id`
- `name`
- `location`
- `cuisine`
- `price`
- `rating`
- `maps`
- `notes`
- `visited`
- `created_at`
- `updated_at`

### `dishes`

Stores dishes linked to restaurants:

- `id`
- `restaurant_id`
- `user_id`
- `name`
- `rating`
- `liked_by`
- `notes`
- `photo_path`
- `created_at`
- `updated_at`

Each dish belongs to one restaurant through `restaurant_id`.

### `restaurant_photos`

Stores random restaurant/food photos that are attached to a restaurant but not tied to a named dish:

- `id`
- `restaurant_id`
- `user_id`
- `photo_path`
- `created_at`

Each photo belongs to one restaurant through `restaurant_id`. The image file itself lives in Supabase Storage, and this table stores the storage path.

### `approved_users`

Stores emails that are allowed to edit the shared log:

- `email`
- `note`
- `created_at`

If an email is not in this table, that user can sign in but cannot edit.

## Security Model

Supabase Row Level Security is enabled on the tables.

The policies make sure:

- Anyone can read restaurants and dishes
- Anyone can read restaurant gallery photo rows
- Only signed-in approved users can create/edit/delete restaurants
- Only signed-in approved users can create/edit/delete dishes
- Only signed-in approved users can upload/delete restaurant gallery photos
- The app checks approval status by reading the current user's own row in `approved_users`

Photos are stored in the `plate-photos` bucket. Since visitors can view the public restaurant log, photo reads are public too. Upload/update/delete is restricted to approved users.

Approval is handled by adding an email to `approved_users`, for example:

```sql
insert into public.approved_users (email, note)
values ('person@example.com', 'Friend')
on conflict (email) do update set note = excluded.note;
```

The user also needs a Supabase Auth account. The simplest owner-managed flow is:

1. In Supabase Dashboard -> Authentication -> Sign In / Providers, keep email/password enabled and turn off public signups if available.
2. Go to Authentication -> Users.
3. Create the user manually with their email and a temporary password.
4. Auto-confirm the user if Supabase shows that option.
5. Add the same lowercased email to `public.approved_users`.
6. Give the person their password and ask them to change it later if needed.

This keeps random visitors from creating editor accounts. Supabase Auth proves the login is real, and `approved_users` decides whether that signed-in email can edit FoodLog.

Google login uses Supabase's Google OAuth provider. In Google Cloud, the OAuth client redirects back to:

```text
https://lmkkmzpwsdhlpjugrwjr.supabase.co/auth/v1/callback
```

In FoodLog, the app starts Google login and asks Supabase to return to:

```text
https://food.danyhanna.uk
```

The app also cleans up expired OAuth error URLs such as `bad_oauth_state` so users are not left with ugly error query strings in the address bar.

## Image And Gallery Flow

When you choose a dish photo:

1. The browser previews it immediately.
2. On save, the file uploads to Supabase Storage.
3. The storage path is saved in the `dishes.photo_path` column.
4. When the app loads dishes, it creates public Supabase Storage URLs for each photo.

Only approved editors can upload or delete photos.

Restaurant gallery photos work similarly:

1. Open a restaurant.
2. Use **Add photos** in the Photos section.
3. The app uploads each file to the `plate-photos` bucket.
4. A row is inserted into `restaurant_photos` with the restaurant ID and storage path.
5. The Photos section renders above the Dishes section.

Restaurant gallery photos and dish photos can be clicked/tapped to open a full-screen lightbox for easier viewing.

## Restaurant Form Behavior

The Add/Edit restaurant form uses explicit dropdowns for Location and Cuisine:

- Existing values appear in the dropdowns.
- `+ Add new...` reveals a text input for a new value.
- After saving, the new value becomes available in future dropdowns and filters.

The Google Maps field accepts a Maps URL. If the user enters a URL without `https://`, the app normalizes it before saving.

## Search, Filters, And Mobile Layout

The app supports:

- Search by restaurant name, cuisine, dish name, and notes
- Filters by location, cuisine, price, and minimum rating
- Sort by recent, top rated, or A-Z

On mobile, the layout is optimized so search and filters sit directly above the restaurant results. The restaurant list uses normal page scrolling rather than a nested horizontal carousel, which makes it easier to type in search and see the list update immediately.

## Owner-Only Import And Export

Import/Export is restricted to the superuser email:

```text
danielhanna0001@gmail.com
```

The controls are hidden unless that exact email is logged in. The handlers also check the email before running, so manually triggering the controls from the browser does not bypass the restriction.

Export downloads the currently loaded app data as JSON. Import restores JSON into local browser storage. Import does not currently bulk-upload data into Supabase.

## Cloudflare Setup

The domain `danyhanna.uk` is managed in Cloudflare.

I added:

- DNS record: `food.danyhanna.uk`
- Worker route: `food.danyhanna.uk/*`
- Worker script: `foodlog`

The Worker serves the app files from GitHub raw URLs:

- `/index.html`
- `/styles.css`
- `/app.js`
- `/config.js`

`/config.js` is special: it is generated by the Worker from Cloudflare environment bindings so Supabase credentials are not hardcoded into GitHub.

The Worker has an internal `VERSION` string. Updating that string forces the Worker to fetch fresh GitHub raw assets instead of serving old cached copies. The HTML also uses query strings on `styles.css` and `app.js` to avoid browser/Cloudflare stale asset issues after mobile UI changes.

## Why A Cloudflare Worker Instead Of Pages

The original plan was Cloudflare Pages connected to GitHub.

Cloudflare returned an internal Pages Git installation error when creating the Pages project. To keep going, I deployed the app through a free Cloudflare Worker instead.

This is still free and fast. The tradeoff is that the Worker currently fetches static assets from GitHub and caches them, rather than Cloudflare Pages building the repo directly.

Later, if the Cloudflare Pages GitHub integration is fixed, the app can move to Pages.

## Local Development

From the project folder:

```powershell
npm run start
```

Then open:

```text
http://127.0.0.1:4173
```

For local-only mode, no config is needed.

For local Supabase mode, create a local `config.js` based on `config.example.js`:

```js
window.PLATE_LOG_CONFIG = {
  supabaseUrl: "https://your-project-ref.supabase.co",
  supabasePublishableKey: "your-publishable-key"
};
```

`config.js` is ignored by git.

## Deployment Flow

The current deployment flow is:

1. Edit files locally.
2. Test at `http://127.0.0.1:4173`.
3. Commit changes with git.
4. Push to GitHub.
5. Cloudflare Worker fetches updated assets from GitHub.
6. The Worker cache refreshes shortly after.

Because the Worker and Cloudflare cache assets, changes can take a few minutes to appear online unless the Worker `VERSION` or asset query strings are bumped.

## Stable 1.0 Checkpoint

The `stable-1.0` git tag marks the first stable checkpoint after:

- Supabase cloud database and storage setup
- Public read-only mode with approved editor access
- Email/password login and Google login
- Owner-only Import/Export
- Restaurant and dish CRUD
- Restaurant-level photo galleries
- Click/tap photo lightbox
- Explicit Location/Cuisine dropdowns with add-new options
- Google Maps location field
- Mobile layout improvements for search, filters, restaurant list, detail view, photos, and dishes

To inspect the checkpoint:

```powershell
git show stable-1.0
```

To return to it later, create a branch from the tag:

```powershell
git switch -c restore-stable-1.0 stable-1.0
```

## Useful Commands

Check JavaScript syntax:

```powershell
node --check app.js
node --check server.mjs
node --check build.mjs
```

Run locally:

```powershell
npm run start
```

Check git status:

```powershell
git status -sb
```

Commit and push:

```powershell
git add .
git commit -m "Describe the change"
git push
```

## Important Notes

- Supabase publishable keys are safe to use in browser apps.
- Supabase service role keys must never be placed in frontend code.
- `config.js` should stay out of git.
- The app uses one shared restaurant log.
- Login alone does not grant edit access. The email must be in `approved_users`.
- `danielhanna0001@gmail.com` is the superuser account for owner-only controls.
- If you are not logged in, you can view but cannot edit.
- If you are logged in but not approved, you can view but cannot edit.
- Photos are publicly readable because the public restaurant log displays them.
- Password login avoids magic-link email rate limits during normal sign-in.
- Apple login is not enabled yet. If added later, hidden/private relay emails may need separate approval rows.

## What To Improve Next

- Add image compression before upload to save Supabase storage space.
- Add a real visited-by field in the restaurant form.
- Add location and cuisine management screens.
- Add map view.
- Add import-to-Supabase so old local data can be migrated into the cloud database.
- Move from Worker fallback to Cloudflare Pages once the GitHub integration issue is fixed.
- Add installable PWA support so it feels like a mobile app.
