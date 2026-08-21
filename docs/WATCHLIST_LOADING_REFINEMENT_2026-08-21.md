# Watchlist Loading Refinement

**Scope:** The personal Watchlist route’s initial loading experience before the client’s library state resolves.

## Verified issue

A new or empty personal library briefly rendered a full poster-grid skeleton before resolving to the concise empty state. The grid accurately represents a populated watchlist, but it adds unnecessary visual weight when the likely outcome is zero saved titles.

## Refinement

The Watchlist now identifies the narrow state in which the user-list context is still loading, the route is not a shared list, and no saved references are yet known. In that state it renders a compact, labelled panel skeleton. It retains the established poster-grid loading shell for any populated or shared list, so no enrichment, ordering, filtering, sharing, import/export, bulk selection, or list mutation behavior changes.

| Criterion | Expected outcome |
| --- | --- |
| Empty personal library | A compact `role="status"` loading panel appears before the existing empty state. |
| Populated or shared library | The existing poster-grid loading shell remains available. |
| Accessibility | The compact shell publishes `aria-busy` and a descriptive loading label. |
| Visual hierarchy | The header and empty-state pathway stay primary; a likely zero-state transition does not imitate a large content grid. |
| Data safety | No watchlist, watched-status, rating, sharing, import/export, notification, language, theme, or preference action is performed or changed. |
