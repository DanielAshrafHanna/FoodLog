# Rendering, navigation, and motion audit — 13 October 2026

Implementation follow-up: all seven findings are addressed locally, including deferred background ordering with an explicit Update order action. The cold-cloud filter issue is also fixed; `animation-performance` is installed and used. Physical-device frame profiling remains unverified. See [implementation and validation](/Users/danielhanna/My_apps/FoodLog/plans/render-motion-audit-2026-10-13/IMPLEMENTATION.md). The source locations and screenshots below describe the original audited commit.

Dany, the app has good navigation foundations, but several update and history paths can still move content or lose the user's place. This audit does not certify frame-rate performance on a phone.

Local source: `24a95f8`, clean working tree before the audit. Live `/api/health` reported the same build, channel `Design 2.0`, built `2026-10-12T18:25:00.867Z`. Live inspection used the Codex in-app browser as an anonymous reader. No production records, schema, permissions, application source, dependencies, or deployments were changed.

## What already works well

- This is a vanilla JavaScript application. React rerender advice does not directly apply. Calling `render()` does not mean every element is rebuilt: fingerprints gate work and keyed reconciliation keeps existing restaurant rows. [app.js:5674](/Users/danielhanna/My_apps/FoodLog/app.js:5674), [render-list.js:43](/Users/danielhanna/My_apps/FoodLog/lib/render-list.js:43).
- Selection changes update row classes rather than replacing row interiors. Unchanged selected detail content is isolated from unrelated restaurant updates. [app.js:5073](/Users/danielhanna/My_apps/FoodLog/app.js:5073), [app.js:5730](/Users/danielhanna/My_apps/FoodLog/app.js:5730).
- The main mobile drawer uses direct `transform`/`opacity` changes, 180ms settling, current-transform interruption, recent release velocity, and reduced-motion handling. Its deliberate dimmed/parallax underlay and zoom-lock choices are preserved. [app.js:2782](/Users/danielhanna/My_apps/FoodLog/app.js:2782), [app.js:2910](/Users/danielhanna/My_apps/FoodLog/app.js:2910).
- Height-only resize events from phone browser bars do not trigger a render; width changes are debounced. Photo markup and media boxes reserve space. [app.js:8428](/Users/danielhanna/My_apps/FoodLog/app.js:8428), [app.js:5093](/Users/danielhanna/My_apps/FoodLog/app.js:5093).
- No repeating timer that continually rebuilds the page was found. Background renders have identifiable triggers: realtime changes, auth/token changes, tab return, reconnection, queued saves/uploads, and width changes. [app.js:8190](/Users/danielhanna/My_apps/FoodLog/app.js:8190), [app.js:8198](/Users/danielhanna/My_apps/FoodLog/app.js:8198), [app.js:9240](/Users/danielhanna/My_apps/FoodLog/app.js:9240). These triggers still need to preserve the reader's context.

## Prioritized findings

Ordered by likely user impact and effort. HIGH means a major navigation/content disruption; MEDIUM means lost context or noticeably unexpected movement.

