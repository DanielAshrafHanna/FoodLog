# UI/UX audit and refresh — 2026-11-01

Status: **local only, not deployed.** Publishing needs Dany's approval.

## Scope and method

- Every main surface (browse, filters, restaurant detail, dishes, photos, gallery, place and dish More, dish reviews, review form, Add restaurant, Settings) was captured with `capture.mjs` on desktop 1440×960 and Pixel 7, light and dark. It uses a disposable local-only fixture and never contacts production. Before shots are in `before/`; after shots are in `after/`.
- The live site (`food.danyhanna.uk`) was viewed read-only as a guest. Nothing was created, edited or deleted.
- Standards used:
  - WCAG 2.2 [Pointer Gestures 2.5.1](https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html), [Dragging Movements 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html) and [Target Size 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). Every gesture has a button alternative, and targets are at least 44px.
  - [Hick's law](https://lawsofux.com/hicks-law/). Fewer simultaneous choices, with rare actions grouped behind a labeled overflow.
  - [Material 3 motion](https://m3.material.io/styles/motion/overview) and [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion). Short ease-out motion (200–280ms), exits faster than entries, and no movement under reduced motion.
  - The full-screen media-viewer convention used by the iOS and Android photo apps: dark stage, close and counter visible, swipe to move between photos, swipe down to dismiss, pinch and double-tap to zoom.

## Findings

| Area | Finding | Result |
|---|---|---|
| Photo viewer | A small boxed modal with five text buttons. Zoom, cover, Trash and Previous/Next all had equal weight, and the photo was a small fraction of the screen. | Replaced (see below) |
| Photo management | It was inconsistent. The dish viewer had cover and Trash; the restaurant viewer had zoom only; restaurant photo cards carried "Use as main" plus a trash icon. The same task lived in two places. | One place: the viewer |
| Dish card | Four equal action cells mixed frequent actions (Review, Add photos, Like) with a rare one (Edit details), while Delete sat in "⋯". | Edit details moved into "⋯" |
| Restaurant header | Bookmark was both a header icon and a row in the "⋯" sheet. | Removed from the sheet when opened from the header. Long-press row menus keep it. |
| Browse | "No filters applied" repeated what the list already shows. | Hidden at rest; its space is kept so the layout does not shift |
| Gallery code | Every open added another ctrl-wheel listener. | Fixed with a single handler |
| CSS | The cascade is layered with patches; `.detail-actions` alone is defined about 10 times. | Not refactored (see further suggestions) |

## Implemented

- **One immersive viewer for restaurant and dish photos.**
  - Full-screen dark stage with the title, an icon zoom button and Close on top. Round arrows sit on the photo and stay usable while zoomed.
  - Below the photo: the counter, the credit, and at most two actions, "Set as main" and "Move to Trash", each shown only when the person has permission.
  - Trash asks once inline ("Keep photo" / "Move to Trash") and stays recoverable from Settings → Trash. Escape closes the confirmation first.
  - Swipe down at normal zoom dismisses the viewer. Swipe, pinch, double-tap, ctrl-wheel, keyboard and the zoom button all still work (PHOTO-02). Focus returns to the opened tile.
- **Restaurant photo tiles** are borderless rounded images with the credit below and a small "Main photo" badge on the cover. Card footers and trash buttons are gone; tap a tile to manage it.
- **Dish strip** now has three frequent actions: Review, Add photos and Like. "⋯" holds Edit dish details and Move dish to Trash for permitted users. Long press still opens the same menu. Focus returns to "⋯" after editing, even after the card re-renders.
- **Tokens:** the new CSS uses the documented type ramp, radius scale and `danger` color, plus one viewer-only `--viewer-danger` light red for contrast on black. Impeccable detector: no findings in the new section.

## Validation

- `npm run build` passes.
- 146 unit tests pass.
- 415 Playwright browser checks pass across desktop Chromium and Pixel 7 (27 skipped as before). This includes axe checks on the gallery and dish dialogs.
- Tests were updated for the new labels, the two-step Trash, Edit details in "⋯", and setting the main photo through the viewer.
- Not verified: physical iOS Safari and Android devices, and screen readers (RISK-03).

## Further suggestions (not implemented)

1. **CSS consolidation.** Fold the repeated `.detail-actions`, card and button overrides into one component layer. This is the biggest remaining source of small inconsistencies, but it is a large change that needs a dedicated pass with screenshot diffs.
2. **One count per view.** Desktop browse still shows "4 places" twice: the summary and the disabled playlist "Show all" button. Hiding the button's text broke its accessible name, so that change was dropped. A proper fix is to render the button only when a playlist is selected.
3. **Spacing scale.** Several older sections use 10, 14 and 18px gaps. Moving them onto the documented 4/8/12/16/24 scale would tighten rhythm across the detail panel.
4. **Shared-element open.** Morphing the tapped tile into the viewer would make opening feel continuous. It needs the View Transitions API with a fallback, and testing on devices.
