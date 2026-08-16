# CineTrekker Launch-Readiness Checklist

> **Last reconciled:** 15 August 2026. This checklist separates completed production work from remaining account-level, authenticated-flow, and operating-process work. The released `main` baseline is `b15ee2b`; this reconciliation is documented in the next pending documentation commit. `docs/SOCIAL_ACCEPTANCE_TEST_2026-08-15.md`, `docs/DEPENDENCY_MONITORING_ASSESSMENT_2026-08-15.md`, `docs/MODERATION_PROCEDURES.md`, `docs/PRIVACY_CONSCIOUS_ANALYTICS_PLAN.md`, and `docs/WINDOWS_CHECKOUT_SYNC.md` are the current operational evidence.

## 1. Source Control and Local Development Alignment

- [x] **L1 — Consolidate the validated launch hardening into GitHub `main`.** Batches A–G, the Continue Watching return summary, the Profile identity-hero refactor, the social migration, and the production remediation fixes are committed and pushed.
- [ ] **L2 — Synchronize the Windows checkout with GitHub `main`.** This remains a user-executed task because the Windows filesystem is outside the sandbox. The safe preflight, pull, and validation commands are documented in `docs/WINDOWS_CHECKOUT_SYNC.md`; preserve any local-only work before pulling.
- [ ] **L3 — Run the full quality gate on the synchronized Windows checkout.** Run lint, type-check, i18n verification, security tests, unit tests, build, and relevant browser smoke tests after local synchronization.
- [x] **L4 — Create clean commits with `mohamed <mohamed.jebahi21@gmail.com>`.** The production-release commits use the required author identity.

## 2. Production Dependencies and Data Readiness

- [x] **P1 — Repair production Redis rate-limiting.** A managed Upstash Redis database is provisioned through Vercel for Production and Preview. The server prefers its managed REST aliases while retaining the legacy variable fallback; no provider secrets were copied into code or logs.
- [x] **P2 — Verify normal and fail-closed protected-endpoint behavior.** The public TMDB proxy returned HTTP 200 with an `X-Request-Id` after remediation, and the browser homepage loaded real discovery content.
- [x] **P3 — Apply `20260814190000_add_public_social_profile_rpc.sql` in Supabase.** The production migration was corrected for the existing comments schema and verified read-only after execution.
- [x] **P4 — Complete authenticated social-mutation acceptance testing.** Controlled production checks passed for follow/unfollow, comment creation, and reply-composer opening. The like-count anomaly (`0 → 2 → 0`) was diagnosed as redundant database triggers and an inverted optimistic UI update; both were fixed and verified. All temporary test data was removed and verified at zero. Recipient notifications still require an approved trusted creator. See `docs/SOCIAL_ACCEPTANCE_TEST_2026-08-15.md`.
- [x] **P5 — Configure Google OAuth.** The provider is enabled and production and localhost sign-in paths were verified previously.
- [x] **P6 — Publish the Google OAuth audience.** The consent audience is **External** and publishing status is **In production**; public Google-account users are no longer limited to a test-user list. The Google Verification Center confirms no data-access verification is required for the identity-only scope set. A separate branding-verification notice remains and may affect the consent experience; inspect and submit that process only with explicit approval. See `docs/GOOGLE_OAUTH_AUDIENCE_REVIEW_2026-08-15.md`.

## 3. Deployment and Production Acceptance

- [x] **D1 — Push the consolidated release to GitHub.** The production branch contains the validated hardening and remediation commits.
- [x] **D2 — Deploy after Redis remediation.** Vercel successfully deployed the rate-limit compatibility and same-origin request-policy fixes.
- [x] **D3 — Verify production deployment and direct-route behavior.** Production home, direct movie route, and static SPA routing rendered successfully.
- [ ] **D4 — Complete the authenticated production acceptance matrix.** The guest journey, discovery, direct Details route, People directory, public profile route, registration, email sign-in, Google sign-in, logout/login, watchlist persistence, watched status, progress, Continue Watching, follow/unfollow, and comment creation are verified. Reply submission remains unproven and the like counter requires investigation after the controlled `0 → 2 → 0` result. Mobile navigation and offline/retry behaviour also remain to be tested with a stable designated-account session and explicit approval for any writes.
- [x] **D5 — Confirm safe request-reference behavior.** The TMDB proxy emitted `X-Request-Id`, and the client rendered a safe visible reference during the diagnosed Fresh Discovery failure.

## 4. Monitoring and Incident Operations

- [ ] **O1 — Configure automated Vercel function alerts.** Blocked by the current Hobby-plan limitation: Vercel Alerts requires Pro. Do not upgrade without a separate user decision.
- [ ] **O2 — Configure Upstash reachability and error-rate monitoring.** A read-only assessment now documents console metrics, code-level fail-closed behaviour, a review cadence, and approval-gated alerting options in `docs/DEPENDENCY_MONITORING_ASSESSMENT_2026-08-15.md`. Automated provider alerting is not configured.
- [ ] **O3 — Configure Supabase Auth monitoring.** A read-only assessment verified the Auth Logs view and documents a launch review procedure in `docs/DEPENDENCY_MONITORING_ASSESSMENT_2026-08-15.md`. Provider-level alerts, audit-log database storage, and log draining remain approval-gated.
- [x] **O4 — Configure independent uptime checks.** Two approved UptimeRobot monitors for the public home page and cache-friendly discovery proxy are active and currently report Up; owner dashboard evidence showed 2 Up / 0 Down. The provider’s free-plan five-minute cadence is active. Optional monitor naming and alert-noise tuning remain dashboard-maintenance tasks. See `docs/UPTIME_MONITORING_RECOMMENDATION_2026-08-15.md`.
- [ ] **O5 — Optionally configure `SECURITY_ALERT_WEBHOOK_URL`.** Requires an approved webhook destination and explicit confirmation.
- [x] **O6 — Publish the incident and observability runbook.** See `docs/PRODUCTION_OBSERVABILITY_RUNBOOK.md`.
- [ ] **O7 — Assign incident ownership and test first response.** Name a primary and backup owner, then run a documented 503 or OAuth-callback drill.

