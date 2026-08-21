# CineTrekker Desktop Retention Remediation

**Source evidence:** passive signed-in desktop Watchlist and Watched route inspection on 2026-08-21.
**Safety boundary:** no titles were added, removed, marked watched, rated, reordered, or otherwise changed.

| ID | Priority | Verified finding | Remediation | Status |
| --- | --- | --- | --- | --- |
| RET-DESK-01 | P1 | The Watched empty state explains that history is empty but has no direct next action, leaving returning users to infer that they should navigate elsewhere before they can begin logging viewing activity. | Add an explicit **Discover titles** link to `/discover` beneath the empty-state explanation. It must be keyboard accessible, meet the existing 44px target, and only navigate—never change user data. | Complete — unit verified |
| RET-DESK-02 | Audit | The Watchlist empty state already offers an actionable discovery exit path and resolves its skeleton normally. | No code change required. | Complete — no change required |

## Validation before release

The focused Watched empty-state retention regression passed in `npm run test:unit`. Full quality checks and live production verification are required before release.

## Explicit non-changes

Existing history filters, data handling, SEO, authenticated state, browser-alert consent, and content safety behavior are preserved. The new control is a navigation-only recovery path.
