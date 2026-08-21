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
