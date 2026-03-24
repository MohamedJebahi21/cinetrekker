# CineTrekker Full Website Audit

Date: 2026-03-23  
Scope: Design, logic, code quality, performance, accessibility, SEO, API/security posture

## Executive Summary

The application is functionally stable and test-healthy, with strong accessibility/SEO and excellent best-practices scores. The primary area holding overall quality back is performance, driven by oversized bundles and render-blocking resources.

Current state:
- Functional stability: Strong (desktop E2E clean)
- Code quality baseline: Strong (lint/build clean)
- Accessibility: Good but not perfect (specific label/contrast regressions)
- SEO: Strong
- Performance: Needs focused optimization

## Audit Evidence and Validation Runs

The following checks were executed during this audit:
- ESLint: passed
- Production build: passed
- Playwright desktop suite: 186 passed across Chromium, Firefox, WebKit
- Lighthouse desktop report: generated successfully (non-zero cleanup warning handled by script fallback)

Artifacts:
- lighthouse-desktop-report/report.report.html
- lighthouse-desktop-report/report.report.json

## Lighthouse Results (Desktop)

Category scores:
- Performance: 69
- Accessibility: 96
- Best Practices: 100
- SEO: 100

Key metrics:
- FCP: 2.2 s
- LCP: 3.2 s
- Speed Index: 2.3 s
- TBT: 40 ms
- CLS: 0.008

Top opportunities from report:
- Eliminate render-blocking resources: est savings 270 ms
- Reduce unused JavaScript: est savings 133 KiB
- Reduce unused CSS: est savings 22 KiB

## Prioritized Findings

### 1) High: Lighthouse script can audit the wrong port

Impact:
- Can produce misleading or stale audit outcomes if another process owns port 4173.

Evidence:
- scripts/run-lighthouse-desktop.mjs uses fixed port assumptions in preview startup, wait-on target, and Lighthouse URL.

Recommendation:
- Capture actual preview URL/port from process output and pass it to wait-on and Lighthouse dynamically.
- Alternatively reserve/kill conflicting ports before startup.

---

### 2) High: Large route-level payloads (notably location flow)

Impact:
- Slower route transitions and higher parse/compile cost.

Evidence:
- Build output shows very large chunks (including multi-hundred-KiB and >1 MiB assets).
- src/components/FilmingLocationsMap.tsx statically imports mapbox-gl and CSS.

Recommendation:
- Lazy-load mapbox-gl and its stylesheet only on routes that require maps.
- Split heavy page concerns (map layer, enrichments, affiliate widgets) behind route-level and component-level suspense boundaries.

---

### 3) Medium: Render-blocking CSS/fonts hurt first paint

Impact:
- Slower FCP/LCP on first navigation.

Evidence:
- Lighthouse render-blocking-resources opportunity.
- src/index.css imports Google Fonts at top-level.

Recommendation:
- Move fonts to preconnect + preload strategy and reduce blocking font CSS on first paint.
- Consider self-hosting critical font subsets or deferring non-critical families/weights.

---

### 4) Medium: Unused CSS/JS on initial load

Impact:
- Extra transfer and parse work before interactivity.

Evidence:
- Lighthouse flags unused-javascript and unused-css-rules with non-trivial estimated savings.

Recommendation:
- Tighten code-splitting by route and feature slices.
- Revisit shared bundles and manualChunks partitioning in vite.config.ts.
- Audit global CSS and remove dead utility/style paths.

---

### 5) Medium: Accessibility name mismatch issues

Impact:
- Voice-control and screen-reader clarity regressions for controls with visible labels.

Evidence:
- Lighthouse flags label-content-name-mismatch.
- Patterns observed in navigation and homepage toggle controls.

Recommendation:
- Ensure accessible names include visible button/link text.
- Avoid aria-label values that conflict with visible labels unless required; prefer text content or aria-labelledby where possible.

---

### 6) Medium: Accessibility contrast issue on error banner

Impact:
- Reduced readability for critical state messaging.

Evidence:
- Lighthouse color-contrast finding.
- Error alert styling in homepage critical-error block.

Recommendation:
- Adjust destructive foreground/background pair for WCAG-compliant contrast in both light and dark themes.

---

### 7) Medium: Rate-limit identity strategy is bypass-prone

Impact:
- User-agent rotation can bypass limits; shared IP traffic can be over-throttled.

Evidence:
- api/_lib/requestSecurity.js keys rate-limiting by IP + user-agent.

Recommendation:
- Prefer IP + authenticated user ID (when available), with endpoint-sensitive thresholds.
- Keep user-agent only as supplemental signal.

---

### 8) Low: Shell-spawn deprecation/security warning in audit script

Impact:
- Not a user-facing bug, but reduces hardening and future compatibility confidence.

Evidence:
- scripts/run-lighthouse-desktop.mjs uses shell: true in spawn calls.

Recommendation:
- Remove shell: true where not needed and pass arguments directly.

