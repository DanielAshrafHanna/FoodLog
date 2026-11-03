# Browse controls — 3 November 2026

Status: source pushed to `origin/design3.0` as `6c04fc0` with Dany’s authorization. Public health still reported previous release `a1d333a` immediately afterward; live rollout remains unverified. All examples use invented disposable device records and block external requests. No production data, schema, permissions or upload pipeline changed.

> Spacing follow-up (3 November, local): the separate filter-only row and 88px reservation below are superseded by the [single 44px feedback strip](../browse-spacing-2026-11-03/IMPLEMENTATION.md). Their stability goal and capabilities remain.

## Problem and decision

Dany's phone capture showed visit status and Bookmarks squeezed together, a narrow applied-filter viewport, a duplicate result count, and a large count/Show all capsule competing with playlists. Similar pill treatments made persistent selection, removable filters and recovery look like equivalent tasks.

The existing Table Notes identity, palette, Helvetica/Atkinson roles, public access rules, playlist pills and combined filtering remain. This is a refinement of browse chrome, not a new navigation model.

- Bookmarks moves to the heading's trailing edge. Its pressed state, count, accessible name and approval gating remain; phones retain the familiar bookmark icon/count.
- Visit status has the entire row on phones. Its three labels/counts remain, with quiet, equal-width 44px targets and explicit pressed states.
- Playlists form a separate labeled rail. Only the selected playlist has a boundary and tonal fill. Counts lose their nested badge; native horizontal scrolling, auto-centering on deliberate selection, long-press management, visible management and creation remain. Management and + occupy fixed slots outside scrolling.
- Applied filters have the full available width, with rectangular removable chips and their category names. They retain native scrolling and full accessible removal names. Focus is drawn inside the rail to prevent clipping.
- One result count reports visible/total membership; Show all becomes a plain 44px text action beside the reserved Update order slot. The count remains visible when Show all is unavailable. Recovery continues to clear narrowing criteria while preserving playlist/sort; the filter sheet keeps its broader reset semantics.
- The 44px applied-filter rail and action slots remain reserved at rest/loading. This deliberately retains NAV-06/10: content must not jump when a filter or background update arrives. The previous duplicate count and large recovery capsule are superseded, not their meaning.
- Desktop uses two calm columns above the existing list/detail workspace. Moving the playlist rail into the browse header removes an empty grid track; list and detail still align. Existing image/card geometry and scrolling behavior remain.

## Research and interpretation

- [Baymard: Display Applied Filters in an Overview](https://baymard.com/research-articles/how-to-design-applied-filters) supports visible removable applied filters on mobile, including horizontal scrolling. A badge count alone does not explain why results narrowed. Our decision: keep the overview, give it full width, retain category names and separate it from navigation. The research concerns shopping lists; applying it to this journal is a design inference.
- [Nielsen Norman Group: Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/) recommends clearly accessible secondary choices while retaining frequent actions upfront. The existing filter sheet/Rating & sort disclosure already provides that hierarchy; hiding active filters or replacing the established playlist rail with a menu would add effort without evidence of a benefit.
- Impeccable's Distill/Operate guidance informed quieter surfaces and action roles. Project memory overrides generic advice: preserve zoom-lock, reserved geometry, deterministic browse order, the playlist rail, capability gates and all contextual editing.

This is a reasoned design choice, not a measured claim that task completion is faster or that users prefer it.

## Validation

- `npm run check`: JavaScript syntax and all 161 unit tests passed.
- New browse coverage passes at 320/390/1024/1440px, light/dark: one count, full-width filter rail, 44px status/recovery targets, no page overflow, stable toolbar height, keyboard clearing, WCAG rule checks, playlist-preserving Show all and independent Bookmarks.
- Startup coverage now verifies equal header height before/after JavaScript boot. The 50px old rail-floor assertion becomes 44px to match the deliberate compact target. Playlist creation is tested beside the rail, outside its scrolling viewport, with unchanged naming, permission, save/retry and restore cases.
- An existing detail accessibility scan intermittently measured the 160ms tab fade before it finished (469 full-suite tests passed, one contrast scan failed). The test now awaits finite detail animations before auditing the settled palette; application tab motion and semantics are unchanged. Final full-suite result is recorded below.
- Final captures were inspected together for phone/desktop, light/dark and narrow overflow. Stored theme is set before navigation and captures await fonts/settled animations so they do not record transient mixed theme colors. The reserved empty chip rail remains deliberate; the list keeps its position when filters appear.
- JavaScript changes only remove the redundant count reference/write and update its explanatory comment. Capture/persistence/upload/retry, Supabase queries, auth, service worker and photo viewer logic are unchanged. Existing whole-suite checks cover those paths with local/mocked responses.

Final full Playwright run: **470 passed, 28 intentional platform skips, zero failures** (498 cases, 3.1 minutes). Physical iOS/Safari and observed usability sessions are outside this task; no universal accessibility or measured task-speed claim.

## Visual evidence

- [Phone baseline](phone-before.png) / [desktop baseline](desktop-before.png): source `a1d333a`, same invented collection.
- Final captures: [320px dark filtered](320-dark-filtered.png), [390px dark filtered](390-dark-filtered.png), [390px light resting](390-light-rest.png), [1440px dark resting](1440-dark-rest.png), plus the matching light/dark filtered/rest coverage. [Reproduction script](capture.mjs); run a local preview on 4182 or set `BROWSE_PREVIEW_URL`.
