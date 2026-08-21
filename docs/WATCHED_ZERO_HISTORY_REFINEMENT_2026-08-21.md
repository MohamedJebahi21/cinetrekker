# Watched Zero-History Refinement

**Scope:** The Watched route’s first-use experience when a visitor has not yet recorded any viewing history.

## Verified issue

The zero-history state displayed language, type, country, and year-range controls above its empty-state guidance. Those controls only operate on historical entries, so they added visual weight and delayed the meaningful next action when there was no history to filter.

## Refinement

The Watched page now receives the underlying history presence and list-context loading state from `useWatchedFilters`. It shows the full filter surface and familiar poster-grid loading state when history exists. When history is still resolving and no items are known, it uses a compact labelled loading panel; after an empty history resolves, it leads directly from the header to the existing **Discover titles** empty state.

| Criterion | Expected outcome |
| --- | --- |
| Zero-history state | The filter panel is deferred and the existing empty-state guidance follows the header. |
| Existing history | Filter controls, active-filter reset, statistics, year grouping, and poster-grid loading remain available. |
| Accessibility | The compact loading state publishes `role="status"`, `aria-busy`, and a descriptive label. |
| Visual hierarchy | A first-use visitor sees one direct next action instead of inactive filtering controls. |
| Data safety | No watched item, watchlist entry, rating, note, social action, notification, language, theme, or preference is changed. |
