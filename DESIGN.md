---
name: FoodLog — Porcelain & Bronze
description: A calm, editorial shared dining journal with stable motion and direct navigation.
colors:
  porcelain: "#f7f6f3"
  surface: "#ffffff"
  charcoal: "#34302c"
  stone: "#eae5df"
  bronze: "#91613c"
  ink: "#282624"
  quiet-ink: "#66615c"
  hairline: "#e2ded8"
  dark-canvas: "#1c1b1a"
  dark-surface: "#252321"
  dark-surface-soft: "#302d2a"
  dark-text: "#f4f1ed"
  dark-muted: "#c2bbb3"
  dark-accent: "#d3ac84"
  bookmark-bronze: "#805332"
  danger: "#a13e34"
typography:
  display:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(2rem, 4vw, 4rem)"
    fontWeight: 700
    lineHeight: 0.96
  headline:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(1.875rem, 3.2vw, 3rem)"
    fontWeight: 700
    lineHeight: 0.96
  title:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "1.1875rem"
    fontWeight: 700
    lineHeight: 1.05
  body:
    fontFamily: "Atkinson Hyperlegible Next, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Atkinson Hyperlegible Next, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 680
    lineHeight: 1.2
rounded:
  small: "8px"
  control: "12px"
  surface: "18px"
  pill: "999px"
spacing:
  xsmall: "4px"
  small: "8px"
  medium: "12px"
  large: "16px"
  xlarge: "24px"
  xxlarge: "32px"
  display: "48px"
components:
  button-primary:
    backgroundColor: "{colors.charcoal}"
    textColor: "{colors.porcelain}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "#ffffff"
    textColor: "{colors.charcoal}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "44px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "44px"
  ticket:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "14px"
---

# Design System: FoodLog — Porcelain & Bronze

## Capture form refinements

- Put the restaurant name before optional location and cuisine lookups, then compact visit-intent choices. Keep the primary capture path on one page and place bookmark, price, playlists, rating, friends, notes, and photos inside More details.
- Location and cuisine use editable comboboxes with top-layer option menus. Show the complete matching dataset inside a bounded, natively scrollable list; do not truncate the available records. Preserve touch panning, keyboard active-option scrolling, Escape dismissal, visible clear controls, and the explicit duplicate-recovery choice.
- Search preferred names and registered Arabic/English aliases. Rank exact, prefix, substring, alias, and typo suggestions; show multiple useful close matches and city context where known. Announce result counts without moving the form while typing.
- Missing entries use a separate Add action followed by an inline name preview, existing-match choices, Create new, and Keep searching. Never preselect creation for Enter or accept unconfirmed free text on Save. Optional fields can stay blank. Confirmation survives a full-form draft and resets when its identity changes or a quick dialog is reopened.
- The restaurant footer is Save only at every width. Dish keeps Save, Save & add another, and Continue (Add my review / Add photos). Close remains in the header. Restored and locally saved drafts use one compact status strip above the fields: document icon, bold state, short recovery detail, and the adjacent Discard draft action. It must not resemble a labeled input or compete with the save footer. Preserve draft recovery and repeat entry.
- A dish editor opens from its restaurant and returns to that restaurant on completion or close; repeat entry stays in the editor.

## Overview

The [2026-10-03 UI/UX audit](docs/UI_UX_AUDIT_2026-10-03.md) records research, implemented quality-of-life improvements, validation, and remaining device checks. Own-review rows have visible actions plus optional hold/right-click, recoverable Trash with guarded Undo, and restaurant-review drafts scoped to account/place/tab. Draft recovery includes explicit Discard and warns when the cached saved review changed. The intentional page zoom lock stays at Dany’s request.

**Creative North Star: "Porcelain & Bronze"**

FoodLog feels like a well-made restaurant journal: warm white pages, quiet charcoal structure, stone selection surfaces, restrained bronze highlights, and editorial type for the places and meals people want to remember. The interface stays calm so restaurant photography, names, and shared memories carry the experience.

