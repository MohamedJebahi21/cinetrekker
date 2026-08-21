# CineTrekker Desktop Insights Remediation

**Source evidence:** passive signed-in desktop Recommendations inspection on 2026-08-21.
**Safety boundary:** no recommendation was saved, dismissed, hidden, shared, rated, or otherwise changed.

| ID | Priority | Verified finding | Remediation | Status |
| --- | --- | --- | --- | --- |
| INSIGHTS-DESK-01 | P1 | The Recommendations empty-state primary action renders a `Link` around a `Button`, exposing two nested interactive elements for one visual Discover Trending control. | Use the existing button primitive’s `asChild` contract with the internal `/search` link, yielding a single accessible link while preserving the action’s visual styling and navigation target. | Complete — unit verified |

## Validation before release

The focused Recommendations empty-state accessibility regression passed in `npm run test:unit`. Full quality checks and live production verification are required before release.

## Explicit non-changes

Recommendation generation, filters, hidden-title preferences, sharing, watched history, watchlist data, and all personal settings remain unchanged. The remediation changes only the empty-state action markup.
