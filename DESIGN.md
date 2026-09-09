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
- Keep Back, Save, and Save & add another reachable in the footer. Continue occupies its own row on narrow screens; Close remains in the header. Place Discard draft next to the restored-draft message. Preserve draft recovery and repeat entry.
- A dish editor opens from its restaurant and returns to that restaurant on completion or close; repeat entry stays in the editor.

## Overview

**Creative North Star: "The Order Rail"**

Table Notes borrows the useful rhythm of a restaurant pass: active choices stay visible, information is clipped into legible tickets, and the plated result gets the largest visual space. It combines that operational clarity with a photo contact sheet and personal annotations, creating a shared journal that feels specific to meals with friends rather than to business analytics.

The product is used repeatedly, often on a phone while a group is deciding where to eat. Expression therefore lives in the rail, ticket proportions, photo crops, typography, and concise interaction feedback. Navigation and editing remain familiar, fast, and quiet.

**Key Characteristics:**

- A compact rail keeps Places, Map, Pick, search, and Add immediately available.
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

- **Paprika Mark** (`#F05A28`): rare emphasis for ratings, final picker results, and small moments that represent appetite or decision.

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

- **Display** (700, responsive and capped below `4rem`, compact line-height): page thesis and empty-state moments only.
- **Headline** (700, responsive `1.5rem-2.25rem`): restaurant and picker titles.
- **Title** (650, `1rem-1.25rem`): list rows, dishes, and dialog sections.
- **Body** (400-500, `0.9375rem-1rem`, generous line-height): descriptions and reviews, capped near 70 characters.
- **Label** (650, `0.75rem-0.875rem`): controls and metadata in sentence case.

**The Menu Voice Rule.** Labels state what people can do. Decorative uppercase, fake ticket numbers, and poetic microcopy are not part of the system.

## Layout

Desktop uses a compact top rail followed by a three-zone workspace: collapsible filters, a scannable restaurant queue, and a persistent detail stage. The center queue is deliberately narrower than the image-led detail region. Dense information is separated by space and single hairlines rather than nested cards.

Mobile collapses to one focused column with a sticky top rail and a bottom action dock. Places, Map, and Pick remain visible; selecting a place opens a full-screen detail state with a visible Back action and preserved list position. All viewport-filling states use dynamic viewport units and safe-area padding.

The spacing system follows a 4px base with 8, 12, 16, 24, 32, and 48px steps. Information within one task stays tight; unrelated tasks receive clear separation.

## Elevation & Depth

Matte outer trays establish grouping without enclosing outlines. Restaurant and dish cards use short contact shadows and a faint upper highlight; dark mode relies primarily on tonal separation. Reviews sit in softly recessed surfaces. Depth communicates this nesting rather than decorating every control.

**The Pass Surface Rule.** Card elevation replaces enclosing borders. Never stack a prominent outline and a shadow on a resting card.

## Shapes

Corners follow the nesting: broad outer trays, 12px restaurant cards, 16px dish cards, and 4px photo corners at a 12px inset. Other content surfaces retain 14px corners. Inputs and standard buttons use 10px corners. Small state chips may be pill-shaped because they are compact controls, not containers.

## Components

### Buttons

- **Shape:** tactile 10px corners with a minimum 44px target.
- **Primary:** Pass Forest background with Cool Chalk text.
- **Hover / Focus:** small tonal shift, visible two-layer focus ring, and exact transform/color transitions.
- **Active:** subtle `scale(0.98)` feedback. Keyboard activation is not animated.

### Chips

- **Style:** quiet Prep Surface background with Ledger Ink text.
- **State:** selected chips invert to Pass Forest; Paprika is not used for routine filter selection.
- **Visit status:** All / Not visited / Been chips sit in the list header. They combine with search, playlist, location, cuisine, price, rating, and the personal My list filter. A Been place can still stay on My list for a return visit.
- **My list:** approved editors (and local-only mode) get a separate My list chip that shows only the current user's bookmarks. It is private, independent of shared Been / Not visited status, and can be combined with those chips. Signed-out visitors do not see it.
- **Applied filters:** active search, location, cuisine, price, rating, visit-status, and My list criteria appear as dismissible chips near the results. Removing one chip clears only that criterion. Sort is not treated as a filter.
- **Playlist counts:** a playlist chip keeps its full membership count. When search or another filter narrows the visible list, the rail states “shown of total” and offers a visible 44px Show all action that clears only narrowing criteria while preserving the selected playlist and sort order.

