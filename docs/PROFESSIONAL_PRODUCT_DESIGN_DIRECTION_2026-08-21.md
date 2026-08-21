# CineTrekker Professional Product Design Direction

## Design position

CineTrekker will be a **quietly cinematic utility product** rather than a decorative entertainment dashboard. Cinema is conveyed through high-quality imagery, editorial composition, and an assured crimson accent—not through permanent glow, blur, gradients, or oversized display type.

The core design rule is:

> **Media earns visual attention. Product interface earns trust by staying calm.**

## Visual hierarchy

Every page will follow a three-level attention model. The page purpose or current title is primary. The next meaningful action or current state is secondary. Controls, supporting metadata, and optional paths are tertiary. A section may use strong imagery, a prominent surface, or accent color only when it is the page’s primary task.

| Level | Intended treatment | Typical usage |
| --- | --- | --- |
| Primary | Page title, meaningful media image, or one focused action. | Hero title, current watch, search field, selected navigation state. |
| Secondary | Quiet elevated surface or grouped content. | A short command panel, one media rail, a filter row, a data summary. |
| Tertiary | Muted text, dividers, compact metadata, text links. | Years, genres, helper copy, secondary navigation, utility actions. |

## Color and surfaces

The existing three-mode theme system remains intact. The red CineTrekker accent remains the sole expressive brand color. It is reserved for primary actions, selected states, focus signals, and occasional cinematic emphasis. Green, amber, and destructive colors remain semantic feedback colors, never decorative alternatives.

The system will standardize on three product surfaces: **canvas** for the page background, **surface** for quiet grouped information, and **raised surface** for dialogs, selected controls, or a truly primary context. Glass blur will be removed from routine cards and utility rows. Gradients will be limited to media readability overlays and rare feature moments with a concrete content purpose.

## Type system

`Space Grotesk` remains the display and heading face; `DM Sans` remains the interface and reading face. The redesign will use a small, repeatable hierarchy: display only for exceptional titles, a page heading, section heading, card title, body, metadata, and label. Uppercase tracking is restricted to short categorical labels, not repeated across ordinary interface copy.

## Spacing, radius, and elevation

The system uses the existing 8-pixel rhythm. Page gutters, section spacing, control heights, and card padding should map to 8, 12, 16, 24, 32, 48, and 64 pixels. The radius scale is reduced to **8 px** for controls, **12 px** for cards and small surfaces, and **16 px** for major panels; pills remain only for tags, status, and compact selections. Elevation is limited to base, raised, and overlay—soft shadows, no arbitrary glows.

## Component language

| Primitive | Professional contract |
| --- | --- |
| Button | One primary fill, quiet outline, text/ghost, destructive, and icon treatment; consistent height and active feedback. |
| Media card | Poster first; concise title and metadata; actions revealed by intent, never competing with the image. |
| Product panel | Used only to group a current task, data set, or form; no nested decorative panels. |
| Toolbar | Compact, low-elevation control row; filters appear only when actionable. |
| Empty state | Plain-language context, one next action, and an optional secondary route. |
| Navigation | Direct intent first; discovery, personal library, and secondary destinations clearly separated. |
| Footer | Quiet information architecture: product access, support, legal, and attribution with no competing calls to action. |

## Motion and interaction

Motion is feedback, not decoration. Interaction transitions use opacity and transform within 120–220 ms. Hover lifts are limited to clearly clickable media or link cards. No looping glow, typewriter, or pulse animation appears on a normal daily-use surface. The existing reduced-motion preference remains authoritative.

## Responsive standard

Mobile establishes the baseline. Small screens use one clear content column, horizontal scrolling only for genuinely sequential media rails, 44-pixel touch targets, and reduced nested surfaces. Desktop adds width and density without creating a separate visual language.

## Success criteria

The finished interface should feel structured, editorial, readable, and intentional. A visitor should recognize that CineTrekker is a movie and TV tracker within seconds, know the next action, and perceive a consistent product system across discovery, tracking, account, and utility pages.
