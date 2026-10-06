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
- Location/cuisine selection searches preferred names and aliases, offers familiar cuisine choices, and requires explicit confirmation to create a missing shared entry. Both fields stay optional; no owner-only creation restriction is added.
- Lookup identity uses conservative case/spacing/Unicode equality and registered aliases. Fuzzy matches are suggestions, never automatic merges. Production spelling changes and uncertain geographic/category merges require a reviewed mapping.
- The group browses through search, filters, sorting, playlists, list view, and map view.
- People record individual restaurant and dish opinions, mark places they want to visit, and share direct links.
- Approved editors authenticate through Supabase. The superuser handles approvals, imports, exports, and administration.
- The product runs as a responsive website and installable PWA, commonly used on phones while discussing where to eat.

## Capabilities and Constraints

Restaurant prices are approximate EGP per person: Quick bite 0–450, Casual 450–1,200, Treat 1,200–2,000, and Splurge 2,000+. Existing price tiers retain their stored codes. New restaurants start with “Not sure yet”; an unspecified price has no price tag and can be selected again to clear a tier. The restaurant form has no manual Visited by picker: Visited/Mark as visited records the current person's display name; earlier visit names stay saved. This history is not an account-linked attendance system.

- Preserve restaurants, dishes, photos, ratings, reviews, visited/liked state, Bookmarks, playlists, search, filters, sorting, list/map views, deep links, realtime sync, approval workflows, themes, import/export, admin controls, and PWA behavior.
- The implementation remains vanilla HTML, CSS, and JavaScript with Supabase and a Cloudflare Worker.
- Production data, schema, storage, and deployment stay untouched until local and isolated staging verification is complete and Dany explicitly approves production rollout.
- No existing feature may be removed, disabled, replaced, or materially reduced without Dany's explicit approval.
- Destructive content actions must be recoverable through an indefinite Trash system. Storage files associated with trashed content are retained.
- “Pick Our Next Place” is a first-class group workflow: friends build a shortlist, cast up to three votes, and close the session to persist one result.

## Brand Commitments

- Product name: FoodLog.
- Logo: Dany's supplied green-and-gold leaf/map-pin artwork (October 4, 2026), used consistently across the header, browser tab, and installed app. Preserve the supplied artwork and colors.
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

The owner account can manage location/cuisine labels in Settings. Renaming retains old aliases and stable IDs; deleting removes an entry from suggestions while retaining saved associations and offering Restore. Ordinary editors cannot invoke catalog administration. Dany explicitly confirmed New Cairo/tagamo3/tagamoo3 equivalence on 2026-10-03; these now share New Cairo, including the existing typo New cauro. Other ambiguous names remain separate.


## Dish capture and contributions

Add dish follows the restaurant form: name first, optional More details, persistent Save, and Save & add another. Preserve rating, review, earlier liked-by names, camera/library selection, drafts, and recoverable Trash. Approved contributors can add/edit their review and add photos using visible controls on each dish; Edit dish details is a quiet visible shortcut to a dedicated name-only dialog. More contains only whole-dish Trash for dish managers, including all its photos and reviews; long press remains an alternative. Personal review Trash stays in the review editor and review actions. Add photos opens a photo-only dialog and never modifies reviews or their drafts. A device-storage failure attempts direct photo upload from the live selection; a failed upload keeps Retry available and clearly explains when no reload recovery copy exists.


## Account access

Viewing remains public. Signed-out visitors can continue with Google directly above the journal or on phone restaurant details, and use email from a shared sign-in/create-account dialog. Creating an email account confirms the address before sign-in when the provider requires it. Authentication never grants editing by itself: the existing approved_users check and owner approval remain authoritative. Unapproved accounts can browse and check approval from the visible status strip.


## Account-owned dish likes

Dish creation and detail editing have no editable Liked by field. A separate card row lets approved people add/remove their own like, shows the group’s names and initials, and opens a non-modal people panel. Likes do not require a review or dish ownership and never change ratings/photos. Earlier text names remain visible as Earlier likes; do not guess account matches or erase them. Account reactions use the additive dish_likes migration, applied to production on 2026-10-03 with Dany’s explicit approval; existing table contents and approval policies were verified unchanged. Existing owner approval stays authoritative. Cloud reactions require a connection; device-only mode persists one local identity.

## Restaurant browsing and creation navigation

The phone restaurant list has no Places dock: one labeled Add restaurant floating action opens the existing form directly for approved editors/local-only mode. Existing account access remains visible for visitors; waiting accounts still require owner approval. The floating action hides during forms, popovers, input focus, and restaurant details, where Add dish/review/photo actions remain contextual. Back to places, history, swipe, list filters, scroll, and drafts remain intact. Desktop retains a List / Map switch and header Add restaurant. Phone layouts show a usable list for saved Map preferences/links while retaining the desktop preference.

## Playlist creation

Approved cloud editors and local-only editors can create a playlist from the trailing + on the Playlist rail using a name-only New playlist dialog. An empty playlist is a saved destination, survives reload, and becomes selected without changing other browse filters. Add restaurant inherits the selected playlist; existing restaurants can join through Edit restaurant. Empty local playlists support the existing rename, Trash, and Restore workflow.

Creation trims and collapses whitespace, checks Unicode compatibility/case/spacing equivalents, reserves filter names, and directs names already in Trash to restoration. Failed saves retain the entered name for retry. The existing cloud approval policies remain authoritative; no new permissions or migration is required. Restaurant-array exports keep their existing format and omit standalone empty playlist catalogs.

## Menu dismissal and dish capture sizing

Menus have one accessible header X; footers contain task actions rather than duplicate Cancel/Close controls. Inline Cancel rename still exits its Settings subtask. Add dish fits its content, expands up to the viewport limit, and scrolls optional details while retaining Save dish and Save & add another. Existing draft recovery, approval requirements, and upload retry behavior remain.

## Restaurant capture and visit context

Add restaurant is a quick capture: Restaurant name or Maps link → Location/Cuisine → Been there? (Not yet / Yes) → extras → Save. Complete Maps links use existing parsing/resolution to fill only empty fields, with a compact preview and undo that preserves manual edits. Failed checks retain the URL and offer Retry; closing/editing/saving cancels stale checks. Only the name is required; Save explains its disabled state until a trimmed name exists. Metadata uses inline add/value buttons opening the existing searchable pickers. Independent Price, Playlist, Photos, and Note buttons reveal sections and stay filled/open when populated; private Bookmark remains visible for new entries. Yes reveals personal rating/review; Not yet retains hidden opinions and requires a decision before saving. Edit preserves existing content and historical visits, uses the same filled/open layout, and keeps private Bookmarks on the restaurant page. Note and review retain distinct storage/authorship.

Playlist membership uses searchable checkbox rows and explicit creation, preserving selection through filtering. Exact case/Unicode/spacing-equivalent names reuse the existing choice. New choices save with the restaurant; empty-playlist creation remains on the rail. Membership and drafts use arrays so commas inside names never split an entry.