The product is used repeatedly on phones while people decide where to eat and add memories at the table. Navigation, capture, and return transitions must therefore feel stable, interruptible, and familiar. Returning from a restaurant keeps the live Places list, its scroll position, and carousel state instead of visually rebuilding the screen.

**Key Characteristics:**

- A compact rail keeps Places, Map, search, and Add immediately available.
- Restaurant rows are compact editorial tickets with a reserved thumbnail, strong name, bubble metadata tags, and a clean inline rating.
- Stone surfaces identify selection and grouped controls; porcelain and charcoal keep content quiet.
- Food photography and friend opinions carry the detail view.
- Charcoal is the structural brand color in the light theme; dark mode uses charcoal, elevated neutral surfaces, ivory type, stone support, and warm bronze.
- Light and dark themes preserve the same hierarchy and component character.

## Colors

The light palette uses warm porcelain with neutral structure and one appetite signal. The dark palette keeps the same relationships on charcoal without becoming pure black.

### Primary

- **Charcoal** (`#34302c`): primary controls, active navigation, strong headings, and selected states.

### Secondary

- **Bronze** (`#91613C`): rare emphasis for ratings, focus accents, and consequential moments. Use `#805332` when bronze must carry small text on porcelain.

### Neutral

- **Porcelain** (`#F7F6F3`): light theme canvas and clean content surface.
- **Stone** (`#EAE5DF`): selected rows, grouped controls, and quiet feedback.
- **Ink** (`#282624`): primary light-theme text.
- **Charcoal** (`#1C1B1A`): dark theme canvas.
- **Elevated Charcoal** (`#252321`): elevated dark-theme panels.
- **Ivory** (`#F4F1ED`): primary dark-theme text.
- **Dark Stone** (`#C2BBB3`): supporting dark-theme text and selected surfaces.
- **Warm Bronze** (`#D3AC84`): dark-theme appetite and focus accent.

**The Appetite Mark Rule.** Bronze stays rare. It identifies ratings, appetite, focus, or a consequential state rather than decorating routine controls.

## Typography

**Display Font:** Newsreader Variable, locally bundled (with Georgia and serif fallbacks)

**Body Font:** Atkinson Hyperlegible Next (with system sans-serif fallback)

**Label Font:** Atkinson Hyperlegible Next

**Character:** Newsreader gives restaurant names and headings a warm editorial voice. Atkinson keeps metadata, reviews, and controls highly legible.

### Hierarchy

- **Display** (700, responsive and capped below `4rem`, compact line-height): page thesis and empty-state moments only. `.hero-panel` stays hidden once the journal has any active place.
- **Headline** (700, responsive `1.5rem-2.25rem`): restaurant and picker titles.
- **Title** (650, `1rem-1.25rem`): list rows, dishes, and dialog sections.
- **Body** (400-500, `0.9375rem-1rem`, generous line-height): descriptions and reviews, capped near 70 characters.
- **Label** (650, `0.75rem-0.875rem`): controls and metadata in sentence case.

**The Menu Voice Rule.** Labels state what people can do. Decorative uppercase, fake ticket numbers, and poetic microcopy are not part of the system.

## Layout

Desktop uses a compact horizontal header followed by a two-zone workspace: a scannable restaurant list and a persistent detail stage. Dense information is separated by space and single hairlines rather than nested cards.

Mobile collapses to one focused column with a sticky top rail and a bottom action dock. Places stays in the dock, and editors also see Add. Map stays on the desktop rail, not the phone dock. Selecting a place opens a full-screen detail state with a visible Back action and preserved list position. All viewport-filling states use dynamic viewport units and safe-area padding. The document viewport includes `viewport-fit=cover` so those insets apply on notched devices. Page zoom is locked (`minimum-scale=1`, `maximum-scale=1`, `user-scalable=no`, pan-only `touch-action`, plus blocked two-finger and ctrl/trackpad-wheel gestures). Pinch remains only inside the photo gallery. The Map tab still pinches the map itself.

The spacing system follows a 4px base with 8, 12, 16, 24, 32, and 48px steps. Information within one task stays tight; unrelated tasks receive clear separation.

## Elevation & Depth

