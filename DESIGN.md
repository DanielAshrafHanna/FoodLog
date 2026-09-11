---
name: FoodLog - Table Notes
description: A task-first shared dining journal shaped by the rhythm of a restaurant order rail.
colors:
  pass-forest: "#174a3b"
  paprika-mark: "#f05a28"
  cool-chalk: "#f6f7f3"
  prep-surface: "#e7ece7"
  herb-wash: "#eaf1eb"
  clay-wash: "#f8ead8"
  ceramic-surface: "#fffaf2"
  ledger-ink: "#161b18"
  quiet-ink: "#52615a"
  hairline: "#d7dfd9"
  night-pass: "#131416"
  dark-surface: "#1c1e22"
  dark-surface-soft: "#25282d"
  dark-text: "#ede9e1"
  dark-muted: "#9b9690"
  dark-line: "#343940"
  dark-accent: "#f39a1f"
  want-to-go-purple: "hsl(262, 42%, 58%)"
  danger: "#a9382b"
typography:
  display:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 4vw, 4rem)"
    fontWeight: 700
    lineHeight: 0.96
  headline:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.875rem, 3.2vw, 3rem)"
    fontWeight: 700
    lineHeight: 0.96
  title:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
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
  control: "10px"
  surface: "14px"
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
    backgroundColor: "{colors.pass-forest}"
    textColor: "{colors.cool-chalk}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.cool-chalk}"
    textColor: "{colors.pass-forest}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "44px"
  input:
    backgroundColor: "{colors.cool-chalk}"
    textColor: "{colors.ledger-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "44px"
  ticket:
    backgroundColor: "{colors.cool-chalk}"
    textColor: "{colors.ledger-ink}"
    rounded: "{rounded.control}"
    padding: "14px"
---

# Design System: FoodLog - Table Notes

## Capture form refinements

- Put the restaurant name before compact visit-intent choices. Keep optional metadata accessible below it.
- Restaurant capture uses Place → Details → Memories; dish capture uses Dish → Your take → Photos. Keep one focused group visible and allow early saving once the name is present. Ratings, review, and people belong together; show photo previews only when populated.
- The restaurant footer is Save only at every width. Place / Details / Memories tabs move between sections. Dish keeps Save, Save & add another, and Continue (Add my review / Add photos). Close remains in the header. Place Discard draft next to the restored-draft message. Preserve draft recovery and repeat entry.
- A dish editor opens from its restaurant and returns to that restaurant on completion or close; repeat entry stays in the editor.

## Overview

**Creative North Star: "The Order Rail"**

Table Notes borrows the useful rhythm of a restaurant pass: active choices stay visible, information is clipped into legible tickets, and the plated result gets the largest visual space. It combines that operational clarity with a photo contact sheet and personal annotations, creating a shared journal that feels specific to meals with friends rather than to business analytics.

The product is used repeatedly, often on a phone while a group is deciding where to eat. Expression therefore lives in the rail, ticket proportions, photo crops, typography, and concise interaction feedback. Navigation and editing remain familiar, fast, and quiet.

**Key Characteristics:**

- A compact rail keeps Places, Map, search, and Add immediately available.
- Restaurant rows resemble confident order tickets without becoming novelty paper props.
- Cool herb surfaces distinguish restaurant browsing; warm ceramic surfaces distinguish dishes and reviews.
- Food photography and friend opinions carry the detail view.
- Forest is the structural brand color in the light theme; the dark theme returns to warm charcoal, linen, amber, and the established purple Want-to-go marker.
- Light and dark themes preserve the same hierarchy and component character.

## Colors

The light palette is a cool, green-cast chalk field with dark botanical structure and one warm appetite signal. The dark palette uses the earlier warm charcoal and linen system so night viewing feels neutral rather than green.

### Primary

- **Pass Forest** (`#174A3B`): primary controls, active navigation, strong headings, and selected states.

### Secondary

- **Paprika Mark** (`#F05A28`): rare emphasis for ratings and small moments that represent appetite.

### Neutral

- **Cool Chalk** (`#F6F7F3`): light theme canvas.
- **Prep Surface** (`#E7ECE7`): grouped controls and secondary surfaces.
- **Ledger Ink** (`#161B18`): primary light-theme text.
- **Night Pass** (`#131416`): dark theme canvas.
- **Dark Surface** (`#1C1E22`): elevated dark-theme panels.
- **Soft Linen** (`#EDE9E1`): primary dark-theme text and structural accent.
- **Warm Amber** (`#F39A1F`): dark-theme appetite and focus accent.

**The Appetite Mark Rule.** Paprika never becomes general decoration. It identifies appetite, a selected result, or a consequential state.

