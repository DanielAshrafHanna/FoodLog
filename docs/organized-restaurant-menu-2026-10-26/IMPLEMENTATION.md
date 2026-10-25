# Organized restaurant menu — 26 October 2026

Dany’s supplied phone screenshot showed a no-photo restaurant/dish with scattered controls: metadata squeezed beside the identity, Bookmark pushed to the edge, an isolated More row, and Edit dish details detached from the review/photo/like controls. Dany asked for a cleaner, more organized, premium presentation. This revision is **local on design3.0**, alongside the already-local no-photo list consistency fix; neither follow-up has been pushed or deployed.

## Organization decision

Preserve the existing brand, type, actual content and dishes-first/photo-led order. Use predictable alignment and proximity rather than additional decorative cards:

1. Identity groups the small image/initials, name and visit state. Bookmark and More share a quiet trailing icon group with explicit accessible names, tooltips and 44px targets. The bookmark still exposes its pressed state.
2. Location/cuisine/price span the full header width. Playlists/people form a quieter supporting line. Restaurant score and the personal-review shortcut sit together. Maps retains primary emphasis when present; no reserved action space remains when absent. Without Maps, Add dish receives the primary filled treatment.
3. Dishes retain title → large optional photo → score/named opinion. Review/Photos occupy one aligned two-column row; Like/Edit details occupy the next. Name editing remains immediately visible and opens its existing name-only form. Liker identities, Earlier likes and retry errors follow across the full width.
4. No-photo dishes avoid surplus space before the score. Section transitions use one separator, and empty restaurant reviews use plain supporting text instead of an oversized dashed box. The shorter, underlined section navigation retains heading focus and current-section tracking with adjusted sticky clearance.

This supersedes UI-05’s scattered control positions and the detail-navigation fill portion of UI-04. It does not remove content, contribution access, ownership checks, Trash, full reviews, original galleries, likes, draft recovery, Bookmarks, Maps, sharing, quick metadata editing, or saved navigation/scroll positions. Full dish photos retain the previous cover preview/contain gallery behavior.

## Research applied

- [NN/g: Proximity principle](https://www.nngroup.com/articles/gestalt-proximity/) explains that nearby elements appear related, while separated controls may be overlooked. Applied to the rating/review pair, identity utilities and the dish footer; unrelated facts and contribution controls remain separate groups.
- [NN/g: Progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) recommends keeping frequently needed choices visible and exposing specialized actions through clear, discoverable entry points. Frequent contribution shortcuts remain visible; existing secondary management stays in the consistently placed More control. No new nested disclosure was added.
- [Material Design: Cards](https://m1.material.io/components/cards.html) describes a hierarchy of title, media, supporting content and actions, with restraint around extra controls. Applied as content followed by a bounded action area, without introducing extra card shells.

Used the existing Impeccable Operate/layout/distill guidance. An independent read-only layout reviewer identified auto-pushed actions and the fixed toolbar track as structural causes; the parent separately reviewed the screenshot, source, mechanical scan and rendered fixtures. This is a targeted organization correction inside the current design world.

## Validation and evidence

- Syntax/unit checks: **143 passed**.
- Initial focused browser run: 56 passed, 2 skipped, with two phone section-indicator failures. The shorter navigation required heading scroll clearance of 72px desktop / 132px plus safe area on phones; fixing that restored current-section tracking without changing navigation ownership.
- Full browser suite after the correction: **413 passed, 27 intentional skips, 2 failures** across 442 cases. Both remaining failures referenced the former `.detail-identity .cuisine` location; quick editing and saves had succeeded. Updating that selector to `.detail-facts .cuisine` passed both focused confirmations. All **415 runnable distinct cases passed** across the full run and confirmation; the whole suite was not rerun after that test-selector-only change.
- New sparse-menu tests check aligned footer rows, 44/48px targets, utility controls, keyboard/focus return, 320/390/515/980/1024/1440px overflow and scoped axe contrast/name/ARIA rules in both themes. Existing cases cover permissions, galleries, photo swipes, likes/errors/Trash, navigation and drafts.
- Impeccable layout detector returned `[]` before and after. One batched inspection plus one confirmation covered phone/desktop, both themes and real-photo/sparse states. No further polish loop was run.

 Automated fixtures block external requests or mock remote responses; no production test records were written. Screenshot names/content are fabricated, not a copy of production records. Photo-led captures use the [licensed fixture photograph](../../tests/fixtures/photography/SOURCE.md).

[Photo-led dish](photos-light-phone.png) · [Dark photo-led dish](photos-dark-phone.png)

[Light phone](light-mobile-chromium.png) · [Dark phone](dark-mobile-chromium.png) · [Light desktop](light-desktop-chromium.png) · [Dark desktop](dark-desktop-chromium.png)

Use `CAPTURE_ORGANIZED_MENU=1` only when deliberately regenerating these captures. Physical iOS/Safari, screen-reader review and a formal usability study remain unverified. Local Chromium/axe checks and a mechanical layout scan do not establish a universal premium-design or accessibility result.

Publication authorized by Dany on 26 October 2026; push/deployment verification pending.
