# Search Workflow Refinement

**Scope:** Desktop and responsive Search page hierarchy.

## Verified issue

The live Search route presents the global query field, a tall Discovery Lab panel with a second query field, and a separate tall filters panel before results. All controls work, but the page-level search task competes with explanatory copy and the filter prompt occupies more visual weight than its idle state requires.

## Refinement

The page retains its dedicated query input, international-title capability, all URL-backed filters, mobile drawer, active filter chips, result grid, and load-more flow. Its header becomes a compact focused task surface; the idle filter entry becomes the shared lightweight toolbar pattern. Explanatory copy remains available in a shorter supporting line, and the results label moves closer to the active controls. A title-only URL query now keeps advanced filters collapsed by default; the panel automatically opens only when a real advanced filter is already active.

## Acceptance criteria

| Criterion | Expected outcome |
| --- | --- |
| Search | The page input, clear action, URL synchronization, search history, and query behavior remain unchanged. |
| Filters | All seven filter controls, active-filter count, clear action, desktop expand/collapse, and mobile drawer remain unchanged; a title-only query leaves the advanced panel collapsed unless a real filter is active. |
| Accessibility | Forms, live results status, clear button, filter button, and existing labels remain accessible. |
| Visual hierarchy | Page task input is primary; filter row is compact and results follow more closely. |
| Responsive behavior | Mobile keeps the filter drawer and larger mobile task targets. |
| Data safety | No watchlist, watched, rating, follow, notification, or preference behavior changes. |

## CI visual-baseline reconciliation

The CI diagnostic images confirm that the remaining visual difference is intentional: the prior baseline showed the advanced desktop panel open for `/search?q=yiralti`, while the refined workflow shows the compact toolbar with a **Show Filters** action and brings the loading/result region directly beneath it. The new baseline must therefore be generated from the CI-rendered actual images for both supported viewports.

The corresponding mobile CI comparison preserves the focused Discovery Lab surface and its single prominent **Filters** action. No preference, search history, watchlist, watched-status, rating, social, or notification control was activated while validating the screenshots.
