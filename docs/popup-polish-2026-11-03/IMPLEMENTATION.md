# Popup system refinement — 3 November 2026

Status: implemented locally on `design3.0`, not committed/pushed/deployed by this task. All captures use invented device-only records and block external requests. No production data, schema, permissions, or upload pipeline changed.

## Findings and implementation

| Before | After | Why |
| --- | --- | --- |
| Playlist rename used the generic 720px dialog, with its name as the title and a second management label. | A 460px Edit playlist card; the editable field supplies the actual name. | Give a one-field task an appropriate size and a clear purpose. |
| Trash competed with Save as a large filled action above it on phones. | Full-width Save, then a separated quiet Trash action. | Preserve recoverable deletion while making the primary task obvious. |
| Menu rows resembled separate outlined buttons; theme text was centered inside its grid cell. | Left-aligned, unboxed action rows; all account labels share the same start position. | Reduce competing boundaries and repair a genuine alignment defect. |
| Account popover used a fixed 128px phone offset, separated from the avatar. | Position from the trigger’s actual bounds, 8px below it; update on resize. | Make its origin legible and keep it within the viewport. |
| Task cards had differing padding, headers and action boundaries. | Shared opaque card material, 20px corners, 24/20px insets and consistent headers. | One visual vocabulary; no new nested cards or decorative blur. |
| Centered dialogs had an entrance but no visual exit. | Compact cards enter200ms/exit120ms; workspace content closes immediately with a softer backdrop exit. | Retain synchronous cleanup in complex forms rather than exposing cleared inputs during a fade. |
| A retained closing dialog could still expose old controls. | Closed dialog/popover chrome becomes inert and ARIA-hidden; both restore before opening. | Visual presence must not retain actionable or duplicate accessible controls. |
| A scale entrance shrank 44px targets below their intended size in initial testing. | Forms translate/fade without scale; a new frame-sampling regression checks target sizes during entry. | Keep readable text and full-size controls throughout the transition. |
| Theme command carried `aria-pressed` despite being a plain menuitem. | Keep its existing descriptive action label and remove the unsupported ARIA state. | Correct semantics without changing theme behavior or arrow navigation. |

Native `<dialog>` and Popover remain responsible for modality, focus, Escape and light dismissal. This is not a replacement overlay framework. The restored capture forms and all their fields remain, and inline restaurant reviews remain tab panels. Full-screen images and restaurant drawer/gesture ownership are unchanged.

## Motion and compatibility decisions

- Compact task cards: 200ms entry, 120ms exit, existing strong ease-out, translation/opacity only. Centered origin retained. Large capture/review/photo/import/settings workspaces keep synchronous content cleanup and native close timing; only the backdrop gains a coordinated fade. Phone sheets retain220ms; desktop action menus and account retain180ms. Existing lookup 250/150ms behavior remains.
- CSS `display`/`overlay` retention is progressive enhancement. A detached native dialog probes actual open/closed `beforetoggle` dispatch; the inherited event-handler property alone is insufficient evidence. If unavailable, native closing is immediate. CSS feature checks avoid forcing unsupported discrete transitions.
- Keyboard input and reduced motion make overlay chrome immediate. Global input tracking does not prevent, capture, or cancel the underlying gestures. No new animation library, animated blur, inherited per-frame CSS variable, layout animation or permanent `will-change` promotion.
- Closing is logical immediately. Only the two playlist form resets wait for the card's visual exit. Ownership tokens prevent old exits clearing newly entered text; an opener synchronously flushes an old reset before filling fresh values. Validation, dirty-state decisions, creation/rename/Trash, and cloud requests keep their existing contracts.
- The account menu uses a bounded scroll area for short viewports and wraps long identity text. Destructive review/dish actions keep their existing 8px separation. Closing retained overlays are noninteractive and absent from the accessibility tree.

This targets predictable, inexpensive motion; it is not proof of 60/120fps performance on physical phones. Safari/iOS hardware, assistive technology and real weak-network uploads remain unverified. Chromium emulation and code inspection cannot certify those paths.

## Research applied

