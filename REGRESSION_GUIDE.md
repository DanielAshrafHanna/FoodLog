# Plate Log — Regression Guide

Read this **before changing** `app.js` auth logic, `sw.js`, or OAuth-related boot code. It records bugs that were fixed, why they broke, and what not to reintroduce.

**Architecture overview:** [`HOW_IT_WORKS.md`](HOW_IT_WORKS.md)

**Current production deploy:** set Cloudflare Worker `VERSION` to the latest short hash on `main` (`git rev-parse --short HEAD`).

---

## Pre-ship checklist (auth / PWA)

- [ ] `readAuthCallbackFromUrl()` returns an error **only** when `error` or `error_description` is in the URL — **not** when only `?code=` is present (success redirect).
- [ ] OAuth `code` stays in the URL until `getSession()` runs; strip params **after** session exchange.
- [ ] Do **not** `await` Supabase auth calls inside `onAuthStateChange` (use `setTimeout(..., 0)`); boot calls `getSession()` once.
- [ ] Service worker **does not** intercept OAuth return navigations (query **or** hash: `code`, `error`, `access_token`).
- [ ] `sw.js` matches `url.pathname.endsWith("/config.js")` — never put `?v=` in a pathname check (build must not stamp `config.js` inside `sw.js`).
- [ ] `getAuthRedirectUrl()` returns `window.location.origin` (not a hardcoded URL that can mismatch the live site).
- [ ] Supabase Dashboard: **Allow new users to sign up** enabled (otherwise `#error=signup_disabled`).
- [ ] After push: bump Worker `VERSION` and run `npm run build:deploy` for stamped `index.html` / `sw.js`.

---

## Stable git tags (rollback)

| Tag | Use when |
|-----|----------|
| `stable-1.0` | Last known-good before major UI polish |
| `stable-2.0` | Auth/PWA/mobile fixes after 1.0 regressions |
| `stable-3.0` | Editor admin, pending approvals (early OAuth work; auth still evolved after this tag) |

**Known-good auth + pending flow (May 2026):** `main` at or after `7781ab7` / `0e5cd13` (OAuth `?code=` fix). Prefer `git rev-parse --short HEAD` on `main` for Worker `VERSION`, not only an old tag.

```powershell
git log --oneline -15
git show stable-3.0
git switch -c restore-<name> <tag-or-commit>
```

---

## Auth & OAuth

### 1. Success `?code=` shown as “Sign-in failed” (critical)

| | |
|--|--|
| **Commits** | `7781ab7`, deploy `0e5cd13` |
| **Symptom** | Approved and new users see **Sign-in failed** right after Google; session never starts |
| **Cause** | `readAuthCallbackFromUrl()` treated *any* auth URL (including `?code=...`) as failure and boot exited before `getSession()` |
| **Fix** | Return an error only when `error` or `error_description` is present |
| **Do not regress** | `if (code \|\| error) return { error: "failed" }` — **code means success** |

### 2. OAuth code removed before PKCE exchange

| | |
|--|--|
| **Commits** | `28386f1` |
| **Symptom** | Google redirect returns but user stays logged out |
| **Cause** | `stripAuthParamsFromUrl()` ran in `boot()` **before** `exchangeCodeForSession` / `getSession()` |
| **Fix** | Exchange session first, then strip `code` / hash from URL |
| **Do not regress** | Cleaning `?code=` from the URL at the start of `boot()` |

### 3. `onAuthStateChange` + `getSession` deadlock / slow sign-in

| | |
|--|--|
| **Commits** | `58b7670`, `862d8f2` |
| **Symptom** | Stuck on “Finishing Google sign-in…” for a long time or forever |
| **Cause** | `await` inside `onAuthStateChange` while boot also `await`s `getSession()` |
| **Fix** | Defer auth listener work with `setTimeout`; single boot path; don’t await full `loadRemoteData()` before showing signed-in state |
| **Do not regress** | `async (event, session) => { await refreshAccess(); await getSession(); }` on the listener |

### 4. Double PKCE code exchange

| | |
|--|--|
| **Commits** | `7781ab7` (removed fallback) |
| **Symptom** | Intermittent “invalid grant” / code already used |
| **Cause** | `getSession()` (with `detectSessionInUrl`) exchanged the code, then `exchangeCodeForSession(code)` ran again |
| **Fix** | On `?code=`, use **only** `getSession()` once; no second manual exchange |
| **Do not regress** | Calling both `getSession()` and `exchangeCodeForSession()` for the same redirect |

### 5. OAuth errors only in URL hash (`#error=...`)

| | |
|--|--|
| **Commits** | `f5e2611` |
| **Symptom** | `signup_disabled` stuck in address bar; generic failure message |
| **Cause** | Parser only read `window.location.search`, not `location.hash` |
| **Fix** | `authParamsFromUrl()` reads query **and** hash; strip hash errors after handling |
| **Do not regress** | Only checking `searchParams` for OAuth callback |

### 6. Supabase sign-ups disabled