**Food surface roles.** Herb Wash (`#EAF1EB`) groups restaurant tickets and place-level information. Clay Wash (`#F8EAD8`) groups dish collections, while Ceramic Surface (`#FFFAF2`) keeps each dish readable. A sparse two-color ceramic speckle may texture those grouped surfaces at low contrast; it never overlays text or photography and does not imitate aged paper.

## Typography

**Display Font:** Bricolage Grotesque (with system sans-serif fallback)

**Body Font:** Atkinson Hyperlegible Next (with system sans-serif fallback)

**Label Font:** Atkinson Hyperlegible Next

**Character:** Bricolage supplies compact, slightly irregular headings that resemble confidently set menu type. Atkinson keeps dense restaurant metadata, reviews, and controls highly legible.

### Hierarchy

- **Display** (700, responsive and capped below `4rem`, compact line-height): page thesis and empty-state moments only. `.hero-panel` stays hidden once the journal has any active place.
- **Headline** (700, responsive `1.5rem-2.25rem`): restaurant and picker titles.
- **Title** (650, `1rem-1.25rem`): list rows, dishes, and dialog sections.
- **Body** (400-500, `0.9375rem-1rem`, generous line-height): descriptions and reviews, capped near 70 characters.
- **Label** (650, `0.75rem-0.875rem`): controls and metadata in sentence case.

**The Menu Voice Rule.** Labels state what people can do. Decorative uppercase, fake ticket numbers, and poetic microcopy are not part of the system.

## Layout

Desktop uses a compact top rail followed by a three-zone workspace: collapsible filters, a scannable restaurant queue, and a persistent detail stage. The center queue is deliberately narrower than the image-led detail region. Dense information is separated by space and single hairlines rather than nested cards.

Mobile collapses to one focused column with a sticky top rail and a bottom action dock. Places and Map remain visible, and editors also see Add; selecting a place opens a full-screen detail state with a visible Back action and preserved list position. All viewport-filling states use dynamic viewport units and safe-area padding. The document viewport includes `viewport-fit=cover` so those insets apply on notched devices.

The spacing system follows a 4px base with 8, 12, 16, 24, 32, and 48px steps. Information within one task stays tight; unrelated tasks receive clear separation.

## Elevation & Depth

Matte outer trays establish grouping without enclosing outlines. Restaurant and dish cards use short contact shadows and a faint upper highlight; dark mode relies primarily on tonal separation. Reviews sit in softly recessed surfaces. Depth communicates this nesting rather than decorating every control.

**The Pass Surface Rule.** Card elevation replaces enclosing borders. Never stack a prominent outline and a shadow on a resting card.

## Shapes

Corners follow the nesting: broad outer trays, 12px restaurant cards, 16px dish cards, and 4px photo corners at a 12px inset. Other content surfaces retain 14px corners. Inputs and standard buttons use 10px corners. Small state chips may be pill-shaped because they are compact controls, not containers.

## Components

### Buttons

- **Shape:** tactile 10px corners with a minimum 44px target, including Find on Maps and Check link.
- **Primary:** Pass Forest background with Cool Chalk text.
- **Hover / Focus:** small tonal shift, visible two-layer focus ring, and exact transform/color transitions. Hover fills and lifts apply only for fine pointers so a tap does not leave a sticky hover.
- **Active:** subtle `scale(0.98)` feedback. Keyboard activation is not animated.

### Chips

- **Style:** quiet Prep Surface background with Ledger Ink text.
- **State:** selected chips invert to Pass Forest; Paprika is not used for routine filter selection.
- **Visit status:** All / Not visited / Been chips sit in the list header. They combine with search, playlist, location, cuisine, price, rating, and the personal My list filter. A Been place can still stay on My list for a return visit.
- **My list:** approved editors (and local-only mode) get a separate My list chip that shows only the current user's bookmarks. It is private, independent of shared Been / Not visited status, and can be combined with those chips. Signed-out visitors do not see it.
- **Applied filters:** active search, location, cuisine, price, rating, visit-status, and My list criteria appear as dismissible chips near the results. Removing one chip clears only that criterion. Sort is not treated as a filter.
- **Playlist counts:** a playlist chip keeps its full membership count. When search or another filter narrows the visible list, the rail states “shown of total” and offers a visible 44px Show all action that clears only narrowing criteria while preserving the selected playlist and sort order.
- **Playlist chips:** exclusive filter chips that use the same pressed state as visit chips. They are not a tablist; they filter the same ticket list. The Filters control keeps its visible “Filters” label at narrow widths.

### Cards / Containers

