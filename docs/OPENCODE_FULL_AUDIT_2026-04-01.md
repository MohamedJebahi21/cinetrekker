# OpenCode Full Audit Report (2026-04-01)

Scope: full 2-4 hour technical audit run using repository-native checks and artifact analysis.

## Evidence Collected

- Workspace integrity: passed
- Lint: passed with 1 warning
- Typecheck: no errors reported
- Security config verification: passed
- Security API tests: 4 passed, 0 failed
- Dependency audit:
  - Production tree: 0 vulnerabilities
  - Full tree: 0 vulnerabilities
- Production build: passed (with one chunking warning)
- Desktop Playwright: 168 passed, 18 failed
- Mobile Playwright (mobile-chrome + mobile-safari): 63 passed, 61 failed
- Lighthouse desktop:
  - Performance: 56
  - Accessibility: 100
  - Best Practices: 100
  - SEO: 100

## Findings (Severity Ordered)

### High

1. Protected route access control regression for watchlist route
- Evidence: test expectation fails that unauthenticated visit to watchlist redirects to login.
- Affected reference: [tests/protected-route.spec.ts](tests/protected-route.spec.ts#L17)
- Observed impact: route remains reachable at /watchlist in Chromium, Firefox, WebKit, and mobile-safari runs.
- Risk: unauthorized visibility of protected UX and potential data exposure pathways depending on route behavior.
- Confidence: high

2. Responsive grid contract failing across desktop browsers
- Evidence: expected 2/3/4-column grid profiles return single-column layout during responsive tests.
- Affected reference: [tests/responsive.spec.ts](tests/responsive.spec.ts#L56)
- Observed impact: 15 desktop failures (5 viewport profiles across 3 browsers).
- Risk: degraded usability and likely visual regressions across key breakpoints.
- Confidence: high

### Medium

3. Mobile Playwright infrastructure instability on mobile-chrome project
- Evidence: repeated browser launch failure with ICU descriptor error causing broad false-negative cascades.
- Affected reference: [playwright.config.ts](playwright.config.ts#L31)
- Observed impact: 61 total mobile-run failures, many attributable to launch crash rather than functional behavior.
- Risk: unreliable CI signal for mobile quality gates.
- Confidence: high

4. Performance score remains constrained by above-the-fold waste and layout instability
- Evidence (Lighthouse report JSON):
  - Performance 56
  - LCP 4.0 s
  - CLS 0.754
  - Unused JavaScript savings 133,415 bytes (130 KiB)
  - Unused CSS savings 21,889 bytes (21 KiB)
- Affected references:
  - [lighthouse-desktop-report/report.report.json](lighthouse-desktop-report/report.report.json#L4995)
  - [lighthouse-desktop-report/report.report.json](lighthouse-desktop-report/report.report.json#L68)
  - [lighthouse-desktop-report/report.report.json](lighthouse-desktop-report/report.report.json#L198)
  - [lighthouse-desktop-report/report.report.json](lighthouse-desktop-report/report.report.json#L3598)
  - [lighthouse-desktop-report/report.report.json](lighthouse-desktop-report/report.report.json#L3515)
- Risk: slower perceived load, layout shift dissatisfaction, weaker conversion and retention performance.
- Confidence: high

5. Build chunk strategy warning indicates ineffective dynamic import split for Supabase client
- Evidence: Vite reporter warning that dynamic import does not move module into separate chunk due static imports.
- Affected reference: [src/integrations/supabase/client.ts](src/integrations/supabase/client.ts)
- Risk: unnecessary initial bundle pressure and degraded route-level code splitting.
- Confidence: medium

### Low

6. Lint hygiene warning from unused eslint-disable directive
- Evidence: one warning for unused directive.
- Affected reference: [src/pages/Details.tsx](src/pages/Details.tsx#L329)
- Risk: low direct user impact; indicates cleanup debt and potential stale assumptions.
- Confidence: high

## Positive Controls Verified

- Security route tests are all passing, including invalid token flood controls and cron-header enforcement.
  - [tests/security-api.test.mjs](tests/security-api.test.mjs)
- Security headers and CSP verification script passes.
  - [scripts/verify-security-config.mjs](scripts/verify-security-config.mjs)
- Accessibility, Best Practices, and SEO are all scoring 100 in the latest desktop Lighthouse run.

## Artifacts Generated This Run

- [lighthouse-desktop-report/latest-run.json](lighthouse-desktop-report/latest-run.json)
- [lighthouse-desktop-report/report.report.json](lighthouse-desktop-report/report.report.json)
- [playwright-report/index.html](playwright-report/index.html)
