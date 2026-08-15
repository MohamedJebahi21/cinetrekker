# CineTrekker Launch-Readiness Checklist

> **Last reconciled:** 15 August 2026. This checklist separates completed production work from the remaining account-level, authenticated-flow, and operating-process work. The current `main` code release is `2c2dc3a`; `840d069` records the associated remediation documentation.

## 1. Source Control and Local Development Alignment

- [x] **L1 — Consolidate the validated launch hardening into GitHub `main`.** Batches A–G, the Continue Watching return summary, the Profile identity-hero refactor, the social migration, and the production remediation fixes are committed and pushed.
- [ ] **L2 — Synchronize the Windows checkout with GitHub `main`.** This no longer blocks production, but the local Windows working tree should be backed up, rebased or freshly cloned from `main`, and reconciled with any local-only Details, Continue Watching, and Menu work.
- [ ] **L3 — Run the full quality gate on the synchronized Windows checkout.** Run lint, type-check, i18n verification, security tests, unit tests, build, and relevant browser smoke tests after local synchronization.
- [x] **L4 — Create clean commits with `mohamed <mohamed.jebahi21@gmail.com>`.** The production-release commits use the required author identity.

## 2. Production Dependencies and Data Readiness

- [x] **P1 — Repair production Redis rate-limiting.** A managed Upstash Redis database is provisioned through Vercel for Production and Preview. The server prefers its managed REST aliases while retaining the legacy variable fallback; no provider secrets were copied into code or logs.
- [x] **P2 — Verify normal and fail-closed protected-endpoint behavior.** The public TMDB proxy returned HTTP 200 with an `X-Request-Id` after remediation, and the browser homepage loaded real discovery content.
- [x] **P3 — Apply `20260814190000_add_public_social_profile_rpc.sql` in Supabase.** The production migration was corrected for the existing comments schema and verified read-only after execution.
- [ ] **P4 — Complete authenticated social-mutation acceptance testing.** Anonymous People, public-profile, counts, favorites, and comments displays are verified. Follow/unfollow and comment creation/reply testing still require a designated non-production test account and explicit confirmation before writing social data.
- [x] **P5 — Configure Google OAuth.** The provider is enabled and production and localhost sign-in paths were verified previously.
- [ ] **P6 — Confirm Google OAuth audience readiness.** Confirm whether the consent screen is published or whether the intended launch users are listed as testers; revoke unused OAuth secrets in Google Cloud.

## 3. Deployment and Production Acceptance

- [x] **D1 — Push the consolidated release to GitHub.** The production branch contains the validated hardening and remediation commits.
- [x] **D2 — Deploy after Redis remediation.** Vercel successfully deployed the rate-limit compatibility and same-origin request-policy fixes.
- [x] **D3 — Verify production deployment and direct-route behavior.** Production home, direct movie route, and static SPA routing rendered successfully.
- [ ] **D4 — Complete the authenticated production acceptance matrix.** The guest journey, discovery, direct Details route, People directory, and public profile route are verified. Registration, email sign-in, Google sign-in, logout/login, watchlist persistence, watched status, progress, Continue Watching, comment mutation, follow mutation, mobile navigation, and offline/retry behavior remain to be tested with a designated account and explicit approval for any writes.
- [x] **D5 — Confirm safe request-reference behavior.** The TMDB proxy emitted `X-Request-Id`, and the client rendered a safe visible reference during the diagnosed Fresh Discovery failure.

## 4. Monitoring and Incident Operations

- [ ] **O1 — Configure automated Vercel function alerts.** Blocked by the current Hobby-plan limitation: Vercel Alerts requires Pro. Do not upgrade without a separate user decision.
- [ ] **O2 — Configure Upstash reachability and error-rate monitoring.** The managed Upstash database is connected and its dashboard is available through Vercel; configure alerting or a documented review cadence before broad traffic growth.
- [ ] **O3 — Configure Supabase Auth monitoring.** Add a sign-up and OAuth-callback review procedure or provider-level alerts.
- [ ] **O4 — Configure independent uptime checks.** Connect an approved external uptime-monitoring account for the home page and a low-cost protected endpoint; this requires a service account or user confirmation to create one.
- [ ] **O5 — Optionally configure `SECURITY_ALERT_WEBHOOK_URL`.** Requires an approved webhook destination and explicit confirmation.
- [x] **O6 — Publish the incident and observability runbook.** See `docs/PRODUCTION_OBSERVABILITY_RUNBOOK.md`.
- [ ] **O7 — Assign incident ownership and test first response.** Name a primary and backup owner, then run a documented 503 or OAuth-callback drill.

## 5. Product and Maintainability Follow-Up

- [x] **M1a — Deploy the public social foundation.** People discovery, public profiles, counts, favorite titles, profile tabs, and public read RPCs are live and browser-verified.
- [ ] **M1b — Complete the social interaction rollout.** Test and refine authenticated follows, comments, replies, notification behavior, friend suggestions, and meaningful empty states before broad social promotion.
- [ ] **M2 — Continue the staged Profile architecture refactor.** The identity hero is extracted; move remaining large Profile sections into focused components and hooks when product changes touch them.
- [ ] **M3 — Add privacy-conscious product analytics.** Measure onboarding CTA intent, account completion, first saved title, first progress update, and return engagement without collecting sensitive content.
- [ ] **M4 — Add moderation and support operations.** Define reporting, review, removal, escalation, and response-time behavior before broad public social rollout.
- [ ] **M5 — Complete legal and recovery readiness.** Verify policy accuracy, comment policy, support contact, backup/recovery process, and a staged launch/rollback plan.

## Completed Launch Work

| Area | Completed work | Evidence |
|---|---|---|
| Security and correctness | Fail-closed production rate limiting, request correlation, client-safe errors, typed data boundaries, OAuth return-path hardening | `d2a3d90`, security suite |
| First-run and return experience | Inline guest journey, improved auth presentation, Continue Watching return summary | `d2a3d90` |
| Social foundation | Public social RPC migration, People directory, public profiles, typed service boundary | `ff095ae`, live browser verification |
| Redis remediation | Managed Upstash provisioning, managed-alias resolver, regression test | `7282880`, live proxy HTTP 200 |
| Production browser fix | Same-origin safe-read policy, direct home and Details verification | `2c2dc3a`, live browser verification |
| Incident readiness | Request references and production observability runbook | `docs/PRODUCTION_OBSERVABILITY_RUNBOOK.md` |

## Working Rules

1. Keep AI Recommendations in the **Upcoming** state unless the server-side feature flag is explicitly approved for release.
2. Do not commit provider secrets, tokens, OAuth callback fragments, or user data.
3. Use a designated test account and obtain explicit confirmation before actions that create social data, send messages, or modify user-facing content.
4. Update this checklist whenever an item is completed, blocked, superseded, or split into smaller work.
5. Treat the current Hobby-plan monitoring limitation as a known operating risk until independent uptime monitoring or an approved plan change is in place.
