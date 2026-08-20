# CineTrekker Full Production Audit

**Audit date:** 20 August 2026
**Environment:** `https://cinetrekker.vercel.app` production deployment
**Prepared by:** Manus AI
**Audit mode:** Non-destructive, unauthenticated public-user and boundary testing. No accounts, watches, follows, comments, feedback messages, subscriptions, or other user data were created or changed.

## Executive conclusion

CineTrekker has a solid baseline for a public launch: the audited crawl covered 43 public and authentication-boundary route/device combinations without navigation exceptions, page-level console errors, failed network requests, or horizontal overflow. Public routing, canonical metadata, secure headers, API authorization boundaries, consent-gated analytics, and opt-in browser-alert behavior all tested as expected. Original-language search now satisfies the stated Turkish-title requirement: both `yiralti` and `yıralti` return **Yeraltı** as the top result. [1] [2] [3]

However, the product should **not yet be declared launch-ready**. One reproducible P0 defect makes a realistic invalid movie or TV link render as a blank page, and the Home and Discover pages have material visual-stability and loading-performance risks. The P0 is a contained code fix. The performance findings are laboratory signals, not population-level field data, but are large enough to remediate before traffic is scaled. Google defines a good LCP as 2.5 seconds or less and a good CLS as 0.1 or less; the reported values must ultimately be confirmed in field telemetry at the 75th percentile. [4] [5] [6]

> **Launch decision:** Fix the P0 blank-page failure, ship the 404 indexing correction, then re-test visual stability and LCP before promoting the product as ready for broad daily use. Complete the credential-dependent checks separately before enabling the related operational promises.

| Area | Current assessment | Release implication |
|---|---|---|
| Public routing and first-use flow | **Pass** across the audited route set | Suitable baseline for further release validation |
| Security, API boundaries, and consent gating | **Pass** in unauthenticated checks | No high-severity exposure found in this audit |
| Original-language discovery | **Pass** for `yiralti` and `yıralti` | Required Turkish search behavior is live |
| Invalid content URL recovery | **Fail — P0** | Must fix before launch sign-off |
| Home and Discover stability/performance | **Fail — P1** | Remediate and re-measure before traffic growth |
| Feedback, push, analytics, and multi-account privacy | **Pending manual/credential checks** | Do not claim full operational verification yet |

## Scope and methodology

The audit used a fresh browser context, desktop and mobile/tablet viewports, direct-route navigation, keyboard checks, metadata inspection, responsive inspection, API-boundary requests, and synthetic browser performance instrumentation. The first-time-user flow covered initial load, title search, opening a public detail page, browser-back navigation, zero-results handling, genre discovery, sign-in validation, sign-up rendering, password-recovery availability, public-profile failure handling, and feedback validation. [1]

The performance results below are **synthetic laboratory measurements** collected after a settled-load window. They are useful for detecting regressions and locating DOM shifts, but they are not a substitute for Chrome UX Report, Search Console, or real-user monitoring. Google recommends evaluating Core Web Vitals at the 75th percentile and separately for mobile and desktop. [4] [5] [6]

## Verified strengths

CineTrekker’s baseline is stronger than a typical pre-launch media tracker. The public aliases redirect correctly, protected routes redirect unauthenticated visitors to sign-in rather than exposing private content, and the first-time-user flow does not dead-end. No horizontal overflow was observed in the audited mobile/tablet routes. [1]

The production security posture also tested well. The deployment exposed a restrictive content security policy, HSTS, anti-framing and MIME-sniffing defenses, a restrictive permissions policy, trusted-types enforcement, and HTTPS redirection. Source-map probes returned 404. Notification endpoints returned `401` without a bearer token, invalid mutation methods returned `405`, and the unmatched API response exposed no stack trace, secret, or user data. [1]

Privacy controls behaved appropriately in a fresh context: no Umami or Vercel Analytics script was present before cookie consent, and this audit did not trigger `Notification.requestPermission`. Browser alerts therefore remain opt-in rather than being requested on page load. [1]

| Verified item | Evidence | Status |
|---|---|---|
| Canonical, Open Graph, title, description, and image-alt checks | Audited Home, Search, Discover, detail, Person, Feedback, and unknown route | **Pass, with exceptions below** |
| Movie and TV structured data | Movie retains `Movie`; TV retains `TVSeries` after client hydration | **Pass** |
| Skip link | Targets the application `main` landmark | **Pass** |
| International title search | `yiralti` and `yıralti` each return 25 results with **Yeraltı** first | **Pass** |
| Feedback input labels | Current audit reports no missing labels; current source contains visible labels | **Pass — stale issue removed** |
| TMDB attribution link name | Nested image alt text supplies the link’s accessible name | **Pass — not an unlabeled-control defect** |

## Severity-ranked findings

### P0 — release blocker

