# FoodLog UX and backend audit — 2026-09-05

## Outcome

FoodLog's core browse, capture, review, recovery, and group-picking features remain intact. This pass removes the largest review-writing friction, fixes a saved-view state mismatch that could render an empty mobile Places surface, improves session recovery and mobile accessibility, and prepares safer database and deployment changes without applying them to production.

## Screenshot evidence

The verified local build was reviewed at 320, 390, 768, and 1440 CSS pixels in light and dark themes. Evidence is stored in `docs/audit-screenshots/2026-09-05/`:

- `01-places-320-light.png` and `02-places-320-list.png`: the small-phone Places queue grows in normal page flow, displays restaurant tickets beneath the playlist rail, has no horizontal overflow, and stays clear of the fixed dock.
- `03-places-390-light.png` and `04-place-detail-390-light.png`: large-phone browsing and focused restaurant detail.
- `05-rating-dialog-390-light.png`: focused restaurant rating; score ownership is explicit and the full restaurant editor is separate.
- `06-add-restaurant-390-light.png`: name-first restaurant capture with optional details progressively disclosed.
- `07-dish-review-390-light.png`: review-only dish workflow with draft protection.
- `08-places-detail-1440-dark.png`: desktop list/detail composition and dark theme.
- `09-place-detail-768-dark.png`: tablet detail layout and dark theme.

The 320px result was compared directly with the earlier 390px public baseline. The hierarchy and controls remain familiar; the narrower layout wraps visit filters and preserves a visible first restaurant ticket rather than producing a blank list.

## UX findings and changes

### Browsing and responsive layout

- Root cause fixed: a stored `panelView: map` could be restored while `activeSurface` still said `places`. `renderList()` then exited into map rendering while the Places layout stayed visible, yielding a correct count but zero tickets. Startup now keeps both state fields aligned, and URL state still takes precedence.
- The existing WebKit safeguard remains: `content-visibility` is disabled for ticket rows at widths up to 980px. Desktop keeps the large-list optimization.
- Mobile controls and form fields are at least 44px. The bottom navigation remains clear of scroll content and exposes visible alternatives to swipe/long-press shortcuts.

### Restaurant ratings

- Restaurant detail now has a focused **Add your rating** / **Edit your rating** action.
- It writes only the current user's existing `restaurant_ratings` record and supports recoverable Trash.
- **Edit restaurant details** remains a separate action; the full editor and all existing fields are preserved.

### Dish reviews

- The current user's review appears first; the rest are newest-first.
- Each review shows a safe, locale-formatted last-updated time when the timestamp is valid.
- Rating and note drafts persist in `sessionStorage` for the current tab and can be explicitly discarded.
- **Edit dish details** and **Edit your review** are distinct. Existing dish editing, owner moderation, rating, notes, long-press access, and Trash/restore behavior remain.

### Validation, loading, offline, and error recovery

- Existing focusable error summaries, inline errors, duplicate checks, submit locking, skeletons, status regions, offline fallback, and draft retention remain.
- Missing or expired refresh tokens now clear only the stale local auth session and show: **Session expired — sign in again**.
- Reduced-motion rules now target animated components rather than disabling transitions globally.

## Backend reliability and security

- All 16 public tables had RLS enabled in the read-only production baseline audit.
- A forward-only migration wraps per-row Supabase auth helpers in statement-cached `select auth.*` expressions while preserving policy names, roles, commands, permissiveness, grants, and permission logic.
- Database contract SQL verifies anonymous reads, editor-owned rating/review writes, owner moderation metadata, recoverable Trash rules, RLS coverage, and aggregate return shapes.
- `get_want_to_go_totals()` and `get_decision_vote_totals()` intentionally remain public `SECURITY DEFINER` aggregates because anonymous browsing needs group totals. Tests require ID/count-only return types and reject identity fields.
- Eight currently unused indexes and 11 intentional overlapping-permissive-policy findings are accepted for this pass; neither is removed or consolidated.

The migration and leaked-password setting are not applied yet. The approved plan requires isolated verification and Dany's explicit production-rollout approval first. After approval, rerun Supabase security/performance advisors and require zero `auth_rls_initplan` warnings; document the two intentional aggregate functions and any remaining accepted index/policy findings.

## Ranked future backlog — not implemented

1. **Guided Visit Recap** — a short post-visit flow that can rate the restaurant and several dishes without opening each editor.
2. **Needs my review** — filter visited places/dishes where the signed-in user has not added a rating or review.
3. **Friend activity feed** — a compact, privacy-conscious feed of recent additions and reviews.

## Remaining rollout risks

- The RLS migration still needs a disposable/local Postgres run or an isolated Supabase branch before production. Local Docker/Postgres was unavailable in the earlier environment check.
- Leaked-password protection is a production Auth setting and remains unchanged until approval.
- Direct Safari automation is unavailable locally. The 320px regression verifies real layout boxes and normal-flow list height in Chromium; the WebKit workaround itself remains width-scoped and browser-independent.
- Cloudflare Workers Builds must be connected in the dashboard before pushes become automatic deployments.
