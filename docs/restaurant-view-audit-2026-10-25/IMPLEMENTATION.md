# Restaurant menu implementation — 25 October 2026

Dany selected **dishes first** and **restaurant layout plus compact dish comparison** after the [live audit](AUDIT.md). Dany authorized publication from `design3.0` on 25 October 2026. Frontend source `9fff4b6` is pushed and verified live at food.danyhanna.uk: Workers Build `2fc1f18c-5d55-43a2-b7b3-80d96151f865` succeeded; health reports `ok` / `Design 3.0` / `9fff4b6` (built at `2026-10-25T20:38:24.635Z`). HTML/service-worker stamps match, and live app.js, styles.css and lib/detail-view.js match source SHA-256 hashes. Later documentation-only commits can have newer release stamps with the same frontend.

## Result

- Small 64–72px restaurant identity image, readable name/context and concise restaurant rating/count replace the large hero and separate rating tile. Maps remains the primary action, More stays quiet, and personal restaurant review/Bookmark access remains visible for eligible editors.
- One consistent order: **Dishes → Restaurant ratings & reviews → Photos**. Supporting description, update attribution and the additional phone sign-in prompt follow the menu. Header/account sign-in remains available. Empty contribution states retain their actions with less empty space.
- A single column of compact dishes leads with names, scores/counts and a short named opinion beside 96–112px contain-fit photo carousels. Full images, attribution and authored review timestamps remain in their existing gallery/review sheet. Add/Edit review, Add photos, name-only editing, likes, Earlier likes and permission-aware More/Trash remain available. Empty-like filler and repeated preview timestamps are omitted.
- Sticky section controls track the visible section and focus actual H3 headings, with clearance below phone Back. Empty Photos stays out of section navigation while its contribution section remains reachable.
- Restaurant totals clearly distinguish score-only ratings from written reviews. Restaurant and dish scores are never combined; no dish prices or completeness claims are invented.
- First-open restaurants now start at the top; returning restaurants retain their anchors, scroll/carousel positions and explicit dish-search behavior. The compact identity image and unchanged dish nodes survive unrelated review updates.

## Evidence and validation

The new `tests/restaurant-menu.e2e.spec.js` blocks external traffic and uses fabricated records and mocked remote responses. Images in these screenshots are deliberately plain fixture media, not copied production photos.

- New-layout checks: 7 passed, 1 intentionally skipped duplicate desktop-only case across the two projects; phone/desktop light and dark, 320px fit, first dish visible at entry, section order, rating versus written-review counts, complete review timestamps/gallery access, photo pagination and heading focus. Scoped axe contrast/name/ARIA checks found no violations in the tested detail state. This is not a comprehensive accessibility certification.
- Unit/syntax checks: 143 passed (`npm run check`).
- Across the full browser suite plus affected-file confirmation: **402 distinct cases passed; 26 intentionally skipped**. The initial 428-case run had 386 passes, 26 skips and 16 failures: ten old layout/selector expectations and six native swipe fixtures whose old title-midpoint coordinate now hit a review button. Updating the approved expectations and noninteractive swipe start resolved all 16. The six affected files then passed with **152 passes / 18 skips**; no runtime failures remained in that confirmation. The final action-size correction was covered by the affected editing/menu files.
- Browser screenshots were inspected in two bounded batches. The first exposed desktop first-fold density and section-highlight clearance; both were corrected before confirmation. Existing tests were updated for the approved section order, heading targets, cuisine location and full-sheet timestamp disclosure. Native swipe tests now start on the noninteractive identity image because the former title midpoint contains the new review button; the tests explicitly check that the starting point is not an interactive control.

[Light desktop entry](implementation/entry-light-desktop-chromium.png) · [Light phone comparison](implementation/comparison-light-mobile-chromium.png) · [Dark phone entry](implementation/entry-dark-mobile-chromium.png) · [Restaurant review view](implementation/restaurant-reviews-light-mobile-chromium.png)

## Research applied

Hick’s Law informs a small stable section set and one primary action; it does not impose a rigid maximum number of content choices. Full reviews/photos are disclosed in context, and score scope is explicit. Sources consulted during the audit: [Hick’s Law](https://lawsofux.com/hicks-law/), [NN/g progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/), [NN/g recognition rather than recall](https://www.nngroup.com/articles/recognition-and-recall/), [NN/g in-page links](https://www.nngroup.com/articles/in-page-links/), and [Baymard ratings perception](https://baymard.com/research-articles/user-perception-of-product-ratings). Existing Impeccable Operate/layout guidance and the two independently authorized audit reviews informed the implementation; no new skill installation was needed.

## Limits and release status

No production records, schema, access policies or Cloudflare settings changed. Local Chromium fixture coverage does not establish physical iOS/Safari, screen-reader or usability-study results. The first-open correction is included in the verified live frontend. The audit's original heuristic score is historical evidence, not a new score for the implemented design.
