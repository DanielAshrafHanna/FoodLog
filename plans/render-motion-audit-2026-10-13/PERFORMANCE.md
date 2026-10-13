# Animation performance — 13 October 2026

Dany, `animation-performance` is installed at `/Users/danielhanna/.codex/skills/animation-performance/SKILL.md` from [Emil Kowalski’s skills repository](https://github.com/emilkowalski/skills). Its inventory → diagnosis → recording → report workflow was applied, including a measured carousel fix. The official Skill Installer succeeded using its Git transport after Python's download transport encountered a certificate error; certificate checks were not disabled. Restart Codex for automatic skill discovery in future sessions; the installed instructions were read and used directly in this session.

## Motion inventory

The existing app uses vanilla JavaScript. No React state or animation-library state updates happen per frame. There is no authored `transition: all`; computed `all / 0s` on idle elements is the browser's non-animating default. Transform values are written directly during a gesture, rather than through inherited animated CSS variables. No animated blur exceeds 2px in these paths.

| Element | Driver | Properties | Plays during / cost |
| --- | --- | --- | --- |
| Mobile detail and live list/header underlay | Direct touch writes, CSS settling | transform, opacity | Opening, Back, interrupted history, swipe release; 180ms |
| Places/Map/filter history paints | Native View Transitions where available | browser crossfade | Explicit browse changes; reduced-motion fallback |
| Sheets and desktop action menus | CSS transitions + native discrete display/overlay | transform, opacity, discrete display/overlay | Open/close; discrete properties do not interpolate size |
| Modal dialogs | CSS transitions | transform, opacity | Open/close |
| Toasts | CSS transitions | transform, opacity, 2px filter | Feedback and arriving background data |
| Lookup dropdowns | CSS transitions | transform, opacity | Typing/selection; static scale tokens, no per-frame inherited variable writes |
| Capture/sync accordions | CSS transitions | grid-template-rows; inner opacity and 2px filter | Explicit disclosure; intentional layout animation so the form below follows real content height |
| Applied filter chips/capture steps | CSS keyframes | transform, opacity | Explicit selection/step changes |
| Loading skeleton | CSS keyframes | opacity | Pending data only; reduced-motion disables animation |
| Row/button feedback | CSS transitions | transform, color/background/border; some existing control shadows | Hover/press/focus/theme; main drawer settling overrides to transform/opacity |
| Photo carousels and gallery | Native scrolling/direct styles | scroll position; gallery transform | Gestures, arrows, pinch/wheel; listeners retained |
| Playlist centering | Native scroll | scroll position | Explicit playlist selection; auto under reduced motion |

[motion-inventory.json](motion-inventory.json) records computed idle styles; the table also describes source-confirmed active states. Existing accordion height motion has a functional reason and was retained. Its performance on an open, populated phone form still needs physical-device validation. No additional GPU-layer hints were added.

## Diagnosed and fixed

**Photo carousel setup — `lib/photo-gallery.js:88`**

Cause: layout thrashing on long detail views. The old loop read each track width, then wrote position text and disabled buttons before reading the next track. Trace inspection found 28–29 Layout events inside single refresh/click tasks on a 12-dish detail.

Before: all carousels reinitialized on each detail refresh, with unconditional label writes and interleaved reads/writes. After: measure new tracks as one batch, bind each retained carousel once, and skip unchanged label/control writes. `lib/detail-view.js` also batches restoration measurements before scroll writes and label events. Existing controls, keyboard paging, touch behavior and fractional positions remain.

Verified: source inspection, carousel unit regression, complete browser regressions and before/after DevTools timeline traces. No physical GPU verification.

**Background row ordering — `lib/navigation.js`, `app.js`**

Cause: fresh Recent/rating/name values changed the sorted DOM order under the reader. After: retain existing order with fresh content, append new matches, remove departed matches, and reserve space for Update order. Explicit browse changes or manual Refresh accept current sorting. The repeated fixture's unexpected layout shift was eliminated. Removing a row or changing its actual content height can still require a justified layout change; this is not a promise of zero shifts under all edits.

## Recording evidence

Chromium **149.0.7827.55**, headless, 390×844 phone viewport, 60 disposable places with 12 dishes each and mock two-photo tracks. Three drawer open/Back cycles each receive a changed review and timestamp. Normal CPU and 4× CPU throttling, three fresh-context runs per version/rate, in an isolated run after browser tests finished. Baseline overrides the original audited `24a95f8` HTML/CSS/app/navigation/gallery source; other unchanged dependencies are shared. Startup is excluded. All external requests abort or use mock responses.

Medians across three runs:

| Recorded measure | Original 1× | Final 1× | Original 4× | Final 4× |
| --- | ---: | ---: | ---: | ---: |
| Layout events | 295 | 76 | 295 | 76 |
| Total Layout time | 83.26ms | 23.80ms | 222.21ms | 48.72ms |
| Total style-update time | 240.93ms | 149.39ms | 549.12ms | 260.62ms |
| Long tasks (>50ms) | 2 | 0 | 6 | 2 |
| Longest task | 59ms | 0 above 50ms | 123ms | 67ms |
| Main-thread rAF p95 gap | 17.4ms | 17.5ms | 17.7ms | 17.6ms |
| Largest main-thread rAF gap | 50ms | 33.4ms | 116.7ms | 82.7ms |
| Unexpected layout-shift sum | 0.07981 | 0 | 0.07981 | 0 |
| List child-node mutations (changed data) | 5 | 3 | 5 | 3 |

[Raw summaries](performance-results.json), [repeatable local recorder](profile.mjs), [original 4× trace](original-4x-2.trace.json.gz), [final 4× trace](final-4x-2.trace.json.gz). Decompress the trace JSON and import it in Chrome DevTools Performance. All 12 raw traces remain in `/private/tmp/foodlog-motion-profile`; the representative pair is retained here.

The rAF numbers sample the main thread across whole interaction sequences. They are **not compositor/GPU dropped-frame counts** and do not certify 60/120Hz delivery. CPU throttling does not simulate a phone GPU or memory budget. The final stress fixture still has long tasks and rAF gaps. These results demonstrate reduced rendering work, not universally perfect motion, real-user INP, or a production Core Web Vitals score.

## Initial physical-validation limitation

Android `adb devices -l` returned an empty attached-device list. Apple's `xcrun xctrace list devices` exited 137 with no usable inventory, including outside the sandbox. Physical iPhone/Safari and mid-range Android profiling could not be completed on this host. No device settings, permissions, production data or deployment were changed.

On an available phone, record these on a local/mock build using Safari Web Inspector or Chrome remote debugging: cold filter link, long detail with photos, repeated open/Back, Back→Forward during settling, swipe interruption, arriving review while touching a carousel, scroll while a row's timestamp/rating changes, Apply order, and reduced motion. Check presented frames and long tasks at the device's actual refresh rate, memory/layer use, and sticky controls. Retain the recording before claiming smooth 60/120Hz behavior.

## Physical validation completed afterward

Dany connected an authorized Pixel 8 and explicitly approved publishing/testing the live site. The release and actual-device tests are documented in [PIXEL_LIVE.md](PIXEL_LIVE.md). Native input recording sampled 593 animated content frames, two late presents, one 62ms long task and no unexpected layout shift. Six-second idle reading had no DOM, layout or paint work. iPhone/Safari and uniform 120fps remain unverified. The earlier empty device inventory above records the initial state, not the final outcome.