## Design and UX Assessment

Strengths:
- Clear visual identity and cohesive cinematic tone.
- Mobile/touch-target and viewport behavior appears strong in automated desktop-browser matrix.
- Navigation, protected routes, and major key-route rendering are stable.

Improvements:
- Error-state readability and naming consistency in controls.
- Performance refinement on content-heavy and map-heavy experiences.

## Logic and Code Enhancement Assessment

Strengths:
- Authentication enforcement is implemented in state-changing APIs (follow/unfollow/notifications).
- Request hardening exists (origin + rate limit layer).
- Good baseline of lazy routes and suspense handling.

Improvements:
- Improve resilience/accuracy of audit tooling.
- Refine rate limiting identity and thresholds.
- Review heavy dependency loading boundaries.

## 14-Day Remediation Plan

### Week 1 (highest impact)
- Fix lighthouse runner to use actual preview port dynamically.
- Implement dynamic import for mapbox-gl and map CSS.
- Correct accessibility label/name mismatches.
- Fix destructive error color contrast pair.

### Week 2
- Reduce render-blocking font/CSS strategy.
- Trim unused CSS/JS via bundle analysis and route-scoped extraction.
- Rework rate-limit identity keys and endpoint-specific quotas.
- Remove shell: true from script runner where possible.

## Success Criteria for Re-Audit

Target outcomes after remediation:
- Performance score >= 80
- LCP <= 2.5 s (desktop baseline)
- FCP <= 1.8 s
- Keep Accessibility >= 96, SEO = 100, Best Practices = 100
- Zero Lighthouse failures for:
  - label-content-name-mismatch
  - color-contrast
  - major render-blocking opportunities

## Conclusion

CineTrekker is in a healthy and shippable state from a reliability and product-flow perspective. The main quality lift now is performance-focused engineering, plus a small set of accessibility fixes that are straightforward and high leverage. Once those are addressed, the site should move from good to excellent across all major quality dimensions.

## Post-Remediation Status (2026-03-23)

All requested remediation items from this audit are now implemented.

Completed fixes:
- Lighthouse runner now detects preview port dynamically and no longer relies on fixed `4173` assumptions.
- Windows-safe process spawning flow was added for the desktop audit script.
- Mapbox runtime and stylesheet were moved to dynamic imports in the map component.
- Blocking Google Fonts CSS import was removed from global CSS.
- Fonts are now loaded with preconnect/preload and async stylesheet strategy in HTML.
- Home-page aria label/name mismatches were corrected by removing conflicting aria-labels from visible-label toggles.
- Critical error banner color contrast was increased for light/dark themes.
- Rate-limit keying now uses IP + authenticated user id when available, with endpoint-sensitive thresholds.
- CI workflow action tags were corrected from unresolved versions to stable action tags.
- Dead starter CSS and inline loading-shell style attributes were removed.

Bundle impact (build artifact comparison):
- Main app chunk reduced from ~467.75 kB to ~242.46 kB after route/component lazy loading and vendor-ui chunk extraction.
- Build remains successful with no empty `vendor-mapbox` chunk warning.

Current validation snapshot:
- ESLint: passing.
- Production build: passing.
- Workspace diagnostics: no remaining code errors.
- Lighthouse report JSON currently still shows baseline scores (`Performance 69`, `Accessibility 96`, `Best Practices 100`, `SEO 100`) from the existing artifact; run a fresh report capture to measure post-remediation score deltas.

## Deep Audit Update (2026-03-24)

This deep audit pass reviewed runtime behavior, API security controls, architecture hotspots, and test reliability with a fresh quality run and targeted source inspection.

### Deep Audit Evidence

- ESLint: passed (`npm run lint`)
- Production build: passed (`npm run build`)
- Playwright desktop suite: 185 passed, 1 failed (`npm run test:e2e:desktop`)
- Dependency audit: 14 vulnerabilities (`4 low`, `3 moderate`, `7 high`)
- Lighthouse artifact parse: unchanged baseline scores (`Performance 69`, `Accessibility 96`, `Best Practices 100`, `SEO 100`)

Notes:
- `npm run audit:desktop` did not produce observable terminal completion output in this environment during this deep pass.
- The Lighthouse JSON artifact currently available is timestamped `2026-03-23T20:41:51.936Z`, so score deltas after latest changes are still unverified.

### Prioritized Deep Findings

#### 1) High: Dependency vulnerability backlog remains open

Impact:
- Elevated supply-chain and runtime risk from known advisories in transitive and direct dependencies.

Evidence:
- `npm audit --audit-level=moderate` reports 14 vulnerabilities.
- High-severity chains include `undici`, `path-to-regexp`, `minimatch`, `tmp`, `flatted`.
- Several fixes require major version moves (notably via `@vercel/node` and `@lhci/cli` dependency trees).

