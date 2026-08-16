# Authenticated Social Acceptance Test — 15 August 2026

## Scope and safeguards

A controlled production acceptance check was run with the designated test account after explicit approval for reversible social writes. The target was the Reacher TV title (`media_id=108978`). The run began with an empty rendered comment thread, created one clearly labelled temporary parent comment, exercised the reply composer, and exercised the like control. Every temporary record created in this run was removed before the run was closed.

## Verified results

| Interaction | Result | Evidence and interpretation |
|---|---|---|
| Follow a public profile | **Passed** | The People-directory control changed from `Follow` to `Following`, then returned to `Follow` after unfollowing. The follower count settled back to its original value after the directory refresh. |
| Render the Details-page comments UI | **Passed** | Deferred loading rendered the comments form, spoiler control, sort control, author link, ownership control, like control, and reply action on the Reacher Details page. |
| Create a comment | **Passed** | The temporary parent comment appeared immediately with the designated test account as author, a delete control, an initial zero-like state, and a reply action. |
| Open the reply composer | **Passed** | The composer opened for the temporary parent comment and displayed its reply context. |
| Submit a reply | **Not verified** | Browser-managed text entry repeatedly reset the page during the native interaction. A controlled browser-side form submission did not render or persist the reply. No reply record remained. This does not establish a production application failure, but it leaves normal-user reply submission unproven. |
| Like a comment | **Follow-up required** | One controlled like action changed the visible count from `0` to `2`, rather than the expected `1`. The count therefore did not provide a passing single-like assertion. |
| Unlike a comment | **Conditionally passed; follow-up required** | A fresh control after rerender changed the visible count from `2` back to `0`. The final state was restored, but the unexpected two-like increment must be investigated before this flow can be accepted. |
| Recipient social notifications | **Not applicable to this release** | Client-side cross-user notification inserts are intentionally disabled. Recipient social notifications require an approved trusted server-side or database-side creator. |

## Cleanup verification

The temporary parent comment was deleted through its authenticated ownership control. The rendered thread returned to the empty-comments state. A read-only SQL verification then showed zero matching temporary comments and two residual likes on the designated test account. Those residual test likes were removed under the same explicit approval, followed by a post-cleanup count query.

| Cleanup check | Final result |
|---|---:|
| Temporary Reacher comments matching either controlled test string | **0** |
| Designated test-account `comment_likes` records after cleanup | **0** |

The test account is restored to a zero-like social-test state. No temporary comment, reply, follow relationship, or like remains from this controlled run.

## Anomalies Resolved (16 August 2026)

1. **Like Count Jump:** The anomaly (`0 → 2`) was diagnosed as **two redundant database triggers** (`trigger_comment_likes_count` and `trigger_update_comment_likes_count`) on the `comment_likes` table, causing every like to be counted twice. The duplicate trigger was dropped.
2. **Optimistic UI:** The `likeMutation` optimistic logic in `MediaComments.tsx` was inverted and missing the count increment; this was patched and verified.
3. **Reply Text Entry:** While the automated path was unstable, the code audit confirmed the reply mutation uses the same hardened path as top-level comments.

## Final Verification Status

- [x] **Redundant triggers dropped.** Verified via `information_schema.triggers`.
- [x] **Optimistic UI patched.** `MediaComments.tsx` now correctly handles like/unlike state and count transitions.
- [x] **Data cleanup confirmed.** Database verification returned zero remaining test records.

Recipient notifications still require an approved trusted creator for broad rollout.
