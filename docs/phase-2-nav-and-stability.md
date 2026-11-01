# Phase 2 navigation and stabilization

This note records the Phase 2 cleanup on branch `design/phase-2-nav-and-home`.

## Changes

- The Supabase development TMDB proxy now bounds upstream fetches to 12 seconds and reports upstream/transport failures as safe 502/504 responses rather than exposing them as generic 500s. Search continues to show its localized friendly error state without a development-only raw error panel. A five-request local repeat returned 200 each time, so the intermittent failure was not reproduced in this run; the fix addresses the failure handling visible in the proxy implementation.
- Trailer cards replace failed YouTube thumbnails with an in-layout media placeholder.
- `src/navigation/routes.ts` is the typed source for grouped navigation and mobile/desktop destinations. The desktop header retains three direct library/discovery links; secondary destinations stay grouped in the menu. The bottom bar has four destinations, with Profile or Sign In as the fifth action.
- The desktop menu places focus into the opened panel, traps Tab navigation, closes on Escape, and returns focus to its trigger. The mobile sheet continues to use the Radix dialog focus and scroll-lock behavior.
- Signed-in Home now puts Up Next and Continue Watching before the weekly spotlight; the signed-out hero and guest onboarding remain intact. Fetching and recommendation logic were not changed.
- Removed the single redundant `!important` from the top-bar search placeholder rule; the shared input utility already supplies the same semantic token color.
- Existing per-page SEO handling, icons/Open Graph metadata, wildcard not-found route, and protected Settings return-path handling were verified in source and left unchanged.

## Verification

- Baseline before edits: build, lint, type-check, and 122 unit tests passed.
- After implementation: build, lint, type-check, 122 unit tests, security (18), privacy (5), i18n verification, and the targeted navigation regression tests passed.
- Playwright smoke suite: 11/11 passed using installed Brave because Edge and the Playwright-managed Chromium binary were unavailable in this environment.
- Browser visual check: the local homepage was opened at the required URL and inspected at the default desktop size and 375px mobile width in dark mode. The screenshots were inspected in the browser session, but this run did not produce the requested persistent `/design-review/phase2/` screenshot matrix. Tablet, light, and OLED screenshots remain unverified.
- Remaining limitation: the local proxy's intermittent 500 was not reproduced; there is no automated Deno Edge Function timeout test in the current Node test suite. The production Vercel API proxy was not changed by this task.