- [NN/g: Modal and Nonmodal Dialogs](https://www.nngroup.com/articles/modal-nonmodal-dialog/) supports focused, contextual dialogs for bounded tasks and warns against unnecessary interruption. We retained existing task dialogs and simplified their hierarchy rather than adding modal navigation.
- [MDN: dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) and [Chrome: entry/exit animations](https://developer.chrome.com/blog/entry-exit-animations) explain native focus/modality plus `@starting-style`, discrete `display`, and `overlay` retention. We kept native primitives, used feature-gated transitions, and handled closed-state accessibility separately from visual exit.
- Installed Impeccable Distill/Polish and Emil Design Engineering guidance informed the aligned rows, quiet destructive treatment, transform/opacity motion, interruption checks and keyboard path. Animation Performance/Animate guidance supported the conservative property choices. Project decisions in thought_Process.md take precedence over generic suggestions.

## Skill research

Find Skills searched the public leaderboard and CLI for web animation and verified the official candidate rather than recommending from its name alone. Existing installed Impeccable, Emil Design Engineering, Animate, Apple Design and Animation Performance already cover the core craft work.

The most useful optional addition is [GoogleChrome/modern-web-guidance](https://github.com/GoogleChrome/modern-web-guidance), specifically [modern-web-guidance](https://skills.sh/googlechrome/modern-web-guidance/modern-web-guidance). The directory returned approximately37.4K installs and the official repository approximately2.6K stars during research. Its reviewed skill focuses on modern native browser APIs, accessibility, performance and compatibility rather than supplying a new visual theme. No additional skill was installed, and its external skill text was evaluated as research, not as project authorization.

Install option: `npx skills add googlechrome/modern-web-guidance@modern-web-guidance`. Use the project’s normal skill installer if Dany chooses to add it. The application itself gains no dependency from this refinement.

## Validation

- `npm run check`: syntax checks and **165 unit tests passed**, including four visual-cleanup ownership cases.
- Final full Playwright run: **480 passed, 28 intentional platform skips, zero failures** (508 cases, 3.1 minutes).
- New popup coverage exercises320/390/1024/1440px, both themes, accessible names/contrast, primary-versus-destructive action geometry, trigger positioning/alignment, rapid close/reopen, instant keyboard/reduced motion, the conservative immediate-close path, and full-size controls during entry. Fractional DOMRect rounding is normalized at0.001px; shrinking targets still fail.
- Existing full-suite coverage passed for capture and photo-only uploads, immediate whole-batch Save, expired picker handles, device-storage failures/retries, drafts, save acknowledgement, playlist rename/Trash/Restore, permission boundaries, gallery gestures, scroll/focus stability, history, maps and startup.
- `npm run build`, `git diff --check` and local documentation links passed. Settled before/after captures were inspected across mobile/desktop and light/dark. The final motion-only correction removes scale; it does not change the settled captures.
- Physical Safari/iPhone, assistive-technology behavior and real production write/failure paths were not tested. No production writes were used for validation.

## Visual evidence

Baseline source: `83f4cba`. Final settled captures retain the same fictional collection and screen sizes.

- Playlist: [phone before](before-390-light-playlist.png) / [phone after](after-390-light-playlist.png); [desktop dark after](after-1440-dark-playlist.png).
- Account: [phone before](before-390-light-account.png) / [phone after](after-390-light-account.png).
- Actions: [desktop before](before-1440-dark-actions.png) / [desktop after](after-1440-dark-actions.png); [phone after](after-390-dark-actions.png).
- Representative workspaces: [filters](after-390-dark-filters.png), [review](after-390-light-review.png), [settings](after-1440-light-settings.png), [creation](after-390-dark-create.png).
- [Capture script](capture.mjs): run a local preview on4183 or set `POPUP_PREVIEW_URL`. External requests are blocked. The complete image set includes light/dark, 390px and1440px variants; browser tests cover320px and1024px too.

## Hook review and sidecar refresh

The Stop hook attributed a `dark-glow` warning to index.html without a line/value-specific ignore command. Index contains no shadow declaration. The linked stylesheet contains pre-existing offset light-theme #073d4a elevation, overridden by neutral dark-theme shadows. A local dark-theme computed-style check found `--shadow` ending in `rgb(0 0 0 / 45%)`, compact card elevation `rgba(0, 0, 0, 0.32) 0px 24px 72px`, and zero visible elements with #073d4a box shadows. This is a static theme-cascade false positive, not a new decorative glow.

Persisted the narrow file-scoped `dark-glow=*` exception for index.html through Impeccable's `hooks ignore-value`, with the evidence in its reason. No global rule/file ignore was added, and styles.css remains checked. Intentional light-theme offset elevation and accessible focus rings remain unchanged; no runtime glow fix was needed.

Refreshed `.impeccable/design.json` from the existing frontmatter/current styles: theme color metadata, neutral overlay shadows, split dialog/lookup motion, updated playlist/photo-card/navigation/recovery samples, and a compact editor sample. Kept DESIGN.md and application code untouched in this hook review. JSON/component-reference checks and a bounded repeat of the index detector pass succeed; the reported dark-glow finding is absent. Prior 165-unit/480-browser runtime results still apply because only metadata/configuration/documentation changed.