| Finding | Evidence and user impact | Required remediation | Verification gate |
|---|---|---|---|
| **Invalid movie/TV/person URL can render a blank page.** | A direct invalid movie URL returned HTTP 200 with an almost empty document and a malformed module script that lacked `</script>`. A stale, mistyped, or shared-invalid title link can therefore strand a visitor on a blank page instead of showing recovery UI. The catch fallback in `api/edge-meta.js` derives `scriptTag` from a regex that only captures the opening script tag. [1] [7] | Make the fallback use the full production SPA shell, as the normal metadata response already does; or explicitly close an extracted module script before inserting it. Add a regression test for an invalid numeric title ID. Preserve `noindex,nofollow` on this error fallback. | Production invalid movie, TV, and Person IDs render the normal not-found/recovery experience with a booting app, no blank page, and no console error. |

### P1 — high priority before broad promotion

| Finding | Measured impact | Recommended remediation | Verification gate |
|---|---|---|---|
| **Home has poor CLS and late LCP.** | Home synthetic CLS was **0.347**; its largest shift occurred at about 1.8s, moving `main.page-container` from `y=65, height=895` to `y=666, height=294`. Home LCP was **6.24s**, with the hero backdrop as the candidate. CLS above 0.25 is poor and LCP above 4s is poor by Google’s published thresholds. [5] [6] [8] | Keep the first render’s shell and resolved content in the same vertical geometry. Reserve hero and initial content height, avoid replacing a large initial region with a much shorter one, and defer non-critical data sections without shifting already visible content. The Home hero already has eager/high-priority attributes, so first profile network, decode, and long JavaScript tasks rather than merely adding another priority hint. | Re-run cold-cache desktop and mobile tests. Target CLS ≤0.10 and LCP ≤2.5s where feasible; at minimum remove the dominant 0.347 shift before release. |
| **Discover has unstable layout and late LCP.** | Discover synthetic CLS was **0.185**. At about 4.4s, the Mood panel and Browse By section moved about 537px while a larger region resolved. Discover LCP was **7.58s**, with the spotlight backdrop as the candidate. [5] [6] [8] | Render fixed-height skeletons or stable placeholders for the hero, Browse By, and mood content. Do not reorder or collapse above-the-fold sections as data resolves. Ensure the actual hero candidate is requested early, sized responsively, and not delayed behind non-essential work. | Re-run cold-cache desktop and mobile tests. Target CLS ≤0.10 and LCP ≤2.5s; investigate field data before declaring a Core Web Vitals pass. |
| **User-facing 404 pages are indexable.** | An arbitrary unknown route returned a 404 recovery interface but advertised `robots: index,follow,max-image-preview:large` and self-canonicalized to the arbitrary path. This can create low-value indexed URLs. [3] | Pass `robots="noindex,follow"` to the shared SEO component in `src/pages/TitleStatus.tsx`. Keep the page usable and preserve a canonical only if it is intentionally meaningful. | Confirm an arbitrary unknown route reports `noindex,follow` after deployment. |

### P2 — important quality and accessibility remediation

| Finding | Evidence and user impact | Remediation |
|---|---|---|
| **Small touch targets in carousels and calendar actions.** | Discover pagination controls measured as little as 6×6px on tablet and 6×44px on mobile. Calendar quick-action buttons measured 24×24px on tablet; mobile external-detail links measured 30px high. These are difficult to tap reliably. [1] | Give each interactive target a minimum 44×44 CSS-pixel hit area, even if the visual dot/icon remains compact. Use padding or an invisible hit wrapper; retain visible focus styling. |
| **Person structured data is removed after hydration.** | Server metadata can produce `Person` schema, but the client SEO manager clears existing CineTrekker JSON-LD and Person pages re-add only BreadcrumbList. The audited Person route therefore retained only BreadcrumbList. [3] [7] | Pass a complete Person JSON-LD payload from `src/pages/Person.tsx`, or make the SEO manager preserve server JSON-LD when it is semantically equivalent. Add a hydration regression test. |
| **Homepage contains two `main` landmarks.** | The app shell wraps routes in `main`, while `Index.tsx` adds a second page-content `main`; the audit counted two main landmarks on Home. [3] | Change the nested Home landmark to a `section` or `div` while keeping the app shell as the sole page `main`. |
| **Keyboard traversal needs a final focused regression.** | Initial focus order begins correctly with the skip link, but an audit run observed focus reaching `body` after the first header controls. This is not yet tied to a user-visible trap, but warrants an automated focus-order test. | Test the full sequence on desktop and mobile menu states. Ensure all interactive controls have a predictable tab order and focus never disappears visually. |
| **Supabase GoTrue lock warnings need diagnosis.** | Discover logged four stale-auth-token lock acquisition warnings on tablet. The audit found no demonstrated user-facing failure, so this is an investigation item rather than a confirmed functional bug. [1] | Audit Supabase client initialization and cross-tab lock lifecycle; deduplicate initialization if needed. Re-test with fresh and returning browser contexts. |

### P3 — enhancements and crawl-policy decisions