Clean matte surfaces without ceramic texture establish grouping without enclosing every row. Restaurant entries use separators and a stone selected state; detail, dish, menu, and dialog surfaces use restrained shadows. Dark mode relies primarily on tonal separation. Depth communicates interaction and nesting.

**The Pass Surface Rule.** Card elevation replaces enclosing borders. Never stack a prominent outline and a shadow on a resting card.

## Shapes

Corners follow the nesting: 18px content surfaces, 16px sheets and dialogs, 12px controls and thumbnails, and smaller photo corners inside cards. Small state chips may be pill-shaped because they are compact controls, not containers.

## Components

### Buttons

- **Shape:** tactile 12px corners with a minimum 44px target, including Check link.
- **Primary:** Charcoal background with Porcelain text.
- **Hover / Focus:** small tonal shift, visible two-layer focus ring, and exact transform/color transitions. Hover fills and lifts apply only for fine pointers so a tap does not leave a sticky hover.
- **Active:** subtle `scale(0.98)` feedback over 120ms. Keyboard activation is not animated.

### Chips

- **Style:** quiet Stone background with Ink text.
- **State:** selected chips invert to Charcoal; Bronze is not used for routine filter selection.
- **Visit status:** All / Not visited / Visited chips sit in the list header. They combine with search, playlist, location, cuisine, price, rating, and the personal Bookmarks filter. A Visited place can still stay in Bookmarks for a return visit.
- **Bookmarks:** approved editors (and local-only mode) get a separate Bookmarks chip that shows only the current user's saved places. It is private, independent of shared Visited / Not visited status, and can be combined with those chips. Signed-out visitors do not see it.
- **Applied filters:** active search, location, cuisine, price, rating, visit-status, and Bookmarks criteria appear as dismissible chips near the results. Removing one chip clears only that criterion. Sort is not treated as a filter.
- **Playlist counts:** a playlist chip keeps its full membership count. When search or another filter narrows the visible list, the rail states “shown of total” and offers a visible 44px Show all action that clears only narrowing criteria while preserving the selected playlist and sort order.
- **Playlist chips:** exclusive filter chips that use the same pressed state as visit chips. They are not a tablist; they filter the same ticket list. The Filters control keeps its visible “Filters” label at narrow widths.

### Cards / Containers

- **Corner Style:** the restaurant list uses an 18px outer corner with square shared row edges, dish cards use 16px, photos inset by 12px use 4px corners, and recessed reviews use 6px corners. Outer trays have broader 24–28px corners.
- **Background:** Porcelain and Stone in light mode; Charcoal and elevated Charcoal in dark mode.
- **Shadow Strategy:** restaurant rows stay flat inside one bordered list surface; the selected restaurant adds a tonal fill and charcoal leading inset accent. Menus, sheets, and dialogs use restrained elevation.
- **Border:** restaurant rows share one quiet enclosing outline and hairline separators. Dish trays, dish cards, and review summaries stay borderless; keyboard focus remains explicit.
- **Media:** use real stored restaurant and dish photography. Missing photos reserve the same space and show a deliberate initials fallback, preventing layout shifts.

### Inputs / Fields

- **Style:** visible label above a solid tonal field, 12px corners, and no placeholder-as-label. Restaurant Place uses “Place name…”; dish uses “Dish name…”. Never use a real restaurant or dish name as the hint.
- **Focus:** Charcoal ring in light mode and warm bronze in dark mode. The ring stays at least 3:1 against the canvas.
- **Error / Disabled:** contextual text below the field; disabled state preserves readable contrast.
- **Duplicate prevention:** restaurant name and location are checked against similar existing places while typing and against a fresh cloud list before Save. Possible matches appear in an inline warning with an Open existing action and an explicit separate-place confirmation; the warning never silently blocks legitimate branches or namesakes.
- **Offline recovery:** a restaurant saved while cloud access is unavailable remains visible with an Unsynced marker and a plain recovery instruction. Restoring cloud data must preserve that local record until an editor reviews and saves it.

### Navigation

