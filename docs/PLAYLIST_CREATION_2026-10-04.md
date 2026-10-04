# Playlist creation from the playlist rail

Implemented on October 4, 2026. Dany subsequently authorized publication with an explicit push request.

## Research and design choice

- [Spotify’s playlist creation guidance](https://support.spotify.com/ie/article/create-playlists/) uses a direct creation action followed by naming and creating. FoodLog adopts that short sequence; there is no cover, description, privacy picker, or restaurant form to complete first.
- [W3C’s modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) specifies focus inside the dialog, contained keyboard navigation, Escape dismissal, and appropriate return focus. A native dialog protects this brief naming task from the surrounding restaurant controls. The header X returns to +; success moves focus to the new playlist chip.
- [GOV.UK’s text-input guidance](https://design-system.service.gov.uk/components/text-input/) and [error-message guidance](https://design-system.service.gov.uk/components/error-message/) support a visible label, associated help, and an error beside the field. FoodLog keeps entered text for retry and distinguishes name validation from storage/connection failures.
- Impeccable’s Operate guidance favors familiar controls, restrained surfaces, existing tokens, and visible task actions. The interface inherits FoodLog’s warm light / charcoal dark themes, typography, and bronze focus treatment. This is an extension of the current playlist surface.

## Behavior

The 44px + is at the trailing edge of the Playlist section, outside its horizontal scrolling rail. Approved cloud editors and device-only editors can open New playlist. Guests and accounts awaiting approval retain browsing access.

Creation requires one name, accepts Enter, trims leading/trailing whitespace and collapses repeated spaces. Duplicate checks compare Unicode compatibility, case, and spacing. Internal filter names are reserved. A name in Trash requires restoration or a different name; creation never silently restores a trashed playlist.

An empty playlist is saved independently of restaurant membership, selected immediately, and restored after reload. Creation preserves existing search/filter choices. The empty view explains the next step: add a restaurant here, or choose the playlist in an existing restaurant’s details. Add restaurant inherits the selected playlist through the existing capture behavior. Restaurant records are not rewritten by creation.

Pending submission prevents repeat requests and dismissal. Failed storage/cloud requests retain the name and show a retry message. Cloud mode requires an established connection, reads the latest catalog before inserting, and uses the existing playlists table and approval policies. Device-only mode stores its catalog in `foodlog-playlists-v1`; cloud catalog caching uses a separate key. Rename, Trash, and Restore support empty local playlists and preserve other catalog entries.

## Scope and limits

No schema migration, production record writes, approval changes, or deployment is required for this frontend addition. Local tests use disposable fixtures and mocked Supabase responses. Live authenticated cloud writes and physical-device keyboard behavior remain unverified.

The existing database key enforces exact-name uniqueness. Normalized duplicate checks protect this creation flow, but two accounts simultaneously inserting different case/spacing variants are not covered by an atomic normalized database constraint. A future server-side constraint would require a reviewed catalog mapping and separate schema approval. Restaurant-array exports retain their existing format and do not include standalone empty playlist catalogs.

## Verification

Validation passed: 126 unit/source checks, production build, and the full browser suite (258 passed, 12 skipped). The new playlist suite contributes 20 checks across desktop and mobile. Existing navigation checks now wait for settled responsive/theme state; an existing photo-target assertion allows 0.001px floating-point tolerance.

`tests/playlist-creation.e2e.spec.js` covers empty creation/reload, automatic membership, equivalent/reserved names, storage failure, empty rename/Trash/Restore, Enter/Escape/focus, 320px light/dark accessibility and footer geometry, approved cloud insertion, retry/offline/duplicate submission, fresh catalog and Trash conflicts, and guest/unapproved restrictions.

Visual evidence is in `docs/audit-screenshots/2026-10-04/playlist-create-*.png`, with the visible phone rail in `playlist-rail-phone-light.png`. The finish reviewer identified one material phone-footer alignment fix; the inherited primary-button grid placement was overridden and an explicit layout regression added.

## Follow-up: single dismissal (October 4, 2026)

Dany requested removing redundant Cancel buttons. New playlist now has only its header X and Create playlist action; the existing close/focus and pending-save protection are retained. Original playlist screenshots above document the earlier two-button footer. Current menu dismissal evidence uses `dismiss-*.png` in the same dated evidence directory.