### Cards / Containers

- **Corner Style:** restaurant cards 12px, dish cards 16px, photos inset by 12px use 4px corners, and recessed reviews use 6px corners. Outer trays have broader 24–28px corners.
- **Background:** cool herb tonal contrast for restaurant sections and warm ceramic contrast for dish sections.
- **Shadow Strategy:** short contact shadows on cards; selected restaurant uses a tonal fill and a slim leading inset accent.
- **Border:** no enclosing outline on restaurant/dish trays, their cards, or review summaries; keyboard focus remains explicit.
- **Texture:** fine irregular ceramic grain is limited to exposed tray surfaces and empty-photo placeholders. Text areas, controls, and food photography remain clean. Restaurant cards have 8px separation; dish trays have 16px card gaps and 16px desktop / 12px mobile insets.

### Inputs / Fields

- **Style:** visible label above a solid tonal field, 10px corners, and no placeholder-as-label.
- **Focus:** Pass Forest ring in light mode and a warm amber ring in dark mode.
- **Error / Disabled:** contextual text below the field; disabled state preserves readable contrast.
- **Duplicate prevention:** restaurant name and location are checked against similar existing places while typing and against a fresh cloud list before Save. Possible matches appear in an inline warning with an Open existing action and an explicit separate-place confirmation; the warning never silently blocks legitimate branches or namesakes.
- **Offline recovery:** a restaurant saved while cloud access is unavailable remains visible with an Unsynced marker and a plain recovery instruction. Restoring cloud data must preserve that local record until an editor reviews and saves it.

### Navigation

The top rail remains one line on desktop. Active destinations use a solid or underlined structural state, not decorative dots. Places, Map, and Pick are the only destination controls; Map is not duplicated in the list header. Mobile destinations have text labels and 44px targets, and approved editors also get Add in the bottom dock. Restaurant detail uses a compact, visibly styled Back control; swiping right is an optional direct-manipulation shortcut with distance and velocity thresholds, a 180ms transform/opacity settle, and an immediate reduced-motion path. Returning restores the prior list position. Editors see Add dish among the detail actions.

### Visit status

A place is **Been** when it has an active restaurant rating, a visited-by name, or an active dish. Otherwise it is **Not visited**. List tickets and the detail title show that status with both a label and a distinct color/icon treatment. Editors can mark a Not visited place as Been without opening Edit. **My list** is a separate per-user bookmark; the My list chip filters to that personal set.

### Order Ticket

The restaurant list item is the signature component. It combines a decisive title, a Been or Not visited marker, one image crop or reserved media slot, cuisine/location metadata, the group score, and quiet bookmark or playlist status. Planning controls stay in the selected restaurant's More menu so every list ticket remains a single, predictable selection target. Restaurant tickets sit on a lightly speckled herb surface; the selected ticket deepens that herb tone to connect visually to the persistent detail stage without becoming a nested card stack.

Restaurant photography uses a 76px square crop on desktop and a 72px square crop on mobile so food remains recognizable without crowding the ticket actions. Editors can mark any active restaurant-gallery image as the main photo through a visible gallery control. That choice changes only the list crop reference: it never moves, replaces, or deletes the original image. When no main photo is chosen, the list keeps the established fallback order of newest restaurant photo, then the first available dish photo, then restaurant initials.

### Shared photo galleries

Keep each dish as one shared entry with separate friend reviews. Photo contributions do not require a rating. Show the contributor with the active photo, preserve unknown attribution for legacy images, and pair swipe/arrow shortcuts with visible previous/next buttons. Changing the cover never removes the previous image. Stack photo and dish content vertically; size the gallery image to leave room for its controls. Dish collections use a warm clay group surface, clean ceramic cards, and a slightly deeper warm review surface so the tappable review area is easy to recognize.

### Creation and reviews

FoodLog has one global Add place entry: the top rail on desktop and the bottom navigation on mobile. Restaurant pages contain the contextual actions for adding a dish, adding or editing the current person's restaurant rating, and opening a dish's shared reviews. This keeps creation predictable and keeps every review attached to the place or dish it describes.

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
- **Don't** hide editing, My list, reviews, or playlist management behind long press.
- **Don't** animate frequent navigation or keyboard-driven actions.
- **Don't** permanently remove shared content or associated media from the interface.
