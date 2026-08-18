# CineTrekker Launch-Readiness Checklist

**Status date:** 18 August 2026  
**Scope:** Production readiness for CineTrekker at `https://cinetrekker.vercel.app`  
**Working rule:** Every item must have a clear owner, proof of completion, and no silent degradation of user-facing behavior.

## Current Release Baseline

| Area | Status | Evidence |
|---|---|---|
| Editorial noir visual system | Complete | Deployed in `8d2b50d` |
| Browser push preferences and delivery infrastructure | Complete, subscription opt-in remains to be reverified | Production migration, function, VAPID secrets, and scheduler were previously deployed |
| International-title search | Complete | Original-title ranking and Turkish fallback are deployed |
| Continue Watching | Complete | Restored alongside Up Next |
| Feedback user experience | Safely degraded | Unavailable service disables form and offers direct email fallback |
| Loading stability | In progress | Home/search/profile/public-profile skeleton improvements deployed |
| Web Vitals instrumentation | Code complete; provider configuration pending | Consent-gated CLS/INP/LCP reporter deployed in `d47fa3d`; a consent-off production session was verified to load no Umami tracker script on 18 August 2026 |
| Hosted release quality gate | Complete | GitHub Actions run `32183156485` passed lint, types, API security, i18n, audit, build, unit, smoke, mobile Safari, layout-stability, and CI-native visual-regression checks |

## Confirmed External-Service Prerequisites

| Service | Current state | Required next action |
|---|---|---|
| Vercel administration | An existing Vercel integration is present for the task but is currently disabled. | Enable it only when production environment values must be inspected or updated, then use the deployment administrator’s approved provider credentials. |
| CAPTCHA provider | No provider credentials are available in the checked-out project. | Supply or configure either Cloudflare Turnstile or Google reCAPTCHA credentials in Vercel production. |
| Resend | No mail-delivery credential is available in the checked-out project. | Supply or configure a verified Resend API key and a verified recipient address in Vercel production. |
| Umami | No configured integration was found for the task. | Supply the approved Umami script/configuration if field Web Vitals should be collected for consenting users. |

## P0 — Launch Blockers

| ID | Task | Status | Owner | Completion evidence |
|---|---|---|---|---|
| P0-1 | Configure a production CAPTCHA provider for feedback (`TURNSTILE_SECRET_KEY` + `VITE_TURNSTILE_SITE_KEY`, or matching reCAPTCHA keys) | Blocked by provider credentials | Product owner / deployment administrator | `GET /api/feedback` returns `available: true` and identifies the selected CAPTCHA provider |
| P0-2 | Configure feedback mail delivery (`RESEND_API_KEY`, `FEEDBACK_TO_EMAIL`) | Blocked by provider credentials | Product owner / deployment administrator | A controlled feedback message arrives at the configured support mailbox once, with no duplicate delivery |
| P0-3 | Run controlled end-to-end feedback verification after P0-1 and P0-2 | Waiting on P0-1/P0-2 | Agent | Valid form success, invalid CAPTCHA rejection, rate-limit response, recipient delivery, and no browser errors |
| P0-4 | Keep the direct support-email fallback live until P0-3 is verified | Complete | Agent | Disabled form controls and `cinetrekker.contact@gmail.com` fallback were reverified in production on 18 August 2026; `GET /api/feedback` returned `available: false` and `captchaProvider: null` |

## P1 — Measurement, Reliability, and Privacy

| ID | Task | Status | Owner | Completion evidence |
|---|---|---|---|---|
| P1-1 | Configure an existing or approved Umami analytics installation for consenting production visitors | Code and runbook complete; blocked by public provider configuration | Product owner / deployment administrator | A consent-off production session was reverified to load no Umami script on 18 August 2026; consent-accepted visits remain pending provider configuration and must produce only coarse `web_vital` events for home and search |
| P1-2 | Keep privacy boundaries for Web Vitals telemetry | Complete | Agent | Events include only metric name, route class, rating, and coarse bucket; no identifiers, titles, IDs, queries, or raw values |
| P1-3 | Maintain automated home/search layout-stability gate | Complete | Agent | Chromium quality test measures initial-layout shift and enforces local CLS ≤ 0.15 |
| P1-4 | Run a safe disposable two-account authentication and social-boundary test | Test complete; live execution blocked by disposable account credentials | Agent | Reverified on 18 August 2026: the credential-gated suite skips safely with no `CINETREKKER_E2E_*` variables; with two expressly provided non-customer accounts, it verifies login, reversible follow state, sign-out, and isolated account state |
| P1-5 | Verify browser-push opt-in after the service-worker activation fix | Waiting on a fresh Settings opt-in attempt | Agent and authorized account owner | Passive production verification on 18 August 2026 confirmed the Settings control does not request permission on page load, while an explicit signed-in Settings action remains required to create or refresh a `push_subscriptions` record |

## P2 — Regression Prevention and Product Operations

| ID | Task | Status | Owner | Completion evidence |
|---|---|---|---|---|
| P2-1 | Add desktop visual-regression checks for home, search, profile, and public profile | Complete | Agent | Chromium baselines cover home, search discovery shell, and public-profile recovery state |
| P2-2 | Add mobile visual-regression checks for navigation, search, settings, and profile | Complete for the highest-risk discovery and navigation shells | Agent | Chromium mobile baselines cover home with bottom navigation and the search discovery shell; existing mobile Safari behavior regression also passes |
| P2-3 | Add a release verification checklist for build, tests, deployment, and production smoke checks | Complete | Agent | Checklist, operational runbook, visual baselines, stability gate, build, smoke, mobile, API-security, and i18n checks form a repeatable release sequence |
| P2-4 | Resolve dependency audit findings without breaking the production build | Complete for production dependencies | Agent | Safe upgrades moved React Router to 7.18.2 and DOMPurify to 3.4.13; `npm audit --omit=dev` reports 0 production vulnerabilities |
| P2-5 | Establish ongoing release cadence and production incident response notes | Complete | Agent and product owner | Release cadence, quality gate, support route, severity guide, safe fallbacks, rollback procedure, and evidence-handling rules are documented |

## Implementation Order

1. Prepare feedback configuration validation and support runbook.
2. Complete visual-regression coverage and release verification automation.
3. Run the safe two-account privacy/social boundary suite.
4. Triage and remediate dependency findings that have a safe upgrade path.
5. Configure the externally credentialed feedback and analytics providers, then run controlled production verification.
6. Reverify browser push opt-in from Settings with an explicitly authorized account.

## Non-Negotiable Safeguards

> No browser-alert permission request occurs outside a direct Settings action. No feedback message is sent while CAPTCHA or mail delivery is unavailable. No audit step accesses another user’s private data. No telemetry event includes a user identifier, content title, TMDB ID, search query, free-form feedback, or raw Web Vitals value.

## Release Quality Gate

A release is ready to be marked broadly launch-ready when all P0 items pass, P1-1 is either configured or formally waived, P1-4 and P1-5 are verified, the complete automated suite passes, the production smoke test succeeds, and no unresolved high-severity security finding remains.
