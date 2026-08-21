# Continue Watching Card Redesign

**Scope:** Populated cards in the authenticated homepage Continue Watching rail.

## Verified visual issues

The supplied desktop screenshot and component audit show that each card repeats the same information across four layers: an **In progress** poster badge, a **Next episode** title eyebrow, a second **Next episode** panel label, poster metadata, an episode-count line, a percentage chip, and a separate **Series progress** panel. At the shared 240px rail width, this produces dense nested borders and causes the secondary episode action to crowd the primary Details action.

## Clean resume-card system

The redesigned card keeps only the information needed to decide and act:

| Layer | Information retained | Design treatment |
| --- | --- | --- |
| Poster | Show artwork and one concise completion percentage | Clean 3:2 image with a single percentage chip. |
| Identity | Series title and released episode progress | One compact title block. |
| Resume cue | **Next episode**, episode code, title, and date when available | A single unboxed metadata row, rather than a separate nested panel. |
| Progress | Current completion percentage and bar | One lightweight progress row. |
| Actions | Details and Mark Next Episode | A clear primary Details button plus an icon-only, labelled secondary completion control. |

## Explicit removals

The redesign removes the duplicated **In progress** badge, repeated episode-count badge, redundant TV icon, duplicate **Next episode** label, and nested next-episode / series-progress cards. This reduces visual noise without hiding next-episode information or progress.

## Safety and acceptance criteria

| Criterion | Expected outcome |
| --- | --- |
| Viewing data | No changes to progress calculations, enrichment, `markEpisodeWatched`, or episode payloads. |
| Resume clarity | Next episode code, name, date, and progress remain visible when available. |
| Actions | Details route remains a visible primary action; Mark Next Episode remains an explicit keyboard-accessible control with a descriptive label. |
| Responsive design | The same compact content hierarchy works from the two-column mobile card to the 240px desktop rail. |
| Regression coverage | Tests assert duplicated status treatments are absent and both user actions remain. |
| Validation | Unit suite, full release gate, production build, and live verification pass. |