Desktop navigation sits in the horizontal header. Active destinations use a solid structural state. Places and Map remain the desktop destinations. The phone dock preserves Places plus the approved editor’s Add action in a 16px tray with 44px or larger targets; Map remains available on desktop. The dock never reserves space for a control that is absent. Restaurant detail uses a compact, visibly styled Back control. Opening a place on a phone slides the opaque restaurant page in from the right over the live, dimmed Places list using the existing 180ms drawer settle. The overlay sits below the fixed header so a strip of Places remains visible. Distance and velocity thresholds, interrupted-swipe handling, transform/opacity settling, and an immediate reduced-motion path remain. Returning restores the prior list scroll position and carousel state. Editors see Add dish beside the dish heading.

### Visit status

A place is **Visited** when it has an active restaurant rating, a visited-by name, or an active dish. Otherwise it is **Not visited**. List rows and the detail title show that status with both a label and a distinct color/icon treatment. Editors can mark a Not visited place as Visited without opening Edit. **Bookmarks** is a separate per-user collection; the Bookmarks chip filters to that personal set. A bookmarked row shows one small, flat bookmark lozenge beside visit status, using a warm tint and the universal bookmark glyph instead of the older purple button.

### Restaurant row

The restaurant list item is the signature component. It combines an editorial title, a Visited or Not visited capsule, one image crop or reserved media slot, cuisine/location/playlist/price/dish metadata bubbles, the group score, and bookmark status. List rows remain a single selection target. The selected restaurant has a direct Bookmark toggle beside its title, with the existing More path retained. Rows share one quiet list surface and hairline separators, keeping the scan dense while preserving 44px interaction targets. Metadata uses rounded bubble tags. Bookmark status uses a smaller 26 × 24px flat lozenge beside the visit capsule; it participates in the title layout and never floats over the rating or metadata. The rating is clean inline text with no filled tile. The selected row gains stone fill and a slim charcoal inset accent.

Restaurant photography uses a reserved 96 × 92px crop on desktop, 78px square at common phone widths, and 72px square at the narrowest breakpoint so food remains recognizable without crowding the ticket actions. Editors can mark any active restaurant-gallery image as the main photo through a visible gallery control. That choice changes only the list crop reference: it never moves, replaces, or deletes the original image. When no main photo is chosen, the list keeps the established fallback order of newest restaurant photo, then the first available dish photo, then restaurant initials.

### Shared photo galleries

Keep each dish as one shared entry with separate friend reviews. Photo contributions do not require a rating. Show the contributor with the active photo, preserve unknown attribution for legacy images, and pair swipe/arrow shortcuts with visible previous/next buttons. Changing the cover never removes the previous image. Stack photo and dish content vertically; size the gallery image to leave room for its controls. Dish collections use quiet tonal grouping and slightly deeper review surfaces so the tappable review area is easy to recognize.

### Motion

- Press feedback completes in 120ms. Anchored menus enter and dismiss in 180ms. Touch sheets settle in 220ms. The restaurant drawer remains 180ms.
- Native dialogs enter with a restrained 8px rise-and-fade over 250ms. They close immediately through the native dialog path so focus restoration, Escape dismissal, and subsequent actions are never held behind an outgoing top-layer animation. Translation keeps every touch target at full size throughout entry.
- Disclosure panels expand and collapse over 250ms using intrinsic grid height, paired content opacity/blur, and a rotating chevron. Collapsed content is inert so visual and assistive states stay aligned.
- Toasts enter upward over 350ms and leave over 250ms with a small scale and blur. A newer toast always cancels the previous hide cleanup instead of disappearing early.
- Animate transform and opacity. Reserve image and control space before content arrives so refreshes do not move nearby elements.
- Keep stable keyed DOM nodes during filtering, background refresh, detail open, and Back. Entrance effects run only when a surface is newly introduced.
- Menus and sheets restore focus on dismissal. Escape dismisses the active transient surface. Gestures stay interruptible and reduced motion resolves immediately without decorative movement.

### Creation and reviews

FoodLog has one global Add place entry: the top rail on desktop and the bottom navigation on mobile. Restaurant pages contain the contextual actions for adding a dish, adding or editing the current person's restaurant rating, and opening a dish's shared reviews. This keeps creation predictable and keeps every review attached to the place or dish it describes.

