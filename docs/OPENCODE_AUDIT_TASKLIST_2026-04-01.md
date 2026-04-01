# OpenCode Audit Task List (2026-04-01)

Derived from findings in [docs/OPENCODE_FULL_AUDIT_2026-04-01.md](docs/OPENCODE_FULL_AUDIT_2026-04-01.md).

## Priority 0 (Start Immediately)

1. Fix protected watchlist redirect behavior for unauthenticated users
- Target: [tests/protected-route.spec.ts](tests/protected-route.spec.ts#L17)
- Implementation focus:
  - Validate route guard logic for watchlist route.
  - Ensure unauthenticated path consistently redirects to login.
  - Confirm no bypass through direct URL entry.
- Done when:
  - Protected-route suite passes for Chromium, Firefox, WebKit.
  - Verified on 2026-04-01: 111/111 desktop matrix tests passed across Chromium, Firefox, and WebKit.

2. Repair responsive grid behavior at tested breakpoints
- Target: [tests/responsive.spec.ts](tests/responsive.spec.ts#L56)
- Implementation focus:
  - Reconcile CSS grid classes and breakpoint utilities with test contract.
  - Verify media-grid receives expected column template at 375, 390, 768, 820, 1024 widths.
  - Adjust either implementation or test contract if product intent changed.
- Done when:
  - All responsive grid assertions pass in desktop browser matrix.
  - Verified on 2026-04-01: 111/111 desktop matrix tests passed across Chromium, Firefox, and WebKit.

## Priority 1 (Same Sprint)

3. Stabilize mobile test execution pipeline
- Target: [playwright.config.ts](playwright.config.ts#L31)
- Implementation focus:
  - Address mobile-chrome launch instability (ICU descriptor crash in current environment).
  - Add environment guardrails and explicit troubleshooting note for Windows runs.
  - Isolate infrastructure failures from functional failures in reporting.
- Done when:
  - Mobile projects run without launcher crash and produce deterministic pass/fail signal.

4. Reduce Lighthouse wasted bytes and improve LCP/CLS
- Targets:
  - [lighthouse-desktop-report/report.report.json](lighthouse-desktop-report/report.report.json#L3598)
  - [lighthouse-desktop-report/report.report.json](lighthouse-desktop-report/report.report.json#L3515)
  - [lighthouse-desktop-report/report.report.json](lighthouse-desktop-report/report.report.json#L198)
- Implementation focus:
  - Reduce initial payload pressure from vendor-ui, vendor-supabase, vendor-react, index bundles.
  - Defer or split non-critical CSS and remove homepage unused rules.
  - Identify CLS sources and lock dimensions/layout behavior for shifting elements.
- Latest baseline on 2026-04-01 after the home-stack reservation pass:
  - Performance score: 0.57
  - CLS: 0.754
- Latest baseline on 2026-04-01 after skipping initial mount scroll reset in `ScrollToTop`:
  - Performance score: 0.56
  - CLS: 0.754
  - CLS culprit remains `body > div#root > div.ct-page-shell > footer.bg-background` with layout shift score 0.75413.
- Latest baseline on 2026-04-01 after eager-loading the `/` route (removing initial `RouteSpinner` swap):
  - Performance score: 0.84
  - CLS: 0.000
  - Accessibility: 1.00, Best Practices: 1.00, SEO: 1.00
- Done when:
  - Performance score rises above 70 and CLS is below 0.25 in desktop baseline.

5. Resolve Supabase chunking warning from mixed static and dynamic imports
- Target: [src/integrations/supabase/client.ts](src/integrations/supabase/client.ts)
- Implementation focus:
  - Remove contradictory static imports where lazy-loading is intended.
  - Keep client availability explicit for always-on features; lazy-load only true cold paths.
- Done when:
  - Build completes without that chunking warning.

## Priority 2 (Cleanup)

6. Remove unused eslint-disable directive
- Target: [src/pages/Details.tsx](src/pages/Details.tsx#L329)
- Done when:
  - Lint runs with zero warnings.

## Execution Order

1. Route protection and responsive grid fixes
2. Desktop Playwright rerun
3. Mobile stability fix and rerun
4. Performance optimization passes plus Lighthouse reruns
5. Lint cleanup and final verification run

## Verification Command Set

1. npm run workspace:doctor
2. npm run lint
3. npx tsc --noEmit
4. npm run test:security
5. npm run test:e2e:desktop
6. npx playwright test --project=mobile-chrome --project=mobile-safari
7. npm run audit:desktop:full

## Verification Status

- Desktop browser matrix for the targeted audit specs passed on 2026-04-01.
- Result: 111 passed, 0 failed across Chromium, Firefox, and WebKit.
- Mobile-safari passed for the targeted audit specs on 2026-04-01.
- Mobile-chrome passed for the targeted audit specs on 2026-04-01 after switching to the Windows-safe Edge channel.
- Result: mobile matrix is fully green for the targeted audit specs.
- Mobile interaction coverage added for hamburger menu and carousel paging.
- Full mobile Playwright matrix passed on 2026-04-01: 132 passed, 0 failed across mobile-chrome and mobile-safari.
- Latest desktop Lighthouse audit rerun on 2026-04-01 completed and wrote fresh HTML/JSON artifacts, but CLS remained at 0.754 and the Windows Lighthouse temp cleanup still exits with EPERM after report generation.
- Post-`ScrollToTop` first-render guard verification rerun on 2026-04-01 confirms no CLS improvement (0.754) and no performance gain (0.56).
- Post-home-route eager-load verification rerun on 2026-04-01 confirms CLS is now 0.000 and performance improved to 0.84. The command still exits non-zero on Windows due Lighthouse temp cleanup EPERM, but artifacts remain valid.
- Final lint verification on 2026-04-01 passed with zero warnings after removing the unused directive in `src/pages/Details.tsx`.
- Final typecheck verification on 2026-04-01 passed (`npx tsc --noEmit`) after fixing typings in `tests/mobile-features.spec.ts`.
- Full Playwright matrix verification on 2026-04-01 passed: 330 passed, 0 failed across chromium, firefox, webkit, mobile-chrome, and mobile-safari.
- Latest Lighthouse verification after final cleanup remains stable at Performance 0.84 and CLS 0.000 (`report-2026-04-01T22-36-16-710Z.report.json`).
