# Continue Watching Remediation Record

> **Completed:** 15 August 2026

## User-Reported Behavior

A series could appear to regress from one percentage to a lower percentage after episode actions. The card also used an overly prominent resume action and did not provide the requested premium presentation.

## Implemented Fix

The Continue Watching view model now displays a percentage only when a release-aware published-episode total is known. It never manufactures a provisional percentage from watched-count alone, preventing an authoritative metadata refresh from looking like lost progress.

The production database now has three cursor-safeguard functions and two triggers. The triggers derive `followed_shows.last_watched_season` and `last_watched_episode` from the furthest persisted `watched_episodes` row on episode insertion, deletion, and followed-show cursor updates. This prevents a later action on an older episode from moving the stored cursor backwards and recalculates it after an intentional unmark.

The card action is now **Details**, and the section has a responsive cinematic card treatment with a clear next-episode panel, verified-progress state, released-episode context, polished progress rail, upgraded empty state, and touch-friendly carousel behavior.

## Validation

| Check | Result |
|---|---|
| Lint, TypeScript, localization verification, security tests, unit tests, production build, whitespace check | Passed before release commit `ef258aa` |
| Progress-display regressions | Covered by unit tests for unknown and verified released totals |
| Production database migration | Executed successfully; Supabase returned `0 rows` and a success result |
| Read-only production verification | `function_count = 3`; `trigger_count = 2` |

## Release Commits

| Commit | Purpose |
|---|---|
| `ef258aa` | Release-aware progress display, premium Continue Watching redesign, localized UI copy, and regression coverage |
| `9ec57b6` | Source-controlled production trigger safeguard for authoritative TV progress cursors |

## Production Smoke Check

After deployment, the live homepage loaded real discovery content successfully and the browser console contained no JavaScript errors for the signed-out visitor path. The Continue Watching cards require an authenticated viewer with tracked TV episodes, so their final visual state and episode mutation flow remain to be observed with an approved designated test account.

## Initial Authenticated Browser Constraint

The first attempt at the authenticated production acceptance run reset the browser session to `about:blank` immediately after live-site navigation. No authenticated user data was viewed or changed during that failed attempt. A later controlled run completed successfully; its setup, results, and test-data cleanup are recorded below.

## Controlled Authenticated Test Setup

The designated production test account was confirmed as signed in. Its Continue Watching state was empty, with no tracked TV episodes. The Reacher Details page (`tv/108978`) was opened as the controlled test target; its initial progress was `0` episodes and `0%`. No episode mutation had been made at this checkpoint.

## Controlled Authenticated Progress Results

The test marked Reacher S4E3 first, producing one watched episode and `4%` series progress. It then marked the older S4E1. Progress increased to two watched episodes and `7%`; the selected next episode was S4E2. The homepage Continue Watching card showed `2 episodes tracked`, `2 / 27 released episodes`, `7%` series progress, and the primary **Details** action. This confirms the older episode did not overwrite or regress the established series position. The card-level **Mark Next Episode** action was invoked next; its settled result is recorded separately.


### Card-Level Completion

The card-level **Mark Next Episode** action then marked S4E2, advancing the total to three watched episodes and `11%` progress. The selected next episode updated to S4E4. The card’s **Details** action opened the intended Reacher series page. No browser console errors were observed during the authenticated acceptance flow.

## Test-Data Cleanup

On 15 August 2026, after explicit user authorization, the three temporary Reacher S4 episode records and the temporary Reacher follow record created for the controlled acceptance test were removed from the designated production test account. The cleanup query was constrained to the single test account and `show_id = 108978`.

| Verification query | Remaining records |
|---|---:|
| `watched_episodes` for the designated test account and Reacher | 0 |
| `followed_shows` for the designated test account and Reacher | 0 |

The database therefore has no residual Continue Watching test data from this acceptance run.