- **Corner Style:** restaurant cards 12px, dish cards 16px, photos inset by 12px use 4px corners, and recessed reviews use 6px corners. Outer trays have broader 24–28px corners.
- **Background:** cool herb tonal contrast for restaurant sections and warm ceramic contrast for dish sections.
- **Shadow Strategy:** short contact shadows on cards; selected restaurant uses a tonal fill and a slim leading inset accent.
- **Border:** no enclosing outline on restaurant/dish trays, their cards, or review summaries; keyboard focus remains explicit.
- **Texture:** fine irregular ceramic grain is limited to exposed tray surfaces and empty-photo placeholders. Text areas, controls, and food photography remain clean. Restaurant cards have 8px separation; dish trays have 16px card gaps and 16px desktop / 12px mobile insets.

### Inputs / Fields

- **Style:** visible label above a solid tonal field, 10px corners, and no placeholder-as-label. Name fields use hints such as “Place name…” and “Dish name…”, never a real restaurant or dish name.
- **Focus:** Pass Forest ring in light mode (`#174A3B`) and a warm amber ring in dark mode (`#F39A1F`). The ring stays at least 3:1 against the canvas.
- **Error / Disabled:** contextual text below the field; disabled state preserves readable contrast.
- **Duplicate prevention:** restaurant name and location are checked against similar existing places while typing and against a fresh cloud list before Save. Possible matches appear in an inline warning with an Open existing action and an explicit separate-place confirmation; the warning never silently blocks legitimate branches or namesakes.
- **Offline recovery:** a restaurant saved while cloud access is unavailable remains visible with an Unsynced marker and a plain recovery instruction. Restoring cloud data must preserve that local record until an editor reviews and saves it.

### Navigation

The top rail remains one line on desktop. Active destinations use a solid or underlined structural state, not decorative dots. Places and Map are the only destination controls; Map is not duplicated in the list header. The phone dock is a 16px-radius tray with 6px padding holding two equal destination tabs (icon + label, 48px targets, 10px corners); approved editors also get Add as an `auto`-width action styled with the soft accent fill and a 1px inset ring so it reads as a button, not a third tab. Icons are drawn SVG, hidden on desktop where the rail stays text-only. The grid never reserves a column for a control that is not present. Restaurant detail uses a compact, visibly styled Back control; swiping right is an optional direct-manipulation shortcut with distance and velocity thresholds, a 180ms transform/opacity settle, and an immediate reduced-motion path. Returning restores the prior list position. Editors see Add dish among the detail actions.

### Visit status

A place is **Been** when it has an active restaurant rating, a visited-by name, or an active dish. Otherwise it is **Not visited**. List tickets and the detail title show that status with both a label and a distinct color/icon treatment: Not visited uses Prep Surface and Quiet Ink; purple is reserved for My list. Editors can mark a Not visited place as Been without opening Edit. **My list** is a separate per-user bookmark; the My list chip filters to that personal set.

### Order Ticket

The restaurant list item is the signature component. It combines a decisive title, a Been or Not visited marker, one image crop or reserved media slot, cuisine/location metadata, the group score, and quiet bookmark or playlist status. Planning controls stay in the selected restaurant's More menu so every list ticket remains a single, predictable selection target. Restaurant tickets sit on a lightly speckled herb surface; the selected ticket deepens that herb tone to connect visually to the persistent detail stage without becoming a nested card stack.

Restaurant photography uses a 76px square crop on desktop and a 72px square crop on mobile so food remains recognizable without crowding the ticket actions. Editors can mark any active restaurant-gallery image as the main photo through a visible gallery control. That choice changes only the list crop reference: it never moves, replaces, or deletes the original image. When no main photo is chosen, the list keeps the established fallback order of newest restaurant photo, then the first available dish photo, then restaurant initials.

### Shared photo galleries

Keep each dish as one shared entry with separate friend reviews. Photo contributions do not require a rating. Show the contributor with the active photo, preserve unknown attribution for legacy images, and pair swipe/arrow shortcuts with visible previous/next buttons. Changing the cover never removes the previous image. Stack photo and dish content vertically; size the gallery image to leave room for its controls. Dish collections use a warm clay group surface, clean ceramic cards, and a slightly deeper warm review surface so the tappable review area is easy to recognize.

### Creation and reviews

FoodLog has one global Add place entry: the top rail on desktop and the bottom navigation on mobile. Restaurant pages contain the contextual actions for adding a dish, adding or editing the current person's restaurant rating, and opening a dish's shared reviews. This keeps creation predictable and keeps every review attached to the place or dish it describes.

