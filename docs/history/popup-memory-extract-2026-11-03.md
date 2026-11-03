# Prior detailed constraints — 3 November 2026

Exact excerpts retained before consolidating current memory for the popup refinement. Current decisions in thought_Process.md govern; these are historical rationale, not new authorization.

- **PHOTO-02 — Library/viewer (11-01).** Preserve originals, Retry/progress, authors/legacy credit, recoverable removal and focus. Viewer owns management; tiles have no controls. Retain swipe/pinch/double-tap/keyboard/zoom and per-photo reset. Own-place Make it a dish copies before non-main Trash; main retained. [Library rationale](../photo-library-2026-11-01/IMPLEMENTATION.md). Rated dish photos show average/named review below image, credit separate; no empty place/unrated review panel. Reader keys/scroll stay independent. [Review rationale](../gallery-reviews-2026-11-01/IMPLEMENTATION.md). Single-review expansion requires clipping (remeasure layout/resize/fonts); Read all for multiple ratings. Swipe moves one opaque shell with interruptible spring/reversal; reduced motion skips release travel. [Fix](../gallery-dismiss-2026-11-01/IMPLEMENTATION.md). Full filtered library now lives in Photos (UI-07), replacing the modal/six-tile preview; gallery stays modal.

- **UI-05 — Dish cards (pushed `3124524`).** Dany replaces separate dish sections with one 18px outlined card for title/photo/review/actions/likes, 16px gaps; no nested response border. Keep large crops, compact 44px contribution row and Edit details/Trash in More with existing permissions (prior `78bdc25`, [rationale](../compact-actions-2026-11-01/IMPLEMENTATION.md)). Header gains 12px above the photo without shrinking it or adding sticky-bar padding. Rating inputs use outlined empty stars, solid accent and a bounded surface; half-star/keyboard/drag semantics remain. Preserve NAV-02/04 and PHOTO-04. [Validation](../dish-cards-2026-11-02/IMPLEMENTATION.md).

- **UI-06 — Material refinements (10-31; live).** `6815a2f` adds light grain, grouped opinions/quiet credits; `d9463c5` refines browse/access, missing media, sections/empty states, full reviews and smooth dark. Replaces flat canvas/transparent opinions; workflows stay. [Evidence](../frontend-audit-2026-10-31/IMPLEMENTATION.md), [follow-up](../frontend-audit-2026-10-31/REMAINING.md).

- **DATA-01 — Sign-in is not edit approval (2026-09-05; 2026-10-03).** Guests/waiting accounts browse; Google/email signup, confirmation/status, and approval recheck stay available. Startup hides access panels until session/approval resolves; known approval is not a cached permission grant. Editing requires existing approval. Database policies enforce contributor/owner and own-review boundaries. Catalog administration derives owner identity server-side, never from client claims. [Account rules](../../PRODUCT.md); [regressions](../../REGRESSION_GUIDE.md).

- **FORM-01 — Keep the restored form (2026-10-06).** Dany rejected merged name/Maps capture. Keep separate name, visible Maps, full-width Location/Cuisine, visit choices, flat More details, persistent Save, one header X. Only name is required/emphasized. Preserve drafts. [Rationale](../RESTAURANT_QUICK_CAPTURE_2026-10-06.md); DESIGN.

- **2026-11-02 — Render fixes pushed `3373f43`; live pending.** RISK-06.

- **2026-11-01 — Viewer fixes live in `68665a1`.** PHOTO-02/report.

- Earlier releases/evidence remain in BASE-02, UI-05, PHOTO-02 and [history](../history/restaurant-design3-memory-2026-10-25.md).
