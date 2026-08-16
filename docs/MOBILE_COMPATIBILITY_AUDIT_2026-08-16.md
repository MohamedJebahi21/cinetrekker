# CineTrekker Mobile Compatibility Audit — 2026-08-16

## Scope

The local production preview was audited at the exact `390×844` viewport used by the mobile regression suite, plus the Playwright Pixel 7 and iPhone 14 device profiles. Coverage included the guest homepage, Search, protected-route behavior for Collections and Monthly Quests, the mobile menu, bottom navigation, home carousels, and keyboard/search interactions.

## Findings

| Area | Result | Notes |
|---|---|---|
| Body-width safety | Passed | No accidental document-level horizontal overflow was detected on the tested routes. |
| Mobile menu | Passed | The menu opens, exposes the main navigation, and routes to Search correctly on both mobile Chromium and WebKit. |
| Bottom navigation | Passed | Search and sign-in destinations work at mobile sizes. |
| Home carousel | Passed | Carousel paging works on both Pixel 7 and iPhone 14 profiles. |
| Search input | Fixed | The global header SearchDropdown and the Search page’s primary form were both visible on mobile Search, creating duplicate fields and causing the regression to target a hidden/incorrect input after the correction. The global header search is now hidden only on `/search` at mobile widths; desktop behavior is unchanged. |
| Search regression | Passed | The test now targets the visible mobile input explicitly, and both mobile projects pass. |
| Protected routes | Passed | `/collections` and `/quests` correctly redirect guests to `/login` without mobile overflow. |
| New engagement cards | Structurally safe | Daily Trivia, Cine-Quests, Daily Check-In, Community Activity, and Daily Release components use mobile-first stacking/wrapping patterns. Authenticated visual verification remains recommended with a real account. |
| Intentional rails | Accepted | Horizontal children inside discovery/suggestion carousels are intentional and clipped/scrollable; no body-level overflow was introduced. |

## Remediation

The production source change is in `src/components/UnifiedNav.tsx`. The mobile regression selector was updated in `tests/mobile-features.spec.ts` to use `:visible`, accurately reflecting the intended DOM after the duplicate mobile search was removed.

## Verification

The mobile feature suite passed **10/10 tests** across `mobile-chrome` and `mobile-safari`. The production build and TypeScript checks also passed. The preview emitted expected local-environment TMDB/proxy warnings because the sandbox does not have the production proxy configuration; those warnings were not mobile layout or interaction failures.

## Remaining manual check

Use a signed-in local account at 390px or a physical phone to inspect the populated authenticated homepage, Collections, Taste Match profile card, Monthly Quests, Daily Trivia, Community Pulse, Calendar, and details pages. The automated guest/device audit cannot create or use a personal authenticated session.