Restaurant Place / Details / Memories and dish Dish / Your take / Photos can be opened in any order. Save still requires a name and the existing field checks. A required empty name uses the product summary (`Restaurant name is required.` / `Dish name is required.`), not the browser’s generic required wording. Type mismatches still use the field’s native message. Bottom sheets contain overscroll so the page behind does not move; reduced motion skips the sheet slide-up, ticket-badge rotation, and press scale. On phones, scroll-padding keeps focused controls clear of the sticky rail and dock.

On phones, a place with no restaurant ratings shows dishes and photos before the empty ratings block so the first screen is the food. Desktop keeps ratings, then photos, then dishes. Add your rating stays on the average-rating tile.

The home-screen and document name is FoodLog. Table Notes remains the journal subtitle and design-system name.

Search, playlist, visit, location, cuisine, price, rating, and sort already write to the URL. History writing skips OAuth callback URLs so `?code=` stays until `getSession()`.

### Restaurant queue and no-photo detail

Tickets give restaurant names a full flexible column alongside a 72px media slot. A quiet status row holds the optional bookmark mark and group rating; playlist membership remains readable in the metadata. The selected ticket uses a deeper tonal fill, a slim leading inset accent, and the same shallow contact depth as the other tickets. When no restaurant photo exists, the detail header uses a short, full-width initials placeholder; real photos retain the existing image-led treatment.

## Do's and Don'ts

### Do:

- **Do** show real restaurant and dish photography as the primary visual material.
- **Do** keep every existing workflow findable within the redesigned shell.
- **Do** use Paprika Mark only for appetite and consequential decision states.
- **Do** provide complete loading, empty, error, disabled, and permission states.
- **Do** keep gesture shortcuts optional and pair them with visible controls.

### Don't:

- **Don't** imitate aged paper, handwritten notebooks, receipt printers, or novelty restaurant decor.
- **Don't** use a generic metric-dashboard hero or equal card grid.
- **Don't** hide editing, My list, reviews, or playlist membership behind long press. Playlist membership is edited in Edit restaurant; rename and Trash stay on the playlist rail.
- **Don't** animate frequent navigation or keyboard-driven actions.
- **Don't** permanently remove shared content or associated media from the interface.

## Restaurant rating and photo actions

- Keep personal rating access as an underlined star-and-text shortcut beside Average rating. It opens the existing rating dialog and stays independent of restaurant metadata editing permissions. The main action group contains Maps and More.
- Restaurant photo cards grow with attribution text. Keep main-photo status, Use as main, and the 44px icon-only Trash action in a wrapping footer below the caption; never position these controls over an image or contributor credit. Trash retains its accessible label, tooltip, confirmation, and recoverable behavior.

## Dish photo contributions and reviews

- Keep Take photo and Choose photos together, followed by an optional Also add a review checkbox. Checking it reveals the existing half-star rating pattern and review field; existing personal reviews prefill only for an explicit update. Photo-only saves do not change reviews.
- Validate the optional rating before uploads. Explain partial success when photos save but the review fails, preserve input, and allow retrying the review without uploading completed photos again.
- Review prose is bold primary text: 15px in compact previews and 16px in full review sheets, with distinct spacing before timestamps. Author identity and timestamps remain readable supporting information.

## Quick missing restaurant details

- Add location and Add cuisine open a compact single-field dialog with the restaurant name, existing suggestions, free text, Cancel, and Save. The full restaurant editor remains available through More.
- Save only the selected field and audit metadata under existing contributor permissions. Keep failures and typed text in the dialog, prevent duplicate submits, and restore focus to the opener or More after saving. Cloud places must be connected and synced for this narrow update; the existing full-editor offline workflow remains available.

### Guided form hierarchy

Use short step headings (24–30px) with one supporting sentence at 15px. Keep labels distinct from lighter, smaller helper text; avoid repeating optionality in multiple paragraphs. The Place / Details / Memories (and Dish / Your take / Photos) rail shows a 1–2–3 index so the sections read as a sequence; the accessible name stays the section label. The Maps card offers Find on Maps search and paste-a-link, then the existing preview/apply actions, on a quiet 12px-radius tonal surface with 16px padding. Visit status follows a fine divider, while Details and Memories retain their existing disclosure groups. Empty Maps status reserves no space; populated status and previews remain visible. Preserve all fields, keyboard controls, and fixed save/navigation actions.

### Upload progress and personal restaurant reviews

Show photo progress only while a queued save is active or paused. Use one quiet tonal strip with a plain-language state, percentage, completed count, and a native progress element. Keep it within the Photos step and preserve selected previews when an upload pauses.

The focused restaurant rating dialog may include an optional personal review. Keep rating required, review text optional, and identify the signed-in contributor. On the restaurant page, review prose uses the stronger text hierarchy already established for dish reviews; timestamp and identity remain secondary.
