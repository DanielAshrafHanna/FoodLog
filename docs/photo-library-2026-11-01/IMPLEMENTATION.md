# Restaurant photo library (2026-11-01)

**Navigation superseded locally, 2026-11-01:** [Unified place tabs](../place-tabs-2026-11-01/IMPLEMENTATION.md) put the complete library directly in Photos, replacing the six-tile preview and library dialog. Tiles, attribution, management permissions and photo-to-dish data rules below remain; later compact viewer actions also supersede the original stacked buttons.

Status: live on `design3.0` as `ac88597` (2026-11-01). Health reported ok / Design 3.0 / `ac88597` at 2026-11-01T11:43:55.733Z. HTML and service-worker stamps matched. Live `app.js`, `styles.css`, `lib/photo-library.js`, `lib/photo-gallery.js` and `lib/photo-queue.js` SHA-256 hashes matched source.

## Request

Dany asked for a quick, clean way to add, view and manage every image for a restaurant: one grid that includes dish photos, shows whether a photo belongs to a dish, and lets a place photo become a dish.

## Decisions

- **No new sub menu.** The Photos section stays in the restaurant page's section navigation. It now opens one library dialog instead of adding another destination.
- **Photos section:** "Photos (N)" counts place and dish photos together. A 3-column preview shows up to 6 tiles; when there are more, the 6th becomes "+K". "See all" and "Add photos" sit beside the heading. Add photos and "No photos yet." remain when empty.
- **Hero button:** when a place has more than one photo, a quiet "N photos" pill sits on the cover photo and opens the library. This replaced an earlier idea of a thumbnail strip, which would have repeated the preview grid.
- **Library dialog** (`#photoLibrary`): centered on desktop (max 1040 × 760px), full screen on phones (≤680px) with safe areas. Segmented filter All / Place / Dishes with counts; Dishes groups photos under each dish name. Add photos is visible only to editors (or local-only mode).
- **Tiles:** square, borderless, no controls on the tile. Dish photos carry a dish icon and name on a bottom scrim; the main photo carries a "Main photo" badge. Tiles show no credits; the credit lives in the viewer caption and the tile's accessible name.
- **Viewer:** the shared full-screen viewer now allows up to three actions:
  - Set as main (place photos only, restaurant managers);
  - View dish (dish photos) or Make it a dish (own place photos);
  - Move to Trash (by permission, inline confirm, recoverable).
  On phones the actions stack icon over label so three fit without wrapping.
- **Make it a dish:** offered only for place photos the signed-in editor uploaded (or local-only mode). Attribution rules make a copy belong to whoever inserts it, so offering it on someone else's photo would re-attribute their image. Flow:
  1. The library closes and a fresh Add dish form opens with the photo attached.
  2. When the dish and its photo commit (possibly in a later session through the persisted upload queue, via `sourcePhotoId`), the original place photo moves to the recoverable Trash, so it is not shown twice.
  3. The main photo of the place is never moved; it stays as the main photo and the dish gets a copy.
  If moving the original fails, the original is kept and a warning is logged.

## Files

`lib/photo-library.js` (new, in the `sw.js` app shell), `lib/photo-gallery.js` (`canCover`, `extraAction`, `onClose({handedOff})`, `galleryLabel` caption), `lib/photo-queue.js` (`sourcePhotoId`), `app.js`, `index.html`, `styles.css` ("Photo library (2026-11-01)" layer).

## Validation (local, disposable fixtures only)

- Unit: `tests/photo-library.test.js`, new cases in `tests/gallery-behavior.test.js`; full Vitest suite passes.
- Browser: `tests/photo-library.e2e.spec.js` (filters, counts, axe, focus return, viewer actions, View dish, Make it a dish with and without the main photo, empty restaurant) on desktop and phone; full Playwright suite passes with the same skips as before.
- Design detector: no new findings relative to HEAD.
- Screenshots: `shots/` (desktop and Pixel 7, light and dark), captured with `capture.mjs` against a local server only.

## Known limits

- Dish-cover changes stay in each dish's own viewer.
- Not yet checked on a physical phone or against live data.
