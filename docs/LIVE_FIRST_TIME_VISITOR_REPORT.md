# CineTrekker Live First-Time Visitor Audit

**Audit date:** 14 August 2026
**Audience:** A new visitor who has never used CineTrekker
**Scope:** The public production experience at [cinetrekker.vercel.app][1], tested in a clean logged-out browser state. No account was created; no feedback, watchlist, rating, preference, authentication, or cron action was submitted.

> **Verdict: do not optimise growth before restoring the core discovery loop.** The site has a polished shell, responsive structure, and clear guest onboarding, but a first-time visitor cannot currently browse popular titles or search for a familiar film. The result is a graceful-looking but low-value experience at the moment the user should feel immediate excitement.

## Executive assessment

| Dimension | Live result | Effect on a new visitor | Priority |
| --- | --- | --- | --- |
| Core discovery | Fresh Discovery, title search, and trending data failed because the public TMDB proxy returned a 503 security-controls error. | The user cannot get to a first title, so they never reach the product’s “magic moment.” | **P0** |
| First impression | The welcome modal explains guest mode well, but the cookie banner appears at the same time. | Two overlays and five decisions arrive before the visitor sees useful content. | **P1** |
| Search and browse | Search correctly routes and provides filters; the live result is “Search unavailable.” Trending eventually reads “No results found.” | The UI falsely implies an empty catalogue instead of explaining a temporary service issue. | **P0** |
| Guest retention | The Watchlist zero-state is visually strong, but it leads back to broken discovery and does not establish a save-before-sign-up loop. | No personal investment is created before conversion is requested. | **P1** |
| Signup | The form is clear, but value messaging is generic and Google continuation is still displayed despite prior evidence that Google Auth is not configured. | Lower trust and likely conversion failure. | **P1** |
| Mobile and accessibility | At 390×844, five key public routes had no horizontal overflow, one main landmark, and no unnamed links. | A solid responsive and structural baseline. | Keep regression coverage |
| Performance | Lighthouse recorded 72 Performance, 100 Accessibility, 96 Best Practices, and 100 SEO. LCP was 4.0 s and TBT 460 ms. | The page is usable but not fast enough to feel instantly rewarding on a first visit. | **P2** |

## What a first-time visitor actually experiences

The clean-state landing page presents a welcome modal with **Continue as guest**, **Sign In**, and **Create Free Account**. The copy correctly describes that guests can explore without an account and that local activity is device-only. However, a cookie-consent banner appears concurrently. The welcome content is reasonable, but the simultaneous overlays make the first interaction feel administrative rather than cinematic.

After choosing guest mode, Fresh Discovery displays a bounded error state. The Fast Search call to action routes correctly to the search page, but searching for “Dune” produces “Search unavailable” and “The movie data request was rejected.” The Trending route also routes correctly, shows loading skeletons, and then reports “No results found” for both movies and TV. These are the exact experiences most likely to make a new visitor leave before saving a title.

The Watchlist’s empty state is clean and well explained. It says how the bookmark action builds a queue and provides a Discover Trending button. Yet it does not offer an alternative when discovery is unavailable, and it does not turn the empty state into a compelling reason to create a personal account. The signup form is simple and accessible at a visual level, but its promise is functional rather than aspirational: it tells the visitor that lists sync, rather than showing the personal value of always knowing what to watch next.

## Verified live defect: distributed rate limiting blocks the product

The live bundle updated after the valid Gmail-authored deployment trigger, so this finding reflects the current deployment rather than the previously stale bundle. A read-only request to the live TMDB proxy with the expected first-party Origin returned:

> `503 {"error":"Security controls are temporarily unavailable. Please try again later."}`

The same endpoint intentionally rejects a request without the expected Origin with `403 Forbidden origin`, which verifies that the proxy’s origin protection is working. The current failure is therefore not an origin defect; it is a fail-closed runtime configuration failure in the distributed security/rate-limit path.

| Required action | Exact outcome | Acceptance check |
| --- | --- | --- |
| Add valid `UPSTASH_REDIS_REST_URL` in the Vercel **Production** environment. | The API can contact the shared rate-limit store. | A first-party request to `/api/tmdb-proxy` returns 200 or an upstream TMDB response. |
| Add valid `UPSTASH_REDIS_REST_TOKEN` in the Vercel **Production** environment. | The API can authenticate to the shared rate-limit store. | The home, search, trending, and title-detail screens return real data in a clean browser context. |
| Redeploy after setting both values. | Functions receive the new environment configuration. | A new live asset fingerprint appears, then public smoke tests pass. |
| Add a Vercel alert for consecutive proxy 5xx responses. | Product availability is observed rather than discovered through user churn. | A controlled staging failure produces an alert without exposing user data. |

This is a remote configuration change. It should be performed only with the project owner’s confirmation and the real Upstash credentials; values must not be placed in source control.

## Prioritized retention and conversion roadmap

### P0 — Restore the first “magic moment”

| Initiative | Why it matters | Product behaviour to implement | Success signal |
| --- | --- | --- | --- |
| Restore the Upstash-backed proxy | No discovery, search, or trending loop can work without it. | Configure the two production Upstash variables and deploy. | At least 95% of public TMDB proxy requests succeed; no Fresh Discovery or search outage in smoke tests. |
| Replace misleading empty states | “No results found” sounds like there is nothing to watch. | When the proxy returns a service failure, show “We are reconnecting to movie data” with a Retry control and a curated local fallback. Reserve “No results” for genuine empty searches. | Fewer dead-end sessions and fewer repeated Retry actions. |
| Ship a resilient inspiration fallback | A movie tracker must still suggest something when the upstream feed is transiently unavailable. | Include a small, versioned editorial “Tonight’s Picks” fallback catalogue with artwork, details, and a visible freshness label. Do not present stale rankings as live trending. | A visitor can always open at least one title and save a next watch. |

