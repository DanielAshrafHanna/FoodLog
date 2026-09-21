# Restaurant quick capture — design QA

final result: passed

## Evidence

- Source visual truth: `/Users/danielhanna/.codex/generated_images/01a0c0da-2a6d-73d2-887b-185b6aff6427/exec-96f63760-7ff0-4f81-84e7-eaaf778a170c.png` (first displayed concept, selected by Dany).
- Normalized source: `design-qa-assets/quick-capture/source.png`.
- Browser implementation: `http://localhost:4178/?audit=quick-capture-final`.
- Final phone screenshot: `design-qa-assets/quick-capture/mobile-final.png`; full comparison: `design-qa-assets/quick-capture/comparison-final.png`.
- Initial comparison: `design-qa-assets/quick-capture/comparison.png`; desktop: `design-qa-assets/quick-capture/desktop.png`; typo state: `design-qa-assets/quick-capture/mobile-typo.png`.
- Target CSS viewport 390 × 844. Generated source 853 × 1844; browser screenshot export 384 × 831, proportionally resampled to 390 × 844 for comparison. Browser screenshot export density is provider-controlled, not assumed to be deviceScaleFactor 1.
- State: dark theme, Add restaurant, populated Location/Cuisine, Location list open. Name differs deliberately (Preview Table) to avoid triggering the separate restaurant duplicate warning. The reference shows two sample choices; real filtered data yields one for Maadi.

## Comparison history and findings

1. Initial live comparison: heading was larger/heavier than the chosen compact concept; double focus treatment looked busy (P2). Reduced heading to 26px, removed redundant name search glyph, added the name clear control, and changed focus treatment to one terracotta edge. The explicit name label keeps the clear action separate for assistive technology.
2. Final combined source/live comparison opened and reviewed after fixes. No remaining actionable P0/P1/P2 findings. A full-size 780 × 844 comparison makes the field text, control geometry, and focus treatment readable; separate region crops were unnecessary.

## Required fidelity surfaces

- Typography: existing Newsreader display and Atkinson Hyperlegible Next UI retained; compact heading, 16px editable text, and readable optional metadata. Product-specific Restaurant name label retained.
- Layout: source's single-column essentials, optional disclosure, visit segment, and bottom Save action implemented. Menus intentionally overlay adjacent fields instead of allocating the mockup's illustrated list space, satisfying Dany's explicit request to eliminate page movement. Existing responsive dialog containment and safe-area behavior remain.
- Color/tokens: existing Olive & Porcelain panel, sage selection/save, and terracotta focus colors retained. No new visual theme or generated background substituted.
- Assets: this is a control-only form; existing source icons reused. The mockup's decorative list/link glyphs are omitted (P3) rather than fabricated. The existing surface texture remains part of the app identity.
- Content: Maps preview/apply, optional metadata, planning, memories, photos, and save success behavior remain reachable. “Did you mean?” and explicit Add-new actions handle typo ambiguity. Additional clear-name action follows the concept.

## Validation and limits

- Final focused browser suite: 24/24 desktop/mobile checks passed, covering save, optional controls, Maps, photos, typo recovery, clearing, keyboard focus, rapid Escape, reduced motion, short viewport placement, and 320px accessibility.
- Syntax/unit checks: 97/97 passed; build and diff checks passed.
- In-app browser inspection: phone and desktop, open and closed menus, canonical selection and typo state; no captured browser console errors.
- Older unrelated mobile account/Trash suite failures remain outside this change. Real iPhone keyboard and gesture behavior still needs physical-device testing; viewport resizing is not a physical-keyboard test.

## Hook triage

The four clipped-overflow findings refer to html/body and capture dialog/card containment. Kept those intentional boundaries. Lookup lists now use native top-layer popovers, so ancestor clipping does not cut them off. Updated only the existing file-scoped value exception; no global rule/file suppression. Existing unrelated detector advisories remain standing.

## Follow-up polish

- Optional P3: use a matching library glyph for the Maps/More details rows if desired. This does not block the flow.
