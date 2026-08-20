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
| OPS-02 | Umami analytics | **Implementation-ready; human configuration still required.** Production site ID and script URL remain unset, and the tracker host must be added to the restrictive CSP when selected. | Follow `docs/UMAMI_ANALYTICS_SETUP_2026-08-20.md`: configure the approved production values, commit the minimal CSP allow-list update, redeploy, then complete the no-decision, rejected-consent, accepted-consent, and Do Not Track checks. |
| OPS-03 | Two-account privacy | Requires disposable authenticated identities and social interactions. | Verify profiles, follows, comments, notification isolation, and revocation; delete test records afterward. |
| OPS-04 | Browser push | Requires explicit signed-in user intent and a browser permission prompt. | Enable alerts in Settings, receive one notification, then disable and verify unsubscribe. |
| OPS-05 | Field Core Web Vitals | Lab testing does not replace real-user 75th-percentile reporting. | Review mobile and desktop LCP/CLS in Search Console, CrUX, or approved RUM after traffic is available. |

## Delivery rule

The implementation items are completed in priority order. Credential-dependent gates remain visible in the launch record and are not represented as passed until a human performs and documents them.
