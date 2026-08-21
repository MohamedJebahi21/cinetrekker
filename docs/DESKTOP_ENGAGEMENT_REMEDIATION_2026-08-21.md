# CineTrekker Desktop Engagement Remediation

**Source evidence:** passive signed-in desktop Calendar inspection on 2026-08-21.
**Safety boundary:** no title was followed, unfollowed, added to a watchlist, removed, or opened for a modifying action.

| ID | Priority | Verified finding | Remediation | Status |
| --- | --- | --- | --- | --- |
| ENG-DESK-01 | P1 | The weekly Calendar rendered exact duplicate cards for the same scheduled title and episode, such as PAW Patrol S14 E7, Teen Titans Go! S9 E46, and 名探偵コナン S1 E1210. | Deduplicate aggregated calendar items by media type, title ID, calendar date, season, and episode before filters, counts, spotlight selection, and view grouping. When duplicate records differ only in saved/followed status, preserve the saved/followed record. | Complete — unit verified |
| ENG-DESK-02 | Audit | The release calendar’s date navigation, filters, view modes, counts, spotlight, and direct title controls were visually inspected after loading settled. | No change required beyond duplicate suppression. | Complete — no change required |

## Validation before release

The focused Calendar deduplication regression passed in `npm run test:unit`. Full quality checks and live production verification are required before release.

## Explicit non-changes

Calendar data sources, date range logic, follow/watchlist behavior, alert preferences, and title details remain unchanged. The remediation only removes exact duplicate presentation rows.