### P1 — Create a useful guest loop before asking for an account

| Initiative | Why it matters | Product behaviour to implement | Success signal |
| --- | --- | --- | --- |
| Let a guest create a queue immediately | Ownership is the strongest early retention mechanism. | After the first bookmark, acknowledge it with “Your queue has started” and show progress toward a three-title starter list. Keep data local until account creation. | Guest save rate and second-title save rate increase. |
| Ask for sign-up at the value moment | Current calls to action ask too early and too generically. | Prompt after a guest has saved three titles, rated one title, or tries to sync to another device. State the exact benefit: backup, cross-device sync, release alerts, and tailored picks. | Guest-to-account conversion rises without raising bounce rate. |
| Turn the empty Watchlist into an achievable quest | An empty screen should direct a first action, not just describe it. | Offer three one-tap starting paths: “Find a 90-minute film,” “See what friends are watching” only if social data exists, and “Pick from tonight’s fallback list.” | A larger share of Watchlist visitors reaches a detail page. |
| Repair or hide unavailable social login | A broken OAuth button lowers confidence. | Enable Google Auth with the correct production callback settings, or temporarily hide the button and make email sign-up the sole supported path. | Zero provider-start failures and a clear authentication path. |

### P2 — Make the product feel cinematic, fast, and personally rewarding

| Initiative | Why it matters | Product behaviour to implement | Success signal |
| --- | --- | --- | --- |
| Simplify the first overlay | Two overlays compete before the product can delight. | Sequence consent and onboarding: render a minimal consent treatment first where required, then show a single onboarding decision after the visitor sees a working discovery card. | Lower immediate dismiss/bounce rate; more guests reach a title detail page. |
| Reduce the first-load cost | A 4.0 s LCP and 460 ms TBT delay the emotional payoff. | Further split non-critical UI and charting code, defer low-priority scripts, serve responsive next-generation poster images, and preserve only essential above-the-fold imagery. | Mobile LCP below 2.5 s and TBT below 200 ms in a production Lighthouse repeat. |
| Make the next watch feel personal | Generic discovery is easy to replace with a search engine. | After a guest saves or rates titles, offer clear explainable clusters such as “Smart sci-fi under two hours” or “Complete this weekend.” Explain why a pick appears. | Detail-page opens per session and return visits increase. |
| Build a release-return loop | Useful anticipation drives voluntary re-engagement. | Let users opt in to “new episode,” “streaming availability,” and “weekend plan” reminders after they have shown interest. Give granular controls and quiet defaults. | Opt-in rate, reminder-open rate, and weekly retained users improve without elevated unsubscribe/report rates. |

### P3 — Add durable, ethical engagement features

| Initiative | User value | Guardrail |
| --- | --- | --- |
| Taste profile and milestones | A user can see their evolving genres, directors, eras, and viewing habits. | Make all milestones informational and dismissible; never use streak-loss pressure. |
| Shareable lists | Users can make “Rainy Sunday,” “Best of 1999,” or “Movie night” lists. | Default shared lists to private and offer clear sharing controls. |
| Lightweight social recommendations | Users can ask trusted contacts for one recommendation or compare a list. | Make social features opt-in and avoid public follower counts as a pressure mechanism. |
| Weekly editorial ritual | A concise “Three things worth watching this week” creates a predictable reason to return. | Show why each title is selected and allow the user to mute the ritual. |

> **Engagement principle:** CineTrekker should become habit-forming because it reliably removes the “what should I watch?” decision, remembers the user’s taste, and respects their choices—not through compulsive timers, guilt, opaque ranking, or excessive prompts.

## Quality evidence and remaining checks

| Area | Evidence | Status |
| --- | --- | --- |
| Public routing | Home, Search, Trending, Watchlist, and Signup all rendered their route structures in a fresh guest browser. | Pass |
| Responsive structure | Mobile 390×844 audit found no horizontal overflow and one main landmark on each tested route. | Pass |
| Accessible naming | No unnamed links were found in the tested mobile routes. One checkbox appeared unnamed to a simplified heuristic but is paired with a visible label; validate with an accessibility-tree test. | Needs confirmation |
| Public resilience | Error boundaries avoid white-screen failures. | Partial pass; recovery copy is misleading on Trending. |
| Data availability | Home discovery, search, and trending cannot return live titles. | **Fail / P0** |
| Performance | Lighthouse: 72 Performance; FCP 2.6 s, LCP 4.0 s, TBT 460 ms, CLS 0. | Needs optimisation |

## Recommended release sequence

First, configure production Upstash and redeploy. Second, run a clean-browser smoke test of home discovery, title search, trending, title detail, guest save, signup, and Google sign-in. Third, replace failure states and ship a curated fallback list. Only after those items work should the product start measuring conversion and retention hypotheses such as guest-first queue creation, a three-save sign-up prompt, and release-alert opt-in.

## References

[1]: https://cinetrekker.vercel.app/ "CineTrekker live public website"