Restaurant Place / Details / Memories and dish Dish / Your take / Photos can be opened in any order. Save still requires a name and the existing field checks. A required empty name uses the product summary (`Restaurant name is required.` / `Dish name is required.`), not the browser’s generic required wording. Type mismatches still use the field’s native messtone. Bottom sheets contain overscroll so the page behind does not move; reduced motion skips the sheet slide-up, ticket-badge rotation, and press scale. On phones, scroll-padding keeps focused controls clear of the sticky rail and dock.

On phones, a place with no restaurant ratings shows dishes and photos before the empty ratings block so the first screen is the food. Desktop keeps ratings, then photos, then dishes. Add your rating stays on the average-rating tile.

The home-screen and document name is FoodLog. Table Notes remains the journal subtitle and design-system name.

Search, playlist, visit, location, cuisine, price, rating, and sort already write to the URL. History writing skips OAuth callback URLs so `?code=` stays until `getSession()`.

### Restaurant queue and no-photo detail

Tickets give restaurant names a full flexible column alongside a 72px media slot. The bookmark lozenge follows the visit capsule in normal flow, while the group rating keeps its reserved edge position; playlist membership remains readable in the metadata. The selected ticket uses a deeper tonal fill and a slim leading inset accent. When no restaurant photo exists, the detail header uses a short, full-width initials placeholder; real photos retain the existing image-led treatment.

## Do's and Don'ts

### Do:

- **Do** show real restaurant and dish photography as the primary visual material.
- **Do** keep every existing workflow findable within the redesigned shell.
- **Do** use Bronze only for appetite, focus, and consequential decision states.
- **Do** provide complete loading, empty, error, disabled, and permission states.
- **Do** keep gesture shortcuts optional and pair them with visible controls.

### Don't:

- **Don't** imitate aged paper, handwritten notebooks, receipt printers, or novelty restaurant decor.
- **Don't** use a generic metric-dashboard hero or equal card grid.
- **Don't** hide editing, Bookmarks, reviews, or playlist membership behind long press. Playlist membership is edited in Edit restaurant; rename and Trash stay on the playlist rail.
- **Don't** animate frequent navigation or keyboard-driven actions.
- **Don't** permanently remove shared content or associated media from the interface.

## Restaurant rating and photo actions

- Keep personal rating access as an underlined star-and-text shortcut beside Average rating. It opens the existing rating dialog and stays independent of restaurant metadata editing permissions. The main action group contains Maps and More; a pressed-state Bookmark toggle sits beside the title. Dishes, Reviews, and Photos section controls scroll to and focus their headings. Mobile Back includes the place name and retains the first-use swipe hint.
- Restaurant photo cards grow with attribution text. Keep main-photo status, Use as main, and the 44px icon-only Trash action in a wrapping footer below the caption; never position these controls over an image or contributor credit. Trash retains its accessible label, tooltip, confirmation, and recoverable behavior.

## Dish photo contributions and reviews

- Keep Take photo and Choose photos together, followed by an optional Also add a review checkbox. Checking it reveals the existing half-star rating pattern and review field; existing personal reviews prefill only for an explicit update. Photo-only saves do not change reviews.
- Validate the optional rating before uploads. Explain partial success when photos save but the review fails, preserve input, and allow retrying the review without uploading completed photos again.
- Review prose is bold primary text: 15px in compact previews and 16px in full review sheets, with distinct spacing before timestamps. Author identity and timestamps remain readable supporting information.

## Quick missing restaurant details

- Add location and Add cuisine open a compact single-field dialog with the restaurant name, searchable existing suggestions/aliases, deliberate new-entry confirmation, Cancel, and Save. Reuse the full editor's lookup validation; the full restaurant editor remains available through More.
- Save only the selected field and audit metadata under existing contributor permissions. Keep failures and typed text in the dialog, prevent duplicate submits, and restore focus to the opener or More after saving. Cloud places must be connected and synced for this narrow update; the existing full-editor offline workflow remains available.

