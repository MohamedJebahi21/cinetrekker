# CineTrekker Production Discovery Recovery Runbook

**Purpose:** Restore the public TMDB-backed discovery, search, and trending experiences without weakening the fail-closed security model.

## Confirmed production symptom

A first-party-origin request to the live TMDB proxy currently returns HTTP `503` with:

> `Security controls are temporarily unavailable. Please try again later.`

The response is emitted by the current distributed rate-limit implementation when `UPSTASH_REDIS_REST_URL` or `UPSTASH_REDIS_REST_TOKEN` is missing, the Upstash request fails, or the runtime cannot fetch. The production path is intentionally fail-closed; **do not change it to an unauthenticated in-memory fallback** merely to restore traffic.

## Required remote action

| Step | Action | Scope | Secret handling | Completion evidence |
| --- | --- | --- | --- | --- |
| 1 | Open the intended CineTrekker Vercel project and confirm that its Production Branch is `main`. | Production project only | None | The project identity and branch are visible before editing. |
| 2 | Add or update `UPSTASH_REDIS_REST_URL`. | **Production** environment | Paste only the real Upstash REST URL; do not commit it or send it in task chat. | Vercel saves the variable name at Production scope. |
| 3 | Add or update `UPSTASH_REDIS_REST_TOKEN`. | **Production** environment | Paste only the real Upstash REST token; do not commit it or send it in task chat. | Vercel saves the variable name at Production scope. |
| 4 | Trigger a fresh Production deployment from the current `main` head. | Production deployment | None | A new deployment is created after the variables are saved. |
| 5 | Perform the read-only public smoke matrix below. | Public live site only | Do not submit accounts, feedback, ratings, watchlist changes, or cron jobs. | All expected response states pass. |
| 6 | Check function logs/observability for `rate_limit_unavailable` events. | Production observability | Do not expose user identifiers in reports. | No new critical event is emitted during smoke checks. |

Vercel applies an environment-variable change only to **new deployments**, not prior ones. Production-scoped variables apply to the next production deployment from the production branch. [1]

## Post-deployment smoke matrix

| Scenario | Method | Expected result |
| --- | --- | --- |
| Public proxy security | Request `/api/tmdb-proxy` without an Origin header. | HTTP 403 `Forbidden origin`. |
| Public discovery | Open `/` in a fresh browser and wait for Fresh Discovery. | Real cards load; no 503 recovery panel. |
| Title search | Search for `Dune` as a guest. | Relevant results load; no “Search unavailable” state. |
| Trending | Open `/trending` as a guest. | Movies and TV sections show results; no false “No results found” state. |
| Detail page | Open one public movie or TV detail page. | Metadata, artwork, and related content render. |
| Rate-limit protection | Perform only the controlled test permitted by the project's operating policy. | A true excessive-request test receives 429, not 503; no normal visitor is impacted. |
| Security telemetry | Inspect deployment logs after normal smoke traffic. | No `rate_limit_unavailable` critical events. |

## Related configuration decisions

| Setting | Current status | Recommended treatment |
| --- | --- | --- |
| Google Auth | The public signup page offers Google, while an earlier read-only configuration inspection did not report Google as enabled. | Enable and verify Google OAuth callbacks, or temporarily hide the button until it works end-to-end. |
| TMDB API credential | Existing live behavior confirms proxy execution reaches security enforcement before data fetch. | Keep the TMDB key server-side only; verify after Upstash recovery using the public smoke matrix. |
| Error monitoring | Client-side monitoring is present; server-side alert delivery needs a clear operational owner. | Alert on repeated proxy 5xx and rate-limit unavailability while minimizing stored user data. |

## Authorization boundary

The Vercel connector is currently disabled in this task. Changing the two Production secrets, enabling a connector, or triggering a deployment is a **remote configuration/deployment action** and requires explicit user approval immediately before execution. This runbook intentionally contains no credential values.

## References

[1]: https://vercel.com/docs/environment-variables "Vercel environment variables documentation"