## 5. Product and Maintainability Follow-Up

- [x] **M1a — Deploy the public social foundation.** People discovery, public profiles, counts, favorite titles, profile tabs, and public read RPCs are live and browser-verified.
- [x] **M1b — Complete the social interaction rollout.** The broad public-profile fallback has been removed, failures for follow/comment/reply mutations are surfaced in the UI, comment spoiler reveal is keyboard-accessible, likes refresh after completion, and signed-out commenters receive a clear sign-in path. The like-count anomaly was fixed. **Trusted notifications** for follows and comment replies are now automatically generated via secure database triggers. A stable-session acceptance run for replies is the only remaining social-interaction proof.
- [ ] **M2 — Continue the staged Profile architecture refactor.** The identity hero is extracted; move remaining large Profile sections into focused components and hooks when product changes touch them.
- [x] **M3 — Add privacy-conscious product analytics.** A typed analytics wrapper (`src/lib/analytics.ts`) and event hooks for `signup_intent`, `account_created`, `first_title_saved`, and `first_progress_recorded` are implemented. The Umami script hook is present in `index.html`. Tracking remains inactive until the `VITE_ANALYTICS_ENDPOINT` environment variable is provided.
- [x] **M4 — Establish launch-stage moderation and support operations.** `docs/MODERATION_PROCEDURES.md` defines Feedback-based reporting, review/removal criteria, escalation, response targets, an appeal path, and an approval-gated copyright notice route. An in-context comment-reporting feature remains a future product task.
- [x] **M5 — Complete legal and recovery readiness.** Policy accuracy, support contact (`cinetrekker.contact@gmail.com`), and the backup/recovery process (`docs/BACKUP_AND_RECOVERY_PLAN.md`) are established. A staged rollout and rollback plan are documented in the observability runbook.

## Completed Launch Work

| Area | Completed work | Evidence |
|---|---|---|
| Security and correctness | Fail-closed production rate limiting, request correlation, client-safe errors, typed data boundaries, OAuth return-path hardening | `d2a3d90`, security suite |
| First-run and return experience | Inline guest journey, improved auth presentation, Continue Watching return summary | `d2a3d90` |
| Social foundation | Public social RPC migration, People directory, public profiles, typed service boundary, and like-count fix | `ff095ae`, `7b73cd3`, trigger verification |
| Redis remediation | Managed Upstash provisioning, managed-alias resolver, regression test | `7282880`, live proxy HTTP 200 |
| Production browser fix | Same-origin safe-read policy, direct home and Details verification | `2c2dc3a`, live browser verification |
| Incident readiness | Request references, production observability runbook, and independent five-minute uptime checks | `docs/PRODUCTION_OBSERVABILITY_RUNBOOK.md`, `d8224d4` |
| Google OAuth access | External consent application published for public Google-account access; identity-only data access exempt from scope verification | Google Auth Platform, 15 August 2026 |
| Dependency monitoring assessment | Supabase Auth Logs visibility and Upstash monitoring options assessed without provider changes | `docs/DEPENDENCY_MONITORING_ASSESSMENT_2026-08-15.md` |
| Moderation procedure | Feedback-based intake, review criteria, response targets, escalation, appeals, and legal-contact boundary documented | `docs/MODERATION_PROCEDURES.md` |
| Analytics measurement plan | Umami/Plausible comparison, minimal aggregate events, privacy contract, and approval gate documented | `docs/PRIVACY_CONSCIOUS_ANALYTICS_PLAN.md` |
| Analytics implementation | Typed wrapper and event hooks for activation funnel implemented | `b043f44`, `src/lib/analytics.ts` |
| Mobile profile stats | Movies and Episodes counts added to public profile with mobile rail | `b043f44`, `UserProfile.tsx` |
| Windows reconciliation | Safe Windows preflight, pull, and quality-gate sequence documented | `docs/WINDOWS_CHECKOUT_SYNC.md` |
| Backup and recovery plan | Supabase backup cadence, manual export procedure, and disaster recovery scenarios documented | `docs/BACKUP_AND_RECOVERY_PLAN.md` |

## Working Rules

1. Keep AI Recommendations in the **Upcoming** state unless the server-side feature flag is explicitly approved for release.
2. Do not commit provider secrets, tokens, OAuth callback fragments, or user data.
3. Use a designated test account and obtain explicit confirmation before actions that create social data, send messages, or modify user-facing content.
4. Update this checklist whenever an item is completed, blocked, superseded, or split into smaller work.
5. Treat the current Hobby-plan monitoring limitation as a known operating risk until independent uptime monitoring or an approved plan change is in place.
