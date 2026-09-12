# FoodLog Olive & Porcelain — Design QA

## Visual truth and evidence

- Source: `design-qa-assets/source-olive-porcelain.png` — 1492 × 1054 px concept board selected by Dany.
- Primary implementation: `design-qa-assets/light-phone-390-places.png` — 390 × 844 CSS px at device scale factor 1.
- Side-by-side evidence: `design-qa-assets/comparison-source-and-implementation.png` — 1920 × 1100 px.
- Responsive evidence: light and dark Places views at 320 × 844, 390 × 844, 768 × 1024, and 1440 × 900.
- Focused evidence: mobile restaurant detail, mobile More sheet, mobile capture flow, desktop detail, and desktop anchored More menu.
- State: isolated local seed fixtures with Silkroad selected for detail captures. No production records or remote storage were written.

## Comparison findings

The implementation carries the source composition and mood into the existing application: warm porcelain, a dark olive navigation surface, sage selection, terracotta rating accents, editorial Newsreader headings, flat restaurant rows, reserved thumbnails, and restrained elevation. The capture and detail surfaces use the same visual language while keeping the existing data fields and actions.

Intentional differences from the concept:

- The concept board shows Map in the mobile navigation. The implementation preserves the product requirement of the existing Places + Add phone dock and keeps Map in desktop navigation.
- The concept uses food photography. Local fixtures have no stored photos, so the implementation shows the intentional fixed-size initials fallback. Existing stored restaurant and dish photos still use the original data and rendering path; generated imagery was not added to the product.

## Fix history

- **P1 — fixed:** the fixed phone dock initially positioned against the fixed header and overlapped Filters. A backdrop filter on the header created the containing block. Removing that filter restored viewport anchoring.
- **P2 — fixed:** terracotta and muted text were too close to the contrast threshold. Small light-theme text uses the darker terracotta text token `#A54831`, and muted light text uses `#5C665D` for more than 4.5:1 on sage.
- **P2 — fixed:** the post-push design hook found an 11.52px account/menu description and redundant eyebrow labels above headings. Menu and rating metadata are now larger, and contextual labels follow their headings as readable subtitles.
- **P2 — fixed:** a compact Show all control measured below the required touch target. It now reserves at least 44px.
- **P2 — fixed:** the 320px playlist row clipped Bookmarks and playlist choices. The control group now wraps without horizontal overflow.
- **P2 — fixed:** dark rating blocks inherited a filled light surface. They now use the intended transparent/elevated dark treatment.

No outstanding P0, P1, or P2 visual defects were found in the captured states.

## Interaction and accessibility verification

- Restaurant open and Back keep the live Places underlay, interrupted swipe behavior, list scroll restoration, and carousel position.
- Account menu, desktop More menu, and phone More sheet use the existing actions and permission checks. Keyboard navigation, Escape dismissal, focus restoration, and 44px touch targets were exercised.
- Capture still follows Place → Details → Memories and preserves validation, drafts, retries, repeat entry, uploads, and save behavior.
- Motion uses 120ms press feedback, 180ms anchored menu and restaurant drawer transitions, and 220ms touch sheets. Transitions use transform and opacity, with fixed media/control space and reduced-motion handling.
- The browser run produced no unexpected console errors. The service-worker registration message in the capture run is expected because Playwright blocks service workers for isolated tests.
- A focused rendered Axe color-contrast audit reported zero violations in the light mobile view. The static design detector's porcelain-on-sage warning was a cascade-analysis mismatch rather than a rendered color pair.

## Verification record

- `npm run check`: 95 of 95 checks passed.
- Full Playwright suite: 108 passed and 10 viewport-specific skips; no failures. This includes desktop/mobile fixture-integrity coverage confirming navigation and theme changes leave persisted fixture records byte-for-byte unchanged.
- Visual inspection completed for both themes at 320px, 390px, tablet, and desktop widths, including long layout paths, missing-photo fallbacks, menus, detail, and capture.
- Physical-device motion testing was not performed; motion was verified in desktop Chromium with mobile viewports, pointer/touch emulation, swipe tests, and reduced-motion emulation.

## Required surfaces

- Places list: checked in light/dark at all required widths.
- Restaurant detail: checked on phone and desktop.
- Account/menu surfaces: checked for anchored desktop placement and touch-friendly phone presentation.
- Capture form: checked through the numbered three-step restaurant flow.
- Loading, empty, error, and missing-photo behavior: covered by the existing browser suite and fixed-size fallback inspection.

## Bubble-card refinement — 2026-09-12

- Dany's card reference is preserved at `design-qa-assets/source-bubble-card-reference.png` (1080 × 584 px).
- Current implementation evidence: `bubble-light-phone-390.png`, `bubble-dark-phone-390.png`, and `bubble-light-desktop-1440.png`.
- The restaurant list now uses individual rounded sage bubble cards with larger reserved photos, visit-status capsules beside the name, outlined location/cuisine/playlist/price/dish bubbles, an optional lower bookmark block, and a separate terracotta rating tile. Dark mode keeps the same hierarchy on elevated olive-charcoal surfaces.
- Existing restaurant-row DOM identity, click/keyboard selection, long-press behavior, phone detail transition, Back/swipe restoration, real-photo rendering, initials fallback, permission checks, and data handlers are unchanged.
- Initial browser verification found insufficient contrast on the small rating scale. The light rating tile now uses accessible deep terracotta `#A54831` with porcelain text (5.66:1); dark mode uses warm terracotta `#E39A7E` with charcoal text (7.36:1).
- Rating tiles use neutral elevation shadows in both themes; the post-review dark-glow warning was resolved without suppressing the rule.
- Focused Playwright checks passed for Places accessibility, mobile touch/card geometry, dark theme, stable media, and reduced motion. Full-suite verification is recorded in `thought_Process.md`.

final result: passed
