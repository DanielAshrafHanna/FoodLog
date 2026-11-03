# Navigation, loading and rendering audit — 3 November 2026

Status: source `e97def2` pushed to `origin/design3.0` at Dany’s request. Post-push production health was ok on previous build `dd73372`; rollout of this change remains unverified. No production data, permissions, schema, authentication or upload pipeline changes. All measurements and tests use disposable local fixtures and mocked/blocked external requests.

## Outcome and scope

Dany reported a laggy restaurant swipe-right dismissal and requested another site-wide review of navigation, loading and rendering. Animation Performance and Improve Animations informed the diagnostic pass; implementation follows the measured performance findings and existing project decisions. Source baseline: `dd73372`.

Reviewed: drawer open/back/forward/drag/reversal, list and detail reconciliation, collection loading and optional Likes, filters/order/playlist controls, cold lookup boot and manual refresh, map camera updates, tabs/scroll/focus retention, carousels, viewer loading/paging/pinch/pan/dismissal, lookup menus and native dialogs, contextual capture/save flows, auth/startup and service-worker release continuity.

## Confirmed findings and fixes

| Finding | Change | Preserved behavior |
| --- | --- | --- |
| Swipe start/release changed gesture classes then read `window.innerWidth` while presenting the drawer. Traces showed synchronous style recalculation inside input handlers. | Reuse the existing resize-updated viewport width for presentation progress/offscreen targets. Move its initialization ahead of drawer state. | 180ms duration/curve, direct transform/opacity movement, live dimmed/parallax underlay, recent velocity, cancellation/reversal, intent ownership, covered inert content and queued row taps. |
| Restoring photo positions measured tracks together, then dispatched one scroll handler per track. Each handler reread width between pagination writes. | Reuse the batch-measured index via mounted-carousel WeakMap callbacks. Geometry capture also reuses each measured panel/anchor rectangle. | Fractional photo offsets, visible-content anchors, labels/disabled controls, keyed nodes/focus, real subsequent native scrolling and unseen-place reset. |
| Pan/pinch measured viewport dimensions and rewrote zoom ARIA/SVG/class metadata on every pointer move. | Cache bounds for the active gesture, refresh on viewport/context resize, and update zoom chrome only when zoomed/unzoomed state changes. | Clamping, resized bounds, wheel/keyboard zoom, second-finger handoff, paging cancellation, load/decode readiness and per-photo reset. |
| Identical lookup responses cleared list/detail fingerprints and forced unnecessary later reconciliation. | Invalidate only when catalog content or canonical record labels/IDs actually change; save restaurant cache only after real label changes. | Real catalog/alias changes, readiness/cache persistence and cold linked filters. New regression verifies both unchanged refresh and a real rename. |
| Removing that incidental invalidation exposed a Map dependency on a list repaint even when a deliberate filter kept identical matching IDs. | Include the browse-query fingerprint in Map rendering eligibility; its existing camera policy decides when to fit. | Background updates preserve the camera; deliberate filter changes still refit, including an unchanged result set. |

A further reversal regression surfaced under repeated testing: when recent dismissal samples shared a clock tick (or only the release remained in the time window), the old fallback could reuse downward carried momentum after an upward segment. Velocity now uses the last segment with a minimum 1ms denominator when needed. Existing thresholds, spring and release timing remain. A fixed-clock unit regression proves the upward release returns rather than closes; browser re-grab/reversal checks pass. The test also batches the final flick’s move/up events so assertion round trips do not change the gesture being tested.

No new animation, framework, dependency, GPU-layer hint or CSS treatment was introduced. Per-event velocity samples remain untouched; rAF coalescing was not added without evidence of redundant events per frame. The existing mobile content-visibility exception, visual texture/shadow and functional accordion height motion remain deliberate.

## Local performance evidence

[Recorder](profile.mjs), [baseline data](baseline-results.json), [final data](final-results.json). Chromium version is recorded in the JSON. Fixture: 40 invented places, 20 dishes each, mocked two-photo tracks; one native-touch cancelled swipe and one native-touch committed dismissal per run. Three fresh contexts at normal CPU and three at 4× slowdown per version; startup excluded. Baseline source is routed from Git without modifying the working tree.

Median of each run’s worst input-handler duration:

| Measure | Baseline 1× | Final 1× | Baseline 4× | Final 4× |
| --- | ---: | ---: | ---: | ---: |
| Swipe pointermove | 6.68ms | 0.46ms | 9.74ms | 1.19ms |
| Swipe pointerup | 6.37ms | 0.41ms | 13.66ms | 1.11ms |