| # | Severity | Category | Location | Trigger and finding | Fix summary | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | HIGH | Interruptibility | [app.js:1524](/Users/danielhanna/My_apps/FoodLog/app.js:1524), [app.js:2735](/Users/danielhanna/My_apps/FoodLog/app.js:2735), [app.js:9256](/Users/danielhanna/My_apps/FoodLog/app.js:9256) | Phone browser Back starts a 180ms close. Forward before it finishes sees `mobileDetailOpen` still true and does not invalidate that close. The old callback can hide detail while Forward's URL still points to the place. | Every new history intent must cancel/invalidate older pending motion; retarget from the current presentation value. | Actual function excerpts reproduced the stale callback with fake timers. Rapid real-browser/phone reproduction remains needed. |
| 2 | HIGH | Selection stability | [app.js:5677](/Users/danielhanna/My_apps/FoodLog/app.js:5677), [app.js:3288](/Users/danielhanna/My_apps/FoodLog/app.js:3288) | An incoming edit can remove the open place from the current filtered subset: for example, a new rating drops A below the active minimum while B still matches. `render()` silently selects B while the phone detail remains open. Remote loading had restored A from the URL, so the screen can now disagree with the place in the URL. | Keep an open detail's identity independent of list-filter membership. Handle actual deletion explicitly; preserve all list filtering and normal selection behaviour. | Actual renderer selection prelude reproduced A→B with `mobileDetailOpen` still true and a changed filtered fixture. Whole remote/browser sequence is source-confirmed, not injected into production. |
| 3 | HIGH | Layout stability | [app.js:5437](/Users/danielhanna/My_apps/FoodLog/app.js:5437), [app.js:5457](/Users/danielhanna/My_apps/FoodLog/app.js:5457), [app.js:2720](/Users/danielhanna/My_apps/FoodLog/app.js:2720) | With no restaurant reviews, phone Dishes/Photos are above ratings. A first incoming review moves them below ratings. Restoring the same numeric scroll offset does not preserve the section under the reader. | Keep section order stable for the open presentation, or preserve a visible content anchor during updates. Keep all sections/actions. | Actual reconciliation and arrangement functions reproduced the order switch with a disposable DOM fixture. No production review was created. |
| 4 | MEDIUM | Navigation persistence | [app.js:2704](/Users/danielhanna/My_apps/FoodLog/app.js:2704), [app.js:5275](/Users/danielhanna/My_apps/FoodLog/app.js:5275), [app.js:9263](/Users/danielhanna/My_apps/FoodLog/app.js:9263) | A → scroll/change photo → browser Back → B → return to A can lose A's final detail position. Browser Back bypasses direct Back's capture. Rendering B tries to capture with B's ID while the panel still belongs to A, so the guard rejects it. | Capture the outgoing panel before changing selection or removing its contents; cover every navigation exit. | Actual capture function confirmed the incoming-ID guard rejects outgoing view state. Whole journey inferred from confirmed call sites. |
| 5 | MEDIUM | Navigation stability | [app.js:3721](/Users/danielhanna/My_apps/FoodLog/app.js:3721), [app.js:5775](/Users/danielhanna/My_apps/FoodLog/app.js:5775) | Map fitting runs on every map render. Width changes and list-affecting refreshes can discard a chosen map camera even when coordinates stay the same. | Fit initially or after a deliberate fit request/changed filter result; preserve the camera for content-only updates. | Live: Zoom in changed tiles from z8 to z9; resizing 1440→1400px reset them to z8. Screenshots 6–7. Data-refresh trigger confirmed from code, not injected into production. |
| 6 | MEDIUM | Background-update stability | [app.js:3582](/Users/danielhanna/My_apps/FoodLog/app.js:3582), [render-list.js:67](/Users/danielhanna/My_apps/FoodLog/lib/render-list.js:67), [app.js:3154](/Users/danielhanna/My_apps/FoodLog/app.js:3154) | Recent/rating changes immediately reorder rows. The existing single-row anchor helps, but neighbours can move. Equal sort values also lack an explicit stable tie-breaker. | Add deterministic ties; decide whether changed ordering should wait until a deliberate refresh while the user is reading/scrolling. Preserve current sort options. | Source-confirmed mechanism. Live count changed 33→34 before the captured flow, showing a real background update; the effect on a reading/scrolling user was not isolated. This is a product-policy decision, not a claim that sorting is inherently wrong. |
| 7 | MEDIUM | Accessibility | [app.js:3742](/Users/danielhanna/My_apps/FoodLog/app.js:3742), [app.js:8675](/Users/danielhanna/My_apps/FoodLog/app.js:8675), [styles.css:6975](/Users/danielhanna/My_apps/FoodLog/styles.css:6975) | Playlist selection explicitly requests JavaScript smooth scrolling even with reduced motion; CSS's default `scroll-behavior:auto` does not override that explicit request. | Use `smooth && !prefersReducedMotion()` when choosing scroll behaviour. | Actual scroll function reproduced a `smooth` request with a reduced-motion stub. Physical device/accessibility preference testing remains needed. |

Findings 1–3 should be addressed before motion polish.

## Follow-up hypotheses and missed opportunities

- A selected-place refresh during an active photo swipe may snap the track: detail reconciliation removes/reinserts children and restoration rounds to a carousel index. This needs a mocked mid-gesture refresh test before it becomes a confirmed defect. [app.js:5198](/Users/danielhanna/My_apps/FoodLog/app.js:5198), [app.js:2708](/Users/danielhanna/My_apps/FoodLog/app.js:2708).
- If Dany chooses deferred background ordering, a quiet “Updates available” affordance could keep fresh data available without moving rows under the reader. Do not add it unless that policy is chosen.
- Where a genuine new review/photo changes height, retain the visible item first; a short, local acknowledgement can then explain the update. Avoid full-page crossfades or replaying all list entrances.
- `filteredRestaurants()` and several count/fingerprint calculations repeat during render. This is a profiling candidate for large journals, not evidence of dropped frames. Measure first; do not blanket-add memoization, `will-change`, or an animation framework.

## Captured flow

All images below were saved from this audit run. The first attempted return screenshot showed an unfinished transition and was replaced with the settled capture. The first attempted desktop capture still had phone sizing and was replaced after applying the override to the correct tab.

1. **Phone Places — healthy settled layout.** 390×844 viewport; root client/scroll width 384px. No horizontal overflow in this state. Background data had settled at 34 places. No claim of idle mutation counts.

![Phone Places](/Users/danielhanna/My_apps/FoodLog/plans/render-motion-audit-2026-10-13/01-phone-places.jpg)

2. **Phone Garten detail — healthy ordinary open path.** Root width remained 384px. Visible Back and Dishes/Reviews/Photos navigation remained available. This screenshot is at rest, not a frame-rate trace.

![Phone detail](/Users/danielhanna/My_apps/FoodLog/plans/render-motion-audit-2026-10-13/02-phone-detail.jpg)

