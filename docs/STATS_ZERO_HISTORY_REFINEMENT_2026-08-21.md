# Stats Zero-History Refinement

**Scope:** The Analytics & Insights route when an account has no watched titles.

## Verified issue

The zero-history Stats route rendered the full analytical workspace: three filters, four tabs, a watch-time summary, four zero-value metric cards, and a no-data message. This accurately represented the absence of data, but it was not the most useful first-use hierarchy.

## Refinement

`useEnhancedStatsData` now exposes the underlying watched-history presence alongside list-aware loading. The Stats page presents a compact insight-empty state and one **Discover titles** action only when no watched history exists. The complete existing workspace—header filters, tabs, summary cards, chart calculations, rankings, and history list—remains unchanged whenever at least one watched title exists, even if a later filter produces zero results.

| Criterion | Expected outcome |
| --- | --- |
| Zero-history state | One concise analytics-empty panel replaces zero-value filters, tabs, and metrics. |
| Active history | Existing analytics filters, tabs, charts, summary cards, rankings, and history list remain available. |
| Loading | The hook waits for user-list state before choosing an empty-state hierarchy. |
| Accessibility | The call to action is a normal, labelled navigation link. |
| Data safety | No history, rating, watchlist, social, notification, language, theme, or preference data is changed. |
