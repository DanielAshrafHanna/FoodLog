# Add restaurant: Location, Cuisine, and More details audit

Date: 2026-09-22

## Overall verdict

The capture flow is healthy after the fixes. More details now follows the form's horizontal grid, and the shared Location/Cuisine menu exposes the full matching dataset in a bounded list that supports touch, mouse, and keyboard scrolling without moving the form.

## Evidence and walkthrough

1. **Capture form at rest — healthy after fix.** The More details label and chevron measure 17px from the section's visual edge, matching the intended 16px padding plus the border. Before the fix, the content was flush to the border. Evidence: `01-closed.png` and `04-fixed-closed.png`.
2. **Location and Cuisine opened — healthy after fix.** The menu remains a top-layer anchored overlay, shows every matching stored value, and uses a bounded scrolling region. A disposable eight-location/eight-cuisine fixture verified that `scrollHeight` exceeds `clientHeight`, touch pointerdown is not cancelled, ArrowDown scrolls to the eighth item, and Enter/click selection works. Evidence: `02-location-open.png` and automated browser coverage in `tests/foodlog.e2e.spec.js`.
3. **More details expanded — healthy after fix.** Root content keeps the same inset as the fields while Plan it, Remember the visit, and Photos remain aligned inside the panel. The fixed save area remains separate from the scrolling editor. Evidence: `03-more-details-open.png` and live browser inspection after the CSS correction.

## Issues fixed

- **High:** The result list was hard-limited to four values, which made later stored locations and cuisines unreachable.
- **High:** The list cancelled every pointerdown, blocking native touch panning and allowing pointer-hover logic to compete with a finger gesture.
- **Medium:** More details lost its horizontal padding because a broader nested-summary selector overrode the root rule.
- **Low:** An always-running animation frame repositioned every open menu even though scroll, resize, viewport, and input events already keep it anchored.
- **Low:** The bounded menu did not expose a clear desktop scrollbar treatment.

## Accessibility and remaining limits

- The editable combobox/listbox relationship, expanded state, active descendant, Arrow keys, Enter, Escape, clear action, and reduced-motion behavior remain intact.
- The automated fixture covers desktop and mobile Chromium sizes. Live inspection found no browser console errors.
- Physical-device inertial scrolling and screen-reader speech output were not tested; the browser accessibility tree exposes the expected combobox, list, option, expanded, and selected states.

## Detector triage

Impeccable reported 262 advisory findings, all from existing design-token/sidecar drift and broad visual heuristics; it reported zero primary findings. No new ignore was added. The existing narrow overflow exceptions for intentional page/dialog containment remain in place, while lookup menus use the top layer so they are not clipped.
