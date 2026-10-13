# Swipe-back first taps and startup flashes — 13 October 2026

Dany reported that restaurant taps still sometimes need a second try, then identified swipe-back as a likely trigger. The earlier long-press fix remains valid but did not address this separate closing-animation window.

When swipe-back commits, the visible Places list remained inert and had pointer events disabled until the 180ms settle and history return completed. Native input in that window hit the list-layout container rather than a restaurant. A disposable Chromium regression failed at 50ms after release but passed at 250ms and 650ms. On the live Pixel 8 build 5ae6b3c, four native swipe/immediate-tap attempts failed; event timestamps placed the next gesture about 55–108ms after swipe release. Twenty ordinary native taps across titles, thumbnails, and tags passed before this fix. No production records were written.

The implementation exposes only the revealed restaurant list after dismissal commits, queues the selected restaurant, and opens it after the closing history return. Header controls stay covered; active dragging and a cancelled/interrupted close keep the underlay inert. It preserves the 180ms animation, gesture threshold, detail/list scroll, long-press behavior, and browser Back/Forward. Opening another history detail or interrupting the close discards a queued choice. A removed queued restaurant is not opened.

The empty-journal hero now starts hidden in HTML, appears only for a confirmed empty collection, and never treats a pending cloud load as empty. Cloud startup without cached rows shows existing loading placeholders. Account access presentation waits for session restoration and the actual approval result. Approved users do not briefly see guest/waiting controls. Pending users retain genuine Waiting for editing approval and Check approval; guests retain Google/email entry points. Approval errors still offer retry, and auth failures end initial loading. Authorization rules and Supabase APIs/policies are unchanged.

Before-change delayed-startup tests failed all four phone cases: held application script, delayed restored approval, pending approval, and guest/empty collection. The fixed cases retain the legitimate states rather than deleting them.

Validation so far: 136 unit tests and build passed; focused navigation/startup/auth/touch run passed 67 tests with seven platform skips. The three swipe timing cases now pass and verify Back/Forward after the queued open. A separate native-touch test confirms a row update between down/release still opens the intended place; this did not reproduce the reported defect. Full browser suite passed 382 tests with 22 platform skips. Final physical release verification follows publication.

Recorder limits: the first user-event capture did not retain events; a longer capture across four FoodLog targets recorded no user sequence. Those captures are not claimed as proof. The automated native Pixel sequence and local coordinate tests provide the reproduced evidence. Raw device logs stay in temporary local files; this report contains only sanitized facts.

Source references checked: [W3C Pointer Events dispatch](https://www.w3.org/TR/pointerevents3/#the-click-auxclick-and-contextmenu-events) and [Supabase session restoration](https://supabase.com/docs/reference/javascript/auth-getsession). The current Supabase changelog was checked; its TLS cipher deprecation does not require a client presentation/API change here.

Inspected final approved-phone and waiting-desktop fixture screenshots; the approved list has no hero/access banner, while the genuinely pending account retains Check approval. The targeted design detector kept existing advisory findings; no new suppression was added.

Status: local implementation; no database, schema, permissions, or production fixture changes. Publication and final live checks remain to be recorded.
