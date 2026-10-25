# Consistent restaurant media regions — 26 October 2026

Dany reported that restaurants without a thumbnail still used a small icon/initials tile, breaking the rhythm of the new large-photo entries. This locally supersedes **UI-03**’s compact no-photo exception, whose original purpose was to avoid a large empty photo area. The earlier photo-led release remains live; this follow-up has not been pushed or deployed.

## Change

Removed the fallback-only grid, padding, dimensions, and alignment overrides. Both photos and missing-photo placeholders now inherit `.restaurant-ticket-media`: 44% of the row beside information on desktop, or a full-width 16:9 region above information at ≤980px, capped at 320px. Centered 40px initials use the existing theme surface and foreground. Text insets and metadata groups stay consistent. Long content still grows rows naturally; consistent composition does not require truncating content to force identical row heights.

No new icon, synthetic restaurant photo or action was added. Existing accessible row names and `aria-hidden` decorative initials remain. Main restaurant photo → dish photo → initials selection, compact detail identity, keyboard/tap behavior, saved positions and editing are unchanged.

## Skill and verification

Used Impeccable layout guidance. An independent read-only assessment identified the conflicting fallback geometry; the parent separately inspected source/evidence and ran the layout detector. The spatial priority remains media → name/score → grouped metadata, with the same composition regardless of photo availability. The detector returned `[]` before and after; this is limited supporting evidence.

- Browser regressions covered the list, photo-led layout, startup and native taps: **128 distinct cases passed, 18 intentionally skipped**, across the initial run and focused corrections. Test corrections accounted for the 1px row separator, desktop selection without a phone Back button, and native tap coordinates that the taller entries had moved outside the viewport. No runtime navigation change was required.
- Native post-swipe tests use a taller 390×1200 viewport to keep both target rows on screen before timed input; they assert the target lies clear of the header and floating action. Existing ordinary touch/scroll tests retain 390×844 coverage.
- Batched visual inspection covered phone/desktop and both themes. Geometry checks covered 320/390/515/1024/1440px, wrapping names, matching photo/placeholder widths, matching phone media heights, desktop stretch, keyboard selection and phone focus return.
- CSS-only runtime correction; existing full photo/gallery, permission and data logic is untouched. No production test writes, schema changes or deployment occurred. Physical iOS/Safari remains unverified.

[Light phone](light-phone.png) · [Dark phone](dark-phone.png) · [Light desktop](light-desktop.png) · [Dark desktop](dark-desktop.png)

Screenshots use fabricated records and the [licensed photograph fixture](../../tests/fixtures/photography/SOURCE.md), not production restaurant data. Set `CAPTURE_NO_PHOTO_LAYOUT=1` when deliberately regenerating these evidence captures.

Publication authorized by Dany on 26 October 2026; push/deployment verification pending.