Recommendation:
- Execute a two-phase dependency remediation plan:
  1. Apply non-breaking upgrades (`npm audit fix`) and re-run lint/build/tests.
  2. Stage and validate breaking upgrades in a dedicated branch with API/runtime regression checks.

#### 2) Medium: Desktop E2E suite is no longer fully green

Impact:
- Quality gate instability can mask regressions and reduce release confidence.

Evidence:
- Current desktop run result: 1 failing test in WebKit.
- Failure in `tests/qa-routes-accessibility.spec.ts` for touch-target audit (`sampled` controls count was `0`, expected `> 0`).
- Error snapshot shows page in route-spinner/loading state during assertion, indicating timing fragility in this specific check.

Recommendation:
- Stabilize the failing test by waiting for a deterministic UI-ready marker before sampling controls.
- Keep the assertion strict after readiness (do not weaken pass criteria).

#### 3) Medium: Lighthouse post-remediation scoring is not yet reproducible from automation

Impact:
- Performance progress cannot be confidently measured or tracked across commits.

Evidence:
- Latest automation attempt did not provide a final audit completion trace in terminal output.
- Existing JSON file still reflects previous baseline values.

Recommendation:
- Add explicit success/failure logging and timeout guards in `scripts/run-lighthouse-desktop.mjs`.
- Emit detected port and final report path checksum/timestamp after run completion.

#### 4) Medium: Query invalidation breadth can cause avoidable network churn

Impact:
- Increased refetch load and slower interaction recovery in error/refresh paths.

Evidence:
- `src/App.tsx` uses broad invalidation in pull-to-refresh (`invalidateQueries()` without predicate).
- Error-boundary retry invalidates many keys in a single interaction.

Recommendation:
- Narrow invalidations to active route-scope key groups and preserve broad invalidation only for explicit full-refresh actions.

#### 5) Low: Cron authorization accepts bearer fallback equal to cron secret

Impact:
- Secret reuse across channels increases accidental exposure risk and weakens separation between machine and user auth semantics.

Evidence:
- `api/jobs/check-followed-updates.js` authorizes when `x-cron-secret === CRON_SECRET` OR bearer token equals `CRON_SECRET`.

Recommendation:
- Restrict cron authorization to a dedicated header only (`x-cron-secret`) and avoid bearer-based secret matching.

### Positive Findings Confirmed in Deep Pass

- Security middleware coverage remains broad across state-changing API handlers (`enforceRequestSecurity`).
- Protected route behavior and route shell tests are largely stable across Chromium/Firefox/WebKit in current run.
- Recent lazy-loading regression in app shell was addressed correctly by mapping named exports to default in lazy imports.
- Build output confirms improved chunking compared to earlier baseline; app shell chunk remains significantly lower than pre-remediation state.

### Deep Audit Action Plan (Next 7 Days)

1. Fix the single WebKit touch-target flake by waiting for page-ready state before measurement.
2. Make Lighthouse desktop script emit deterministic completion evidence and regenerate report artifacts.
3. Apply non-breaking `npm audit fix`, then rerun lint/build/E2E and compare vulnerability delta.
4. Scope refresh invalidations by route/domain to reduce unnecessary refetch traffic.
5. Harden cron auth path to header-only shared secret.

## Deep Audit Implementation Status (2026-03-24)

All code-level deep-audit actions requested in this pass were applied, with one residual security bucket that requires breaking dependency upgrades.

Applied changes:
- Stabilized WebKit touch-target test in `tests/qa-routes-accessibility.spec.ts` by waiting for main content and visible controls before measurement.
- Hardened Lighthouse automation observability and reliability in `scripts/run-lighthouse-desktop.mjs`:
  - Reserved a free local preview port explicitly.
  - Started preview on that exact port.
  - Added deterministic command start/end logging and timeout handling.
  - Preserved artifact-aware fallback for known Windows Lighthouse EPERM cleanup behavior.
- Reduced broad refetch churn in `src/App.tsx` by scoping pull-to-refresh and retry invalidations to a defined TMDB/page query key set.
- Hardened cron job authorization in `api/jobs/check-followed-updates.js` to require `x-cron-secret` header only.
- Applied non-breaking dependency remediations via `npm audit fix`.

Post-change validation:
- ESLint: passing.
- Production build: passing.
- Desktop E2E: `186 passed`, `0 failed`.
- Targeted previously-failing WebKit touch-target test: passing.
- Lighthouse desktop audit script: completed with deterministic logs and artifact summary; run still may emit known Windows EPERM cleanup error from Lighthouse process, but artifacts are generated and handled.
- Dependency audit after non-breaking fix: `12 vulnerabilities` (`4 low`, `2 moderate`, `6 high`), down from `14` (`4 low`, `3 moderate`, `7 high`).

Residual open risk (requires breaking changes):
- Remaining high/moderate advisories are currently in dependency chains that require `npm audit fix --force` (notably major moves involving `@vercel/node` and `@lhci/cli`).