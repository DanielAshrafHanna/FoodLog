# Live release and Pixel 8 — 13 October 2026

Dany authorized pushing the completed code and testing `food.danyhanna.uk` directly on his connected Pixel 8. Implementation commit [cc8cb78](https://github.com/DanielAshrafHanna/FoodLog/commit/cc8cb78) was pushed to the existing `design2.0` branch. The first HTTPS push failed with HTTP 400; a command-scoped buffered HTTP/1.1 retry succeeded without force-pushing or changing Git configuration. GitHub's Workers Builds check completed successfully.

`/api/health` and `/release.json` both reported **Design 2.0 / cc8cb78**, built **2026-10-13T13:03:06.523Z**. The phone loaded `app.js?v=cc8cb78`, `sw.js?v=cc8cb78`, and the new `lib/detail-view.js`. Pre-release validation passed: **136 unit tests; 356 browser tests, 16 platform skips; build; deployment dry-run**. No deployment bindings, database/schema/access rules, or production fixture records changed.

## Physical behavior checks

Physical **Pixel 8**, Chrome **155.0.8059.39**, USB ADB connection authorized by the user. Browser viewport at initial inspector measurement: **411×808 CSS pixels, DPR 2.625**; browser controls can change usable height. Real cloud data contained **34 visible places**; the sampled detail had **6 dishes, 5 photo tracks, 6 images**. Phone was charging, battery 44%, temperature 37°C at the initial recording. No CPU throttling, screencasting or screen recording.

Passed on the actual live app:

- Five repeated open/Back cycles, followed by a second five-cycle native-input recording.
- Native detail scrolling and horizontal swipe back; inspector touch tests also checked photo swipes, cancelled short back swipes, and restored detail scroll within 3px after leaving/reopening.
- Three rapid browser Back→Forward interruptions retained open detail and the correct URL.
- A real cuisine filter link retained its selected value across navigation.
- Inspector-only reduced-motion emulation produced an immediate drawer with `0s` transition; the phone's accessibility setting was not changed.
- Six seconds of idle reading had **zero list/detail child mutations, zero Layout/style-update/Paint events, zero long tasks, and zero unexpected layout shift** in the observed interval.
- No uncaught page errors in the tested flows.

The scripts only navigated, scrolled and inspected existing content. They did not create, edit, rate, bookmark, delete or import records. Temporary browser filter/view preferences were restored; the existing FoodLog tab was restored to its original URL. No test records were written to production. Background review mutations, deletions, and ordering updates remain covered by mocked regressions, since reproducing those with live fixture writes would violate project rules.

## Frame recording

The first recording used an additional tab and heavy Chromium compositor tracing. It showed large main-thread gaps and more long tasks. A repeat in the original app tab with lighter tracing reduced those delays. A final recording used **native `adb input tap/swipe`**, with no artificial rAF loop and no screencast. This is the most representative of the three captured runs; it should not be treated as a matched before/after app benchmark.

Android Perfetto FrameTimeline data sources recorded actual surface frames, then an official, SHA-256-verified Perfetto v58.2 analyzer processed the files locally. No recording was uploaded to an external service. See [Chrome's Android debugging documentation](https://developer.chrome.com/docs/devtools/remote-debugging/) and [Perfetto FrameTimeline definitions](https://perfetto.dev/docs/data-sources/frametimeline).

Final native-input sample, Chrome content surface only (toolbar/UI counted separately):

| Measure | Recorded value |
| --- | ---: |
| Animated content frames | 593 |
| On-time presents | 589 |
| Early presents | 2 |
| Late presents | 2 (0.34%) |
| App deadline misses | 1 |
| SurfaceFlinger scheduling late | 1 |
| On-time frames marked Buffer Stuffing | 120 |
| Non-animating entries excluded | 2 |
| Long tasks above 50ms | 1 |
| Longest task | 62ms |
| Largest app-frame style update | 12.811ms |
| Unexpected layout-shift sum | 0 |
| Trace ingestion/data errors | 0 |

Buffer Stuffing is queueing that may increase latency; it is not equivalent to a dropped frame. It is included in the 589 on-time frames rather than incorrectly counted as failed frames. The device reported an active 120Hz mode. Most adjacent expected content-frame starts were about 8.3ms apart (528 samples rounded to 8.3ms), consistent with 120Hz cadence during active motion; the expected app work budget was 16.6ms. Adaptive refresh and pipeline timing mean this does **not** certify uninterrupted 120fps motion. The two late presents and remaining 62ms task are real limits of this sample.

[Native results](pixel-native-results.json), [frame classifications](pixel-native-frames.csv), [lighter inspector results](pixel-live-results.json), [first heavier run](pixel-first-results.json), [native recorder](pixel-native.mjs), [inspector recorder](pixel-live.mjs).

Raw recordings remain local in `/private/tmp/foodlog-pixel`, `/private/tmp/foodlog-pixel-light`, and `/private/tmp/foodlog-pixel-native`. Chrome traces can include other browser activity, and OS recordings include process/layer identifiers, so raw device traces are intentionally excluded from GitHub. Sanitized summaries carry the evidence needed here.

These checks establish physical Pixel navigation correctness, stable idle reading in the measured interval, and mostly on-time native frames. They do not establish every device/network condition, iPhone/Safari behavior, all-day idle stability, browser/PWA cold installation performance, human perception of touch latency, or a guaranteed frame rate. No physical before/after comparison against the old live release was made.
