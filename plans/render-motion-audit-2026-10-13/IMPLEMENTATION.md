# Navigation and rendering stability — implementation

Dany, the audit's navigation and layout fixes are implemented locally, with a focused vanilla JavaScript refactor. The requested `animation-performance` skill is installed and used. No React migration, application dependency installation, deployment, production data/schema change, or permission change.

## Behavior

- New navigation cancels older drawer/history/swipe callbacks. Back→Forward retargets from the presented drawer position, keeping the existing 180ms transform/opacity motion and underlay.
- Browser Back saves the outgoing restaurant's detail position before a different restaurant replaces it. Scroll, visible content, and fractional carousel positions are restored by `lib/detail-view.js`; hidden retained trees cannot overwrite a saved position.
- Background updates keep the open restaurant when it stops matching filters. Explicit desktop browse changes still select matching detail and synchronize the URL. A removed open restaurant returns phones to Places with an explanation.
- Mobile section order is set for the current detail presentation. The first review does not move Dishes/Photos to a different section. A visible content anchor preserves the reading position when content above it grows.
- Detail reconciliation retains unchanged cards in place. Selected-place detail updates wait until a drawer or carousel gesture finishes; arriving data is then shown, rather than lost.
- Map content and width updates preserve the camera. Initial pins and deliberate filter changes can fit the map. Playlist centering uses immediate scrolling under reduced motion.
- Recent/top-rated/A–Z retain their options and deterministic ties. Background updates refresh content without moving existing rows; new matches append and removed matches disappear. A reserved Update order action applies current sorting. Explicit filter/search/sort changes and manual Refresh also accept current ordering.
- Cold-cloud saved and linked location/cuisine filters retain a real option before data/catalog arrives, then resolve canonical aliases. Unknown values stay clearable and show no matches rather than silently resetting to All.
- Carousel setup reads all track positions before writing labels/disabled controls, mounts retained carousels once, and skips unchanged label writes. Detail restoration measures all tracks before changing positions.

`lib/navigation.js` owns intent cancellation, selection policy, and deterministic sorting helpers. `lib/detail-view.js` owns detail reconciliation and presentation-state preservation. The new module is included in the service-worker shell and build.

## Evidence

- Syntax/unit checks passed: **136 tests in 14 files**. Build passed.
- Final full browser suite passed: **352 passed, 16 intentional platform-specific skips**, on the final implementation. The final full run included the ordering/filter/carousel implementation. Four additional manual-refresh and viewport checks were then added and passed in the expanded 30-case focused suite. Two settled light/dark confirmation cases also passed with zero filter-summary contrast violations.
- Focused browser checks passed: **30 tests** across desktop and mobile Chromium configurations, with explicit phone/desktop viewports.
- Four browser regressions were also run against the original `24a95f8` app served by a temporary local route override. All four detected the original problems: Back→Forward showed Places under a detail URL; filtered refresh showed B instead of A; first review changed section order; camera reset made three fits and returned zoom 13→8. The temporary baseline test file was removed. These were expected negative checks, not failures of the final implementation.
- The unchanged-refresh/idle fixture recorded **zero child-node mutations** in both visible Places and detail over the tested refresh plus 850ms idle window. Row/detail node identity remained unchanged. This is evidence for that fixture and interval, not an all-time rendering guarantee.
- First-review and growing-review fixtures preserve the visible dish's vertical position within the asserted pixel tolerance. Browser Back retains the final deep scroll/carousel through another restaurant visit. Active photo swipe defers the update and shows it after touch completion.
- Impeccable detector found four advisory radius literals in existing loading placeholders, with no non-advisory finding. The new ordering action uses existing theme roles and a reserved 44px target; existing motion curves and timings remain. The hook-requested design-sidecar refresh is now complete; current typography/palette, navigation and Update order previews replace the stale metadata. The existing documented Helvetica display face is preserved with a value-specific detector exception scoped to index.html.

## Motion review

| Before | After | Why |
| --- | --- | --- |
| Older drawer/history callbacks could apply after a newer intent | All deferred navigation callbacks are guarded by the current intent | Prevent stale transitions/screens |
| Forward during a close failed to restore an open drawer | Retarget from its current transform using the existing 180ms drawer curve | Preserve interruption continuity |
| Detail reconciliation removed/reinserted unchanged nodes | Unchanged nodes stay attached; changed children are reconciled in place | Preserve focus/images/carousels and avoid needless DOM work |
| JavaScript requested smooth playlist scrolling regardless of preference | Reduced motion selects `auto` | Honor the user's motion preference |

**Verdict: approve the changed motion paths.** Movement still uses direct transform/opacity values, the existing drawer easing and duration, and reduced-motion handling. No new entrance effects, layout-property animation, or animation framework was added. The performance skill then found and fixed carousel layout thrashing, with local recorded evidence in PERFORMANCE.md. Physical touch feel and GPU dropped-frame performance still require real-device recordings.

## Limits and follow-up

Chromium emulation does not verify physical iPhone/Safari or mid-range Android GPU behavior, 60/120Hz frame delivery, weak networks, service-worker upgrades, screen-reader speech, or real production mutations. Local before/after rendering traces now quantify reduced layout work and fewer long tasks under 4× CPU throttling; see [performance evidence](PERFORMANCE.md). These are fixture measurements, not physical-phone frame-rate certification. Android inventory returned no attached device; Apple xctrace device inventory exited 137 without usable output. Real-phone profiling remains unverified.

Cold-cloud filter bootstrap is now covered directly by URL, saved-preference, Arabic-alias and unknown-filter browser regressions. The original concern is resolved locally.

The historical reproduction script now reads the original audited commit, so it remains reproducible after the source refactor. Original screenshots/findings in `AUDIT.md` describe the pre-fix state; this file records the implementation.

## Inspected fixture screenshot

The mock review arrived while the reader was looking at this dish. The dish/card stays in place; the empty tan photo is a disposable test image.

![Stable visible dish after an incoming review](/Users/danielhanna/My_apps/FoodLog/docs/audit-screenshots/2026-10-13/stable-review-mobile-chromium.png)
