# CineTrekker Launch-Readiness Checklist

This checklist is the source of truth for remaining launch work. Items are ordered by dependency and business risk. A checked item is complete; an in-progress item is actively being worked; blocked items require a user action or explicit authorization.

## 1. Local Consolidation and Quality Gate

- [ ] **L1 — Apply the validated patches to the Windows checkout.** Apply Batch A through Batch G in order, then apply the independent visual and profile patches that are not already present in the Windows working tree.
- [ ] **L2 — Resolve Windows patch conflicts without overwriting the existing Details, Continue Watching, or Menu improvements.**
- [ ] **L3 — Run the full local quality gate.** Required commands are lint, type-check, strict i18n verification, security tests, unit tests, build, and relevant browser smoke tests.
- [ ] **L4 — Create one clean Git commit using `mohamed <mohamed.jebahi21@gmail.com>`.**

## 2. Production Dependencies and Data Readiness

- [ ] **P1 — Repair production Upstash Redis configuration in Vercel.** Valid `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are mandatory before Batch A is deployed because the production rate limiter fails closed.
- [ ] **P2 — Verify the Upstash failure path and normal protected-endpoint behavior after configuration is corrected.**
- [ ] **P3 — Apply `20260814190000_add_public_social_profile_rpc.sql` in Supabase.** This enables the pending People directory, public social-profile summaries, connection data, and social counts.
- [ ] **P4 — Verify the social migration with authenticated and anonymous read paths, plus follow/comment behavior.**
- [x] **P5 — Configure Google OAuth.** The provider is enabled and both production and localhost end-to-end sign-in paths were verified.
- [ ] **P6 — Confirm Google OAuth audience readiness.** Add testers if the consent screen remains in testing, or publish only after branding and privacy-policy content are final. Revoke unused OAuth client secrets.

## 3. Deployment and Production Acceptance

- [ ] **D1 — Push the consolidated commit to the configured GitHub repository.**
- [ ] **D2 — Deploy to Vercel only after P1 and P2 are complete.**
- [ ] **D3 — Verify the production deployment version and static asset routing.**
- [ ] **D4 — Run the complete production acceptance matrix.** Cover fresh email registration, Google sign-in, logout/login, direct content tabs, discovery, search, Details, watchlist, watched status, progress, Continue Watching, comments, follows, profile visibility, mobile navigation, and offline/retry behavior.
- [ ] **D5 — Confirm request-reference behavior.** A protected API error should return `X-Request-Id`; a TMDB-backed failure should show a safe visible reference after Batch F and G are live.

## 4. Monitoring and Incident Operations

- [ ] **O1 — Configure Vercel alerts for sustained function 5xx rates.**
- [ ] **O2 — Configure Upstash reachability and error-rate monitoring.**
- [ ] **O3 — Configure Supabase Auth monitoring for sign-up and OAuth callback failures.**
- [ ] **O4 — Configure uptime checks for the public home page and a low-cost health path.**
- [ ] **O5 — Optionally configure `SECURITY_ALERT_WEBHOOK_URL` for throttled security events.**
- [x] **O6 — Publish the internal observability runbook.** See `docs/PRODUCTION_OBSERVABILITY_RUNBOOK.md`.
- [ ] **O7 — Assign incident ownership and test the first-response procedure.**

## 5. Product and Maintainability Follow-Up

- [ ] **M1 — Finish social rollout after P3 and P4.** Enable People, public profiles, social counts, follows, activity, comment replies, friend suggestions, and meaningful empty states.
- [ ] **M2 — Continue the staged Profile architecture refactor.** The identity hero is extracted; remaining Profile sections should move into focused components and hooks.
- [ ] **M3 — Add privacy-conscious product analytics.** Track onboarding CTA intent, account completion, first saved title, first progress update, and return engagement without recording sensitive content.
- [ ] **M4 — Add comment moderation and support operations.** Define reporting, review, removal, and escalation behavior before broad public social release.
- [ ] **M5 — Complete legal and recovery readiness.** Verify privacy-policy accuracy, comment policy, support contact, backup/recovery process, and staged rollout plan.

## Completed Local Batches

| Batch | Scope | Status |
|---|---|---|
| A | Security and correctness; production fail-closed limiter | Validated patch ready |
| B | Data contracts; typed discover and social/profile boundaries | Validated patch ready |
| C | First-run guest-to-account experience | Validated patch ready |
| D | Return engagement in Continue Watching | Validated patch ready |
| E | Google OAuth client and callback hardening | Validated patch ready; remote provider enabled |
| F | API correlation, client error references, and observability runbook | Validated patch ready |
| G | User-facing API request-reference propagation | Validated patch ready |

## Working Rules

1. Do not deploy Batch A until production Upstash Redis is healthy.
2. Do not apply the Supabase social RPC migration, change Vercel, change OAuth, or push/deploy without the required explicit authorization at that stage.
3. Do not commit provider secrets, tokens, OAuth callback fragments, or user data.
4. Update this checklist when an item is completed, blocked, superseded, or split into a smaller task.
