---
name: FoodLog - Table Notes
description: A task-first shared dining journal shaped by the rhythm of a restaurant order rail.
colors:
  pass-forest: "#174a3b"
  paprika-mark: "#f05a28"
  cool-chalk: "#f6f7f3"
  prep-surface: "#e7ece7"
  ledger-ink: "#161b18"
  quiet-ink: "#52615a"
  hairline: "#d7dfd9"
  night-pass: "#111512"
  dark-surface: "#171d19"
  dark-text: "#e8eee9"
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

## Overview

**Creative North Star: "The Order Rail"**

Table Notes borrows the useful rhythm of a restaurant pass: active choices stay visible, information is clipped into legible tickets, and the plated result gets the largest visual space. It combines that operational clarity with a photo contact sheet and personal annotations, creating a shared journal that feels specific to meals with friends rather than to business analytics.

The product is used repeatedly, often on a phone while a group is deciding where to eat. Expression therefore lives in the rail, ticket proportions, photo crops, typography, and concise interaction feedback. Navigation and editing remain familiar, fast, and quiet.

**Key Characteristics:**

- A compact rail keeps Places, Map, Pick, search, and Add immediately available.
- Restaurant rows resemble confident order tickets without becoming novelty paper props.
- Food photography and friend opinions carry the detail view.
- Forest is the structural brand color; paprika is reserved for appetite, selection, and important state.
- Light and dark themes preserve the same hierarchy and component character.

## Colors

The palette is a cool, green-cast chalk field with dark botanical structure and one warm appetite signal.

### Primary

- **Pass Forest** (`#174A3B`): primary controls, active navigation, strong headings, and selected states.

### Secondary

- **Paprika Mark** (`#F05A28`): rare emphasis for ratings, final picker results, and small moments that represent appetite or decision.

### Neutral

- **Cool Chalk** (`#F6F7F3`): light theme canvas.
- **Prep Surface** (`#E7ECE7`): grouped controls and secondary surfaces.
- **Ledger Ink** (`#161B18`): primary light-theme text.
- **Night Pass** (`#111512`): dark theme canvas.
- **Soft Linen** (`#E8EEE9`): primary dark-theme text.

**The Appetite Mark Rule.** Paprika never becomes general decoration. It identifies appetite, a selected result, or a consequential state.

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

The system is flat by default. Tonal surfaces and one-pixel separators establish structure. Shadows appear only for overlays, the mobile action dock, and a selected ticket lifting above the queue; they use a green-tinted offset and soft blur rather than a black halo.

**The Pass Surface Rule.** If a border already defines a surface, do not add a resting shadow. Depth must communicate state or layering.

## Shapes

Content surfaces use gently clipped 14px corners. Inputs and standard buttons use 10px corners. Small state chips may be pill-shaped because they are compact controls, not containers. Photos use the same 14px content radius unless they intentionally bleed to a detail edge.

## Components

### Buttons

- **Shape:** tactile 10px corners with a minimum 44px target.
- **Primary:** Pass Forest background with Cool Chalk text.
- **Hover / Focus:** small tonal shift, visible two-layer focus ring, and exact transform/color transitions.
- **Active:** subtle `scale(0.98)` feedback. Keyboard activation is not animated.

### Chips

- **Style:** quiet Prep Surface background with Ledger Ink text.
- **State:** selected chips invert to Pass Forest; Paprika is not used for routine filter selection.

### Cards / Containers

- **Corner Style:** 14px for meaningful content surfaces.
- **Background:** tonal contrast from the current theme.
- **Shadow Strategy:** flat at rest; selected list ticket may lift slightly.
- **Border:** one low-contrast separator, never a border-plus-shadow stack.

### Inputs / Fields

- **Style:** visible label above a solid tonal field, 10px corners, and no placeholder-as-label.
- **Focus:** Pass Forest ring in light mode and a brighter botanical ring in dark mode.
- **Error / Disabled:** contextual text below the field; disabled state preserves readable contrast.

### Navigation

The top rail remains one line on desktop. Active destinations use a solid or underlined structural state, not decorative dots. Mobile destinations have text labels and 44px targets.

### Order Ticket

The restaurant list item is the signature component. It combines a decisive title, one image crop or reserved media slot, cuisine/location metadata, the group score, and visible Want to go and playlist actions. The selected ticket connects visually to the persistent detail stage without becoming a nested card stack.

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
- **Don't** hide editing, Want to go, reviews, or playlist management behind long press.
- **Don't** animate frequent navigation or keyboard-driven actions.
- **Don't** permanently remove shared content or associated media from the interface.
