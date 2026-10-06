# Restaurant quick capture — October 6, 2026

Dany’s proposed flow reduces the always-visible form to identity, metadata, visit context, and Save. The earlier local form overflowed its scroll body by 41px at 390×800. The revised collapsed form fits 320/390/1280px at 800px high in both themes.

Implemented using the project’s Impeccable guidance and existing Porcelain & Copper / Graphite & Champagne tokens:

- One **Restaurant name or Maps link** field. Complete links reuse the existing 500ms/blur parsing and short-link resolution, fill only empty answers, and show a compact preview. Its X removes the link and undoes only unchanged autofilled answers. Canonical catalog labels and manual edits remain protected. Failures keep the link and Retry, while requiring a name before Save.
- Side-by-side **Location / Cuisine** add/value buttons. Each swaps to its existing searchable combobox in the same cell, with the current explicit creation, aliases, duplicate guard, top-layer menu, and edge scroll handoff. Selection, clearing, and Escape return keyboard focus to the trigger. Chosen values have separate 44px clear controls.
- Native **Been there? — Not yet / Yes** radios use a soft surface and outline. Personal rating/review remains conditional; hidden opinions survive drafts and block contradictory saves until the editor decides.
- Independent **Price / Playlist / Photos / Note** buttons. Populated sections stay open and their buttons show selection. The row wraps at 320px to retain touch targets. New-entry Bookmark remains visible with its privacy explanation; existing-place Bookmarks stay on the restaurant page. Note retains shared description storage.
- Only name is marked required. Save is disabled for an empty/whitespace name and has a visible accessible explanation. The form uses sans-serif section labels, tighter spacing, header Close, and the existing persistent footer. Edit uses filled metadata and open populated extras.

Restaurant records, Maps normalization/final redirected URLs, import, cloud payloads, approval checks, and permissions retain their existing format and behavior. Drafts additionally remember individual open sections and autofill provenance; earlier drafts remain readable. All browser fixtures are disposable and remote calls are blocked or mocked.

## Screenshot evidence

| Size/theme | Before | After |
| --- | --- | --- |
| Phone, light | [Before](audit-screenshots/2026-10-06/quick-capture-before-phone-light.png) | [After](audit-screenshots/2026-10-06/quick-capture-after-phone-light.png) |
| Phone, dark | [Before](audit-screenshots/2026-10-06/quick-capture-before-phone-dark.png) | [After](audit-screenshots/2026-10-06/quick-capture-after-phone-dark.png) |
| Desktop, light | [Before](audit-screenshots/2026-10-06/quick-capture-before-desktop-light.png) | [After](audit-screenshots/2026-10-06/quick-capture-after-desktop-light.png) |
| Desktop, dark | [Before](audit-screenshots/2026-10-06/quick-capture-before-desktop-dark.png) | [After](audit-screenshots/2026-10-06/quick-capture-after-desktop-dark.png) |

Phone screenshots are 390×800; desktop screenshots are 1280×900. Final screenshots were inspected together in both themes. Automated checks also cover 320/390/515/1280px expanded forms, names/contrast, 44px targets, and keyboard focus.

## Validation

Build and all 127 unit/source checks pass. The final complete Playwright run passed 332 checks with 16 platform-specific skips. The isolated Maps suite passed all 20 checks. One earlier full run hit an unrelated dish-photo navigation timing failure; six isolated repetitions and the final full run passed without changing dish behavior. Browser coverage checks merged Maps detection, empty-only autofill and undo, unnamed links, normalized metadata, delayed/cancelled requests, draft recovery, duplicates, individual extras, viewport fit, both themes, editing, private Bookmark choices, playlist inheritance and comma-containing names, photos/recovery, native scroll handoff, import, approval, and mocked cloud saves. The long-playlist stability assertion measures positions inside its list after expansion rather than comparing viewport coordinates during browser focus scrolling.

Physical Safari/iOS/Android, screen-reader sessions, live Maps redirects, and live production cloud behavior remain unverified. No production data/schema/permission changes, push, or deployment were performed.
