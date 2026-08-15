# Authenticated Social Acceptance Test — 15 August 2026

## Scope and safeguards

A controlled production acceptance check was run with the designated test account after explicit approval for reversible social writes. The test used the Reacher TV title (`media_id=108978`) and a public profile listed in the People directory. The only user-facing content created was a clearly labelled temporary parent comment. It was removed before the test was closed.

## Verified results

| Interaction | Result | Evidence |
|---|---|---|
| Follow a public profile | **Passed** | The People-directory button changed from `Follow` to `Following`. |
| Unfollow a public profile | **Passed** | The control returned to `Follow`; the follower count settled back to its original value after the directory refresh. |
| Render the Details-page comments UI | **Passed** | Scrolling to the deferred Reviews section rendered the comments form, spoiler control, sort control, and comment thread. |
| Create a comment | **Passed** | The temporary Reacher comment appeared immediately with its author link, delete control, zero-like state, and reply action. |
| Open the reply composer | **Passed** | The reply composer opened for the temporary comment. |
| Submit a reply | **Not verified** | The browser automation session reset twice when text entry was attempted. No reply was accepted or created. This is recorded as an automation-environment block, not an application failure. |
| Like and unlike a comment | **Not verified** | Browser-session instability prevented access to the persisted comment after the reply attempts. No like was created. |
| Recipient social notifications | **Not applicable to this release** | Client-side cross-user notification inserts are intentionally disabled. Recipient social notifications require an approved trusted server-side or database-side creator. |

## Cleanup verification

The temporary follow relationship was removed through the People directory. The remaining temporary Reacher comment and any related likes were removed through the authenticated production SQL editor using an exact match on the designated test account, media ID, media type, and temporary content.

| Verified cleanup query | Remaining records |
|---|---:|
| Temporary Reacher comments | **0** |
| Likes attached to matching temporary comments | **0** |

No reply or like record existed to remove. The test account was restored to its pre-test social state.

## Remaining acceptance work

The reply-submission and like/unlike paths still require a stable authenticated browser session or an equivalent approved end-to-end harness. Before recipient social notifications are promoted, implement and test a trusted notification creator with moderation, rate-limit, and abuse-review controls.
