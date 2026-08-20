# Home Discovery Request Deferral Verification

**Date:** 20 August 2026  
**Production URL:** `https://cinetrekker.vercel.app/`

## Change

The Home page previously started the hero weekly-trending request alongside requests for below-the-fold discovery feeds. That created unnecessary contention while the eager hero backdrop was loading. The Home page now keeps the hero weekly-trending query as the single shared source for the Weekly Spotlight and delays Fresh Discovery network activity until idle time. It then fetches only the currently selected discovery tab.

The default tab remains **Trending Today**. The **Trending This Week** tab reuses the hero query key, while **New Releases** is requested only after the visitor selects that tab.

## Live production verification

A fresh, unauthenticated production browser context was observed for 2.5 seconds after the Home page reached network idle.

| Request | Observed count | Expected count | Result |
|---|---:|---:|---|
| Weekly-trending hero feed | 1 | 1 or more | **Pass** |
| Active Trending Today feed | 1 | 1 or more | **Pass** |
| Inactive New Releases feed | 0 | 0 | **Pass** |

The verification confirmed that the inactive new-release request no longer competes with the LCP hero image. The Home page returned HTTP 200 and retained the fixed hero geometry that protects against cumulative layout shift.

## Guardrail

`tests/home-deferred-discovery.test.mjs` is included in the unit-check command to prevent future changes from restoring the initial duplicate weekly request or eagerly fetching inactive discovery tabs. `scripts/verify-live-home-discovery-deferral.mjs` provides a deliberate production re-check; it is not run in continuous integration because it contacts the public production site.

## Follow-up

This removes known avoidable request contention. The next meaningful LCP decision should come from real-user field data, especially mobile 75th-percentile LCP after traffic has accumulated.
