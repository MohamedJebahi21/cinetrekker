# CineTrekker Completion Todo

**Scope:** Remaining work after the full production audit and the first remediation release. This checklist deliberately separates implementation work from checks that require a real human browser session or disposable accounts. No task authorizes changes to existing user data.

## Implementation checklist

| ID | Priority | Work item | Status | Completion evidence |
|---|---:|---|---|---|
| PERF-01 | P1 | Reduce Home LCP by shortening the critical path to the first hero backdrop without reintroducing layout shift. | **Implemented; field validation pending** | The Home hero query is primed during bootstrap. Final lab samples remain dominated by variable third-party TMDB image delivery; CLS remains stable. |
| A11Y-01 | P2 | Reproduce and repair the observed keyboard focus-order escape, then add regression coverage. | **Completed** | A 16-step keyboard traversal regression test passes without focus returning to `body`. |
| REL-01 | P2 | Diagnose and reduce Supabase GoTrue lock warnings without weakening auth or changing user data. | **Completed in fresh-session coverage** | A fresh tablet Discover session emits no GoTrue lock warnings; no unsafe auth-lock override was introduced. |
| PWA-01 | P3 | Add a privacy-safe offline recovery path for public application-shell resources; never cache private lists or account data. | **Completed** | The service worker caches only public navigation shells and same-origin static assets, falls back to `/offline.html`, and excludes APIs and private routes. |
| SEO-01 | P3 | Review public sitemap scope and add only evergreen public pages that are suitable for indexing. | **Completed** | `robots.txt` and the production-serving static sitemap now allow and include `/people` and `/calendar`; personal routes remain excluded. |
| REG-01 | P2 | Add targeted automated coverage for the remediated URL recovery, loading stability, focus order, and offline fallback behavior. | **Completed** | Focus-order and GoTrue-warning coverage were added; release-quality CI passed on the final main branch. |
| ANA-01 | P2 | Harden consent-gated analytics so no tracker or product event can run without explicit consent or when Do Not Track is enabled; provide a production configuration handoff. | **Completed; configuration pending** | `UmamiAnalytics` gates script insertion; `trackProductEvent()` now independently gates custom events; static and browser regression coverage added. See `docs/UMAMI_ANALYTICS_SETUP_2026-08-20.md`. |

## Credential-dependent launch gates

| ID | Gate | Why it cannot be automated safely | Required human completion |
|---|---|---|---|
| OPS-01 | Feedback delivery | **Completed by the user on the live site.** | The user confirmed that Turnstile verification and live feedback submission worked in a real browser; no automated CAPTCHA retest is required. |
| OPS-02 | Umami analytics | **Completed.** CineTrekker is configured in the user-owned European Umami Cloud workspace; Vercel Production and Preview values and the narrow tracker CSP allow-list are deployed. | Four isolated production checks passed: no tracking before consent, after rejection, or with Do Not Track; one tracker script and request after acceptance. See `docs/UMAMI_ANALYTICS_ACTIVATION_VERIFICATION_2026-08-20.md`. |
| OPS-03 | Two-account privacy | **Completed with disposable accounts; remediated one profile-RLS exposure found during the test.** | Profiles, follows, comments, likes, and notification isolation were verified. The test found and closed a direct private-profile read policy; all test interactions were removed and both disposable profiles were returned to private inactive state. See `docs/TWO_ACCOUNT_PRIVACY_VERIFICATION_2026-08-20.md`. |
| OPS-04 | Browser push | **Controlled disposable-account attempt completed; real-browser grant and delivery remain pending.** The production Settings control is explicit and no subscription was created when the hosted automated browser could not complete the native permission lifecycle. | In a normal desktop or mobile browser: intentionally enable alerts in Settings, accept permission, verify one active subscription and a received test alert, then disable and verify unsubscribe. See `docs/BROWSER_PUSH_OPT_IN_TEST_2026-08-20.md`. |
| OPS-05 | Field Core Web Vitals | Lab testing does not replace real-user 75th-percentile reporting. | Review mobile and desktop LCP/CLS in Search Console, CrUX, or approved RUM after traffic is available. |

## Delivery rule

The implementation items are completed in priority order. Credential-dependent gates remain visible in the launch record and are not represented as passed until a human performs and documents them.