3. **In-app Back — healthy ordinary return.** URL returned to `/`; focus returned to Garten; document `scrollY` was 1983.5; root width remained 384px. The row click had automatically scrolled Garten into view, so this does not prove restoration to the pre-click top-of-page position.

![Phone return](/Users/danielhanna/My_apps/FoodLog/plans/render-motion-audit-2026-10-13/03-phone-return.jpg)

4. **Phone filter sheet — healthy settled geometry.** Sheet width/root client width 384px. Close and Apply are visible. No filter values were changed; full keyboard, speech, and contrast compliance were not tested.

![Phone filters](/Users/danielhanna/My_apps/FoodLog/plans/render-motion-audit-2026-10-13/04-phone-filters.jpg)

5. **Desktop Places/detail — healthy settled layout.** 1440×900 viewport; root client/scroll width 1434px; list ≈613.8px; detail ≈750.2px. No horizontal page overflow in this state.

![Desktop Places](/Users/danielhanna/My_apps/FoodLog/plans/render-motion-audit-2026-10-13/05-desktop-places.jpg)

6. **Desktop Map, user zoom — healthy zoom response.** Zoom in changed loaded map tile zoom from 8 to 9 at 1440px. This sets up the next stability check.

![Zoomed map](/Users/danielhanna/My_apps/FoodLog/plans/render-motion-audit-2026-10-13/06-desktop-map-zoomed.jpg)

7. **Desktop Map, width change — unexpected reset.** Changing width to 1400px caused loaded tile zoom to return to 8 and showed all markers again. This supports finding 5. Captured browser warn/error logs were empty for this run. Returned to List and reset the temporary viewport after capture.

![Reset map](/Users/danielhanna/My_apps/FoodLog/plans/render-motion-audit-2026-10-13/07-desktop-map-reset.jpg)

## Verification and limits

- Passed syntax checks for `app.js`, `lib/navigation.js`, `lib/render-list.js`.
- Ran `node plans/render-motion-audit-2026-10-13/reproduce.mjs`: five reproductions confirmed the suspected mechanisms using source excerpts, disposable jsdom nodes, stubs, and fake timers. The fixtures deliberately assert current faulty outcomes; they are not fixed-behaviour regression tests and do not execute the whole app.
- Reviewed existing unit/browser tests for row/detail identity, browser Back, swipe-close, viewport width, photo geometry, reduced-motion styles, and list scroll/focus. The normal paths have coverage; the seven cases above need targeted additional coverage. Existing suite was not rerun during this read-only audit; previous release test results are not treated as current evidence.
- Browser inspection confirmed the normal live flow and map resize defect. It did not measure actual DOM replacement counts over idle time, Core Web Vitals, dropped frames, long tasks, or input latency. The browser's read-only evaluation scope did not expose `performance`; no profiler was available here.
- No physical iPhone/mid-range Android, 60/120Hz frame trace, slow-network cold load, service-worker upgrade, signed-in save journey, long gallery gesture, or full accessibility/screen-reader validation. Screenshots cannot prove those properties.
- Before calling the experience “fluid”, record navigation and updates on representative phones. Use roughly 16.7ms/frame at 60Hz and 8.3ms/frame at 120Hz as frame budgets; check both user-input shifts and background shifts rather than relying on CLS alone. Google explains that recent-input shifts are excluded from CLS. [Google CLS documentation](https://web.dev/articles/cls).

## Online skill research

The best additional skill for this app is **animation-performance**, from Emil Kowalski's own [skills repository](https://github.com/emilkowalski/skills). Its [full source](https://github.com/emilkowalski/skills/blob/main/skills/animation-performance/SKILL.md) covers frame budgets, layout/paint cost, CSS/WAAPI versus frame-by-frame JavaScript, inherited CSS variables, blur, and measured use of `will-change`. These topics fit this vanilla JavaScript app. The [directory listing](https://www.skills.sh/emilkowalski/skills/animation-performance) showed about 4.4K installs; the source repository showed about 45.8K stars when checked. Counts change and are supporting signals, not guarantees.

Optional install command (not run):

```sh
npx skills add https://github.com/emilkowalski/skills --skill animation-performance
```

Already available locally: `improve-animations` for this audit, `review-animations` for reviewing the resulting changes, `animate` for implementation, and `apple-design` for physical motion/gesture principles. There is no need to reinstall those. The [author's repository descriptions](https://github.com/emilkowalski/skills#reference) confirm those scopes. React best-practices is a reputable skill, but is not the primary tool for an app that does not use React.

Google's [layout-shift debugging guidance](https://web.dev/articles/debug-layout-shifts) and [layout-thrashing guidance](https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing) support capturing traces, reserving image/font space, and investigating browser work before making performance claims.

Recommended next scope: fix findings 1–5 and 7 with focused local browser regressions; choose the update-order policy for 6; then run phone performance traces. Detailed implementation plans have not been created and fixes have not been applied.