| | |
|--|--|
| **Symptom** | `#error=access_denied&error_code=signup_disabled` |
| **Cause** | Dashboard: “Allow new users to sign up” off — first Google login is a sign-up |
| **Fix** | Enable sign-ups in Supabase; edit access still gated by `approved_users` |
| **Do not regress** | Assuming OAuth login does not create `auth.users` rows |

### 7. Hardcoded production redirect URL

| | |
|--|--|
| **Commits** | `82bf764` area |
| **Symptom** | OAuth works on one host only or fails locally |
| **Cause** | `redirectTo` pointed at fixed `https://food.danyhanna.uk` while app ran elsewhere |
| **Fix** | `getAuthRedirectUrl()` → `window.location.origin` |
| **Do not regress** | Hardcoding redirect URL unless Worker and Supabase URLs are updated together |

---

## Service worker & deploy

### 8. SW serves cached page on OAuth return

| | |
|--|--|
| **Commits** | `dfa2cba`, `862d8f2` |
| **Symptom** | “Local only” / static HTML after Google; `app.js` never runs |
| **Cause** | SW `networkFirst` on navigate returned stale shell; hash callbacks not bypassed |
| **Fix** | Skip SW for navigate when URL has OAuth `code`, `error`, or `access_token` (query or hash) |
| **Do not regress** | Caching navigations that include `?code=` |

### 9. Broken `config.js` path in `sw.js`

| | |
|--|--|
| **Commits** | `862d8f2`, `build.mjs` split `stampSw` / `stampHtml` |
| **Symptom** | Supabase never loads; sync stays “Connecting…” / local-only behavior |
| **Cause** | `build.mjs` replaced `config.js` inside `sw.js` comments/checks → invalid `pathname.endsWith("/config.js?v=...")` |
| **Fix** | Only stamp `config.js?v=` in `index.html`; SW uses `pathname.endsWith("/config.js")` |
| **Do not regress** | Running the HTML stamp regex on `sw.js` |

### 10. Worker `VERSION` not bumped after git push

| | |
|--|--|
| **Symptom** | Fixes on GitHub but old `app.js` in production |
| **Cause** | Worker still fetches `main` with old `?v=VERSION` |
| **Fix** | After push: `VERSION = git rev-parse --short HEAD` and redeploy Worker |
| **Do not regress** | Assuming push alone updates the live site |

---

## Pending approval & database

### 11. Pending list empty though users exist in Supabase Auth

| | |
|--|--|
| **Commits** | `67de67b` (`supabase-migration-auth-pending-sync.sql`) |
| **Symptom** | Users in Auth dashboard, empty “Last sign in”, not in Pending approval |
| **Cause** | `pending_approvals` only filled when browser finished PKCE; account created earlier |
| **Fix** | Trigger on `auth.users` INSERT → `pending_approvals`; backfill SQL in migration |
| **Do not regress** | Relying only on client `registerPendingApproval()` after session |

### 12. Pending upsert / RLS on repeat sign-in

| | |
|--|--|
| **Commits** | `f5e2611` |
| **Symptom** | First sign-in works; later attempts don’t refresh pending row |
| **Cause** | Blind `upsert` vs RLS SELECT requirement |
| **Fix** | Select then `update` or `insert`; owner policies in `supabase-migration-pending-owner-insert.sql` |

### 13. Approval check case sensitivity

| | |
|--|--|
| **Commits** | `supabase-migration-approval.sql`, email normalize trigger |
| **Symptom** | Approved in DB but app shows “Waiting for approval” |
| **Cause** | Mixed-case email in `approved_users` vs lowercase from Google |
| **Fix** | `.eq('email', email.toLowerCase())` + `normalize_approved_user_email` trigger |
| **Do not regress** | `.ilike` without normalized storage, or comparing raw mixed case |

---

## Symptom → first place to look

| User sees | Check |
|-----------|--------|
| **Sign-in failed** (right after Google) | §1 `readAuthCallbackFromUrl`, §2 strip order, §4 double exchange |
| **Finishing Google sign-in…** forever | §3 auth listener deadlock |
| **Local only** / 0 places after redirect | §8 SW bypass, §9 config path, §10 Worker VERSION |
| `#signup_disabled` in URL | §6 Supabase sign-ups |
| User in Auth, not in Pending | §11 auth trigger migration applied? |
| Approved in panel, still can’t edit | §13 email lowercase / `approved_users` row |

---

## Migrations (apply once per project)

Run in order on an existing FoodLog Supabase project (idempotent files are safe to re-run where noted):

1. `supabase-schema.sql` — new project only  
2. `supabase-migration-approval.sql`  
3. `supabase-migration-improvements.sql`  
4. `supabase-migration-pending-approvals.sql`  
5. `supabase-migration-pending-owner-insert.sql`  
6. `supabase-migration-auth-pending-sync.sql`  

---

## When you fix a new auth bug

1. Add a row to the matching section above (symptom, cause, fix, **do not regress**).  
2. Note the git commit hash.  
3. If it’s a release checkpoint, consider a new `stable-x.x` tag and one line in [`HOW_IT_WORKS.md`](HOW_IT_WORKS.md) stable table.