Representative traces: [baseline 4×](baseline-4x-2.trace.json.gz), [final 4×](final-4x-2.trace.json.gz). Decompress and import into Chrome DevTools Performance. Baseline long pointermove/release handlers contain UpdateLayoutTree work affecting 848–1,568 elements; the presentation path no longer synchronously requests that flush after its writes.

This moves and reduces avoidable synchronous input work. Whole-sequence style/paint totals and rAF sampling do **not** improve uniformly; these are not compositor/GPU dropped-frame counts. CPU slowdown is not a phone GPU simulation, and no universal 60/120fps claim is made.

A separate synthetic restoration probe found 3/39/99 forced layouts for 4/40/100 carousels before, versus zero measured forced layouts immediately inside restoration afterward. The browser regression allows at most two for 40 tracks and separately checks all positions/labels. Three unchanged mocked desktop refreshes previously created a new reconciliation template each time; the new regression verifies none, then verifies a real catalog change does repaint.

## Validation

- Syntax/unit checks: **167 passed**. A pan regression checks reused bounds, clamping and no redundant zoom metadata writes over 30 moves.
- Broad browser coverage includes a complete 486-pass/28-platform-skip run before the final velocity fallback correction (two reversal cases exposed that defect). After correction, eight focused performance/gesture cases passed, then 11 isolated stress/gesture/render cases passed with one platform skip, using existing limits. Coverage includes capture, photo byte recovery/retry/idempotency, auth/access, drafts/Trash, navigation/gesture interruption, native phone touch, Map, tabs, filters, viewer readiness and loading failures.
- The first complete run passed 485 checks, with 28 platform skips and one outdated assertion from the preceding compact-filter task. That assertion still measured overflow on the old inner chip rail. It now measures `.browse-results`, the actual native scrolling surface; application filtering behaviour was not altered for this correction. The corrected case and all new performance/resize scenarios passed in an eight-case focused confirmation before the final whole-suite run.
- The second complete run isolated the reversal sampling edge case described above; its six repeated pre-fix cases failed four times. After correction, the eight focused performance/reversal/resize cases passed. No new test skip or gesture threshold relaxation was used.
- A new browser test checks zoomed-pan clamping after a viewport resize while the pointer remains active. Catalog tests check both equality and real changes; existing Map test verifies the restored deliberate-refit contract.
- Visual verification used invented text and flat synthetic images, not production photos: [phone mid-drag](phone-drag.png), [desktop gallery zoom](desktop-gallery.png); [capture script](verify-visual.mjs). These verify the retained drawer/underlay and viewer geometry, not photo quality.
- Historical screenshots regenerated by existing tests are restored instead of replacing older evidence.

The final high-concurrency stress rerun was stopped after host contention caused time limits in Add dish and the 100/500/1,000-place timing case, plus a dark-tab case (207 passed, three failed and four interrupted at stop). Those paths had passed the previous complete run. The Add dish and large-journal cases subsequently passed in the serial 11-pass confirmation with unchanged limits. The dark-tab and interrupted form cases then passed their separate serial confirmation: **10 passed**, with unchanged assertions/limits. A clean final one-shot full-suite pass is **not** claimed. This distinguishes local app regressions from the limits of the shared-host test run.

## Decisions retained and rejected changes

Keep NAV-02/03/04/05/07/08/09/10 and PHOTO-01/02/03: history/scroll/photo return ownership, gesture suppression rules, keyed content, held order, WebKit-safe mobile rows, the approved page zoom lock, stale-image/generation guards and exact-destination upload recovery.

A possible stale async gallery-mutation continuation was reviewed but not changed: existing busy controls, Escape handling and gesture guards prevented a reachable ordinary remount scenario in this audit. Removing those guards to demonstrate a race would not establish a current user-facing defect. Other already-correct paths, including primary-before-Likes loading and the 180ms drawer curve, were retained.

Sources: [Google on avoiding layout thrashing](https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing), [MDN on CSS/JavaScript animation performance](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/CSS_JavaScript_animation_performance). They support batching measurements and using composited properties; the app-specific fixes and measured figures come from local code/profiling.

## Remaining limits

Physical iPhone/Safari and mid-range Android GPU/memory/frame delivery, real weak-network uploads, screen-reader sessions and production rollout remain unverified. Physical touch feel cannot be certified from Chromium emulation. Upload/auth implementations were preserved and tested with mocks, not real-cloud writes. No publishing is implied by this report.