| Finding | Rationale | Recommended action |
|---|---|---|
| **No offline experience.** | The service worker currently handles push and notification clicks only; it has no fetch handler or application-shell cache. The manifest is valid, but a user should not expect offline browsing. [9] | Either document the product as online-only or introduce a deliberately scoped offline shell and cached last-viewed metadata. Do not cache private user lists without a privacy and invalidation design. |
| **Sitemap scope is intentionally narrow, but should be reviewed.** | The live sitemap contains core public discovery and legal pages, while `robots.txt` disallows account-oriented routes, calendar, stats, and feedback. This is not an indexing contradiction. [10] | Decide which genuinely public, high-value evergreen routes should be discoverable. Add only routes that provide standalone search value; do not add authenticated, thin, or duplicate routes merely for coverage. |
| **First-visit product orientation can be clearer.** | The Home H1 is the currently featured title, while the product proposition appears below it. Cookie consent also occupies significant initial mobile viewport space until a choice is made. [1] | Keep the cinematic spotlight but make CineTrekker’s value proposition visibly primary to first-time visitors. Consider a compact, non-obstructive consent presentation that preserves access to mobile navigation. |

## Items reclassified or removed from the backlog

The final report intentionally excludes several stale or misclassified concerns. The feedback fields now have associated labels, and the audit confirms `labelsMissing: []`; they should not remain a P1 item. The TMDB attribution link is named through its nested image alternative text, so lack of an explicit `aria-label` does not create an unlabeled-link failure. [1] [3]

The production sitemap does not include several app routes, but current robots directives intentionally exclude account-oriented and calendar/feedback routes. This is a product discovery decision, not a defect by itself. Similarly, the GoTrue warnings are recorded as a P2 investigation, not a confirmed production failure. [1] [10]

## Operational launch gates that remain outside this audit

The following checks require a real browser and/or authorized disposable accounts. They are not defects in the unauthenticated public build, but they must be completed before the corresponding capabilities are promoted to users.

| Gate | Why it remains pending | Completion criterion |
|---|---|---|
| Feedback delivery | Turnstile widget and public runtime configuration load, but automated browsing cannot obtain a human CAPTCHA token. [1] | In a real browser, submit feedback once and verify successful Resend delivery and failure messaging. |
| Analytics | No analytics scripts load before consent; Umami production variables are not configured. [1] | Configure the approved Umami site values, accept consent, and verify a single anonymized page view; reject consent and verify no analytics request. |
| Two-account privacy | No accounts were created during this audit. [1] | With disposable accounts, verify profile visibility, follow/comment behavior, notification isolation, and revocation behavior. Clean up test accounts afterward. |
| Browser push subscription | Permission was intentionally not requested during audit and the current browser context reports its automation default. [1] | Sign in with a disposable account, explicitly enable alerts in Settings, accept the browser prompt, verify one subscription and one notification; then test disable/unsubscribe. |
| Field performance | Current LCP/CLS values are laboratory observations. [4] [5] [6] | After remediation, inspect Search Console/CrUX or approved real-user monitoring for 75th-percentile mobile and desktop LCP/CLS. |

## Recommended delivery sequence

| Order | Work package | Why now | Exit condition |
|---|---|---|---|
| 1 | Repair `api/edge-meta.js` invalid-content fallback | Eliminates the only P0 blank page | Invalid title URLs always boot into recovery UI |
| 2 | Add noindex to `TitleStatus.tsx` | Low-risk SEO correction | Unknown route reports `noindex,follow` |
| 3 | Stabilize Home and Discover initial geometry | Directly addresses retention-damaging visual jumps | No dominant layout shift in cold-load regression tests |
| 4 | Trace hero image and main-thread LCP contributors | Performance priority attributes alone are not sufficient | Reduced lab LCP plus field instrumentation plan |
| 5 | Correct touch targets and duplicate main landmark | Low-risk accessibility improvements | Controls have 44px hit areas; Home has one main landmark |
| 6 | Preserve Person JSON-LD after hydration | Protects structured-data consistency | Person and BreadcrumbList schemas remain after React settles |
| 7 | Complete manual operational gates | Converts configuration into verified capability | All four gates above have evidence and owner sign-off |

## References

[1]: ../audit-artifacts/full-e2e-audit-2026-08-18/EVIDENCE_NOTES.md "CineTrekker production audit evidence notes"
[2]: ../audit-artifacts/full-e2e-audit-2026-08-18/international-search-summary.json "Production international-title search verification"
[3]: ../audit-artifacts/full-e2e-audit-2026-08-18/quality-signals-detail-summary.json "Route-level SEO and accessibility signal summary"
[4]: https://developers.google.com/search/docs/appearance/core-web-vitals "Google Search Central: Understanding Core Web Vitals and Google Search results"
[5]: https://web.dev/articles/lcp "web.dev: Largest Contentful Paint"
[6]: https://web.dev/articles/cls "web.dev: Cumulative Layout Shift"
[7]: ../api/edge-meta.js "CineTrekker server-rendered metadata handler"
[8]: ../audit-artifacts/full-e2e-audit-2026-08-18/layout-stability-summary.json "CineTrekker layout stability and LCP measurements"
[9]: ../audit-artifacts/full-e2e-audit-2026-08-18/coverage/sw.js "CineTrekker production service worker"
[10]: https://cinetrekker.vercel.app/robots.txt "CineTrekker robots.txt"
