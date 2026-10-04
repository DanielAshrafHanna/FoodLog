# Conservative code cleanup — October 4, 2026

Baseline: commit `425e85a` on `design2.0`. This cleanup preserves the existing features and interface. No database, permissions, dependencies, stored data, or publication changes are included.

## Changes

- Removed seven module-private helpers with no callers: `getOAuthCodeFromUrl`, `restaurantPhotoToRow`, `saveRestaurantCaptureRemote`, `saveDishRemote`, `syncPlaylistLookup`, `importDishToRemote`, and `importRestaurantPhotoToRemote`. Syntax-tree reference counts and repository searches confirmed that only their declarations remained. The active reliable-save, import, photo, playlist, and authentication paths remain.
- Removed five unused cached element references and three handlers for previously removed Cancel controls. Dropped two unused lookup-controller bindings while preserving both initialization calls and their event handlers.
- Consolidated restaurant/dish disclosure construction and field-reveal traversal into `createCaptureDisclosure` and `revealCaptureField`. Removed empty guide methods and calls that performed no action. Draft restoration, validation, accordion behavior, and save actions remain.
- Removed 124 earlier root-level CSS declarations repeated later with the same selector, property, value, and priority. Removed obsolete Cancel-control selectors and empty rules. Kept uncertain rules, dynamic states, fallback paths, public library exports, assets, and migrations.
- Updated the source safety contract to check the currently used reliable-save RPCs. The original capture migration remains checked for its function, permissions, and non-destructive behavior.

## Measured reduction

| Source | Before | After | Net lines removed |
| --- | ---: | ---: | ---: |
| `app.js` | 10,053 | 9,940 | 113 |
| `styles.css` | 9,461 | 9,306 | 155 |
| Total | 19,514 | 19,246 | **268** |

The source diff removes 299 lines and adds 31 replacement lines: **268 fewer lines overall**, excluding documentation and tests. The two source files are 8,742 bytes smaller uncompressed, or 1,348 bytes smaller using a local gzip comparison. These are file-size measurements; no load-time or runtime-speed improvement is claimed.

## Verification

- Production build and all 126 unit/source checks passed.
- A temporary local comparison captured 14 UI states at 320, 390, 515, and 1,280px in both themes: 112 states total. All computed CSS properties, element dimensions, and captured DOM topology matched the pre-cleanup baseline exactly. It covered browsing, filters, Settings, playlists, restaurant forms, dish forms, reviews, photos, details, and action menus. The temporary test used disposable fixtures and blocked non-local requests.
- The full desktop/mobile browser suite passed: 262 passed, 12 existing skips. It includes mocked-cloud saves, import, permissions, photo recovery, drafts, navigation, reviews, likes, prices, and playlist flows. `git diff --check` also passed.

Live production writes and physical-device behavior were not tested. Automated cloud checks use mocked responses; production records and schema were not touched. Larger architectural rewrites and deletion of potentially useful compatibility modules were intentionally outside this cleanup.
