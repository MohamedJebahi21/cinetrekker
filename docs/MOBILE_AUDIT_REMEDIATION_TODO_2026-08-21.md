# CineTrekker Mobile Audit Remediation Checklist

**Source audit:** `CINETREKKER_MOBILE_PRODUCTION_AUDIT_2026-08-21.md`
**Scope:** Implement every actionable audit finding. CAPTCHA completion remains a real-browser verification item and is not changed.

| ID | Priority | Finding | Planned remediation | Status |
| --- | --- | --- | --- | --- |
| MOB-01 | P1 | Browser Back loses the prior Home/discovery scroll position after visiting title details. | Make route scroll logic navigation-aware: scroll to top only on forward navigation and preserve/restore history positions on browser Back/Forward. | Complete — locally verified |
| MOB-02 | P1 | Fixed bottom navigation can cover the Feedback textarea at a 320px viewport. | Add mobile safe-focus scroll margins and context-aware bottom-nav suppression while editable form fields are focused. | Complete — locally verified |
| MOB-03 | P1 | Footer TMDB attribution collapses into an unreadable narrow column at 320px. | Stack legal attribution elements on mobile and retain the inline three-way row only at larger breakpoints. | Complete — locally verified |
| MOB-04 | P2 | Home lacks a page-level H1 and hero thumbnail buttons have no accessible names. | Add a screen-reader-only Home H1 and title-specific labels for hero thumbnail selection controls. | Complete — locally verified |
| MOB-05 | P2 | The global mobile search entry is too narrow at 320px. | Replace the text field with a clear, 44px labelled search trigger at the narrow breakpoint while retaining the existing search overlay workflow. | Complete — locally verified |
| MOB-06 | P2 | Discover mood chips are below the 44px target-height guidance. | Increase chip hit areas to 44px minimum without changing the content hierarchy. | Complete — locally verified |
| MOB-07 | P2 | Guest menu presents a full authenticated information architecture before the visitor has a reason to use it. | Add a concise guest-first navigation structure and a clear account-only section. | Complete — locally verified |
| MOB-08 | P2 | Discover’s media-heavy first view had a 3.31s lab LCP due to remote image work. | Prioritize the hero/spotlight image and defer non-critical below-the-fold discovery content or image loading. | Complete — locally verified |
| MOB-09 | P3 | Horizontal rails do not clearly advertise that more items can be swiped. | Add a subtle mobile-only edge/fade cue that respects reduced motion. | Complete — locally verified |
| MOB-10 | P3 | Detail-video rail arrow controls are 36px wide. | Increase the arrow hit targets to a 44×44px interactive surface. | Complete — locally verified |
| MOB-11 | P3 | Returning visitors encounter a long onboarding explainer before core browsing. | Condense the Home activation explainer after first interaction/visit without removing the new-visitor guidance. | Complete — locally verified |
| MOB-12 | Regression | Future changes could reintroduce audited mobile defects. | Add automated regressions for scroll restoration, 320px feedback/nav clearance, footer stacking, Home H1/hero labels, and mobile tap-target contracts. | Complete — locally verified |

## Validation completed before release

The complete local quality gate passed on 2026-08-21: `npm run test:unit`, `npm run test:ci`, and `npm run build`. Focused 320px production-build checks also confirmed Feedback bottom-nav suppression, the Home semantic H1, the compact mobile search trigger, the initial Discover request limit, mood-chip pressed semantics, and zero horizontal footer overflow. The sandbox cannot retrieve TMDB content consistently, so the remote Discover spotlight image-source check remains a production verification item rather than a failed remediation.

## Explicit non-changes

The following audit limitation is not a product change: **Cloudflare Turnstile feedback completion cannot be verified from the automated environment**. No CAPTCHA bypass is permitted. The real-browser verification remains the correct release check.