### Guided form hierarchy

Use short step headings (24–30px) with one supporting sentence at 15px. Keep labels distinct from lighter, smaller helper text; avoid repeating optionality in multiple paragraphs. The Place / Details / Memories (and Dish / Your take / Photos) rail shows a 1–2–3 index so the sections read as a sequence; the accessible name stays the section label. Keep the existing capture header (title + close). The Place step offers name or a pasted Maps link, with a full-width Check link on a quiet mint surface, then visit status in a bordered card separated by 48px, with the legend in normal flow and 24px inner padding. Restaurant Place and Details use Continue; Memories uses Save place. Details and Memories retain their existing disclosure groups. Empty Maps status reserves no space; populated status and previews remain visible. Preserve all fields, keyboard controls, and fixed save/navigation actions.

### Upload progress and personal restaurant reviews

Show photo progress only while a queued save is active or paused. Use one quiet tonal strip with a plain-language state, percentage, completed count, and a native progress element. Keep it within the Photos step and preserve selected previews when an upload pauses.

The focused restaurant rating dialog may include an optional personal review. Keep rating required, review text optional, and identify the signed-in contributor. On the restaurant page, review prose uses the stronger text hierarchy already established for dish reviews; timestamp and identity remain secondary.

### Ceramic surface texture

Use the existing light/dark ceramic speckle tiles sparingly on the page canvas, Places list, restaurant detail, dish-section surfaces, and photo placeholders at their native 144px repeat size. Keep controls and photographs clear; use background layers rather than interactive overlays. Omit decorative texture for print and forced-colors mode.

### Shared lookup fields

Location and cuisine use an editable autocomplete that makes existing values visible before someone creates a new one. Keep existing, suggested-match, and create-new choices inside one compact anchored menu; opening and selecting must not resize or scroll the form. Swap helper and selection feedback inside one reserved line, and expand it only when save needs a spelling decision. Use an origin-aware 250ms open and 150ms close with the shared smooth-out easing and a reduced-motion path. Canonicalize exact matches across case, accents, spacing, and punctuation. Open quick-editor menus upward so their actions remain available.

### Restaurant quick capture

Restaurant capture uses one primary surface: name, optional Maps disclosure, Location, Cuisine, visit intent, and persistent Save restaurant. Optional planning/memories/photos live under More details. Lookup lists float in the native top layer with a compact existing/suggested/new distinction; opening, typing, clearing, and choosing do not move adjacent fields. Clear controls retain focus. Escape first closes the open list, then the dialog. Preserve the existing 250ms open / 150ms close transform-opacity motion and reduced-motion path.

### Search and filter recovery

Filters apply immediately; the footer says Show N places rather than Apply. Empty results offer Clear search and Reset filters beside the messtone. Reset filters keeps the chosen playlist and sort; the filter sheet’s Reset filters and sort keeps its broader existing behavior. Dish-name searches explain the match in each result and opening that result scrolls to the first matching dish.

### Shared alignment and spacing

Use 8px between related controls, 12–16px between action groups, and 24px between sections. Action sheets use a shared card gap, with Cancel separated from the actions. Keep 44px review action/moderation targets. At narrow widths, restaurant author names wrap on their own line, followed by stars and right-aligned actions; keep review prose selectable. Filter footers stack below 360px. The sticky mobile header shares the detail panel’s 12px inset. Title, visit state, and Bookmark align without individual bottom margins. Undo toasts fit the viewport and keep their action visible.

The October 3 palette update uses warm white/stone in light mode and neutral charcoal in dark mode. Bronze carries ratings and focus; danger keeps its semantic red. Browser theme color and the in-app vector mark follow the palette. Existing installed raster app icons retain their artwork.

Location/cuisine clearing uses a visible Clear label with a 44px minimum target. Clearing retains input focus, closes suggestions and leaves capture open; outside taps and Escape dismiss the menu first. Owner Settings catalog tools use the existing neutral palette, searchable rows, inline rename/confirmation, and stacked actions on narrow phones. Delete removes suggestions and offers Restore; it never cascades into restaurant data.
