# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

FoodLog is primarily for Dany and a small group of friends who regularly collect restaurants they want to try, remember places they enjoyed, and compare opinions after eating together. Visitors may browse the shared collection without signing in. Approved editors maintain the collection, and a superuser manages access and data administration.

## Product Purpose

FoodLog is a shared memory and decision tool for eating out. It keeps restaurant plans, visits, dishes, photos, ratings, and personal reviews together so the group can remember what was good and decide where to go next. Success means adding an experience is quick, everyone can find useful context later, and choosing the next restaurant requires less back-and-forth.

## Positioning

Unlike a generic map bookmark list or a public review site, FoodLog combines a trusted friend group's restaurant list, dish-level opinions, individual ratings, photos, playlists, and shared decision-making in one private-to-edit but public-to-browse journal.

## Operating Context

- Friends add restaurants before or after a visit and attach location, cuisine, price, links, photos, dishes, ratings, and notes.
- The group browses through search, filters, sorting, playlists, list view, and map view.
- People record individual restaurant and dish opinions, mark places they want to visit, and share direct links.
- Approved editors authenticate through Supabase. The superuser handles approvals, imports, exports, and administration.
- The product runs as a responsive website and installable PWA, commonly used on phones while discussing where to eat.

## Capabilities and Constraints

- Preserve restaurants, dishes, photos, ratings, reviews, visited/liked state, Want to go, playlists, search, filters, sorting, list/map views, deep links, realtime sync, approval workflows, themes, import/export, admin controls, and PWA behavior.
- The implementation remains vanilla HTML, CSS, and JavaScript with Supabase and a Cloudflare Worker.
- Production data, schema, storage, and deployment stay untouched until local and isolated staging verification is complete and Dany explicitly approves production rollout.
- No existing feature may be removed, disabled, replaced, or materially reduced without Dany's explicit approval.
- Destructive content actions must be recoverable through an indefinite Trash system. Storage files associated with trashed content are retained.
- “Pick Our Next Place” is a first-class group workflow: friends build a shortlist, cast up to three votes, and close the session to persist one result.

## Brand Commitments

- Product name: FoodLog.
- Working redesign name: Table Notes.
- Voice is direct, warm, and functional. Controls use plain verbs and error messages explain recovery.
- The interface should feel like a contemporary shared dining journal, not a generic analytics dashboard.
- Both light and dark themes remain supported.

## Evidence on Hand

- The repository contains a working production interface and real product copy in `index.html`, `styles.css`, and `app.js`.
- `REGRESSION_GUIDE.md` records behavior that must remain intact, particularly OAuth/PKCE callback handling, service-worker behavior, version stamping, mobile layout, ratings, bookmarks, and playlists.
- `supabase-schema.sql` documents the current database, RLS, triggers, and storage model.
- The production collection already contains real restaurants, dishes, ratings, reviews, photos, playlists, and editor accounts. That content must never be copied into local fixtures or visual mockups without explicit permission.

## Product Principles

1. Protect shared memories before optimizing convenience.
2. Make the next useful action visible without hiding advanced controls.
3. Preserve each friend's opinion instead of flattening the group into one score.
4. Keep browsing fast and welcoming while making editing deliberate and accountable.
5. Prefer recoverable, logged changes over irreversible operations.

## Accessibility & Inclusion

Core workflows must be operable with keyboard, touch, and assistive technology. Visible labels, focus states, reduced-motion support, clear contrast, 44px minimum touch targets, and responsive layouts are required. Gesture shortcuts may supplement but never replace visible controls.
