# CineTrekker Launch TODO for Thousands of Users

**Purpose:** This is the execution checklist for moving CineTrekker from a technically deployable application to a controlled, observable, supportable release for thousands of users. It deliberately separates repository work from actions that require the project owner, an independent reviewer, or a qualified professional. No task authorizes production configuration changes, billing changes, credential handling, user-data mutation, or a production load test.

## Launch decision rule

CineTrekker may receive a controlled public release while the automated quality gate remains green and the production health surface is healthy. **Broad promotion to thousands of users is gated** until every P0 gate below has dated evidence and an accountable owner. A green build is necessary but does not prove capacity, recovery, alert delivery, legal approval, or human accessibility quality.

| Status | Meaning |
|---|---|
| **Complete** | Evidence exists in the repository or in a safe private console record. |
| **Implement** | Repository-side work can be completed without production credentials, user data, billing, or irreversible changes. |
| **Owner-only** | Requires a real provider console, secret inventory, account owner, independent reviewer, recovery target, or qualified professional. |
| **Blocked** | Cannot be honestly closed from source code or this session. |

## Baseline already complete

- [x] Supabase notification-scale migration applied once as an additive, idempotent SQL Editor batch; schema-only checks passed; no worker invocation or user-data test mutation was performed.
- [x] Public production health and status checks passed for `/api/health`, `/status`, `/notifications`, `/trust`, `/measurement`, and `/partnerships`.
- [x] Vercel production project identity verified; current production deployment was Ready; coarse observability showed 0% function errors and 0% timeouts in the inspected window.
- [x] `npm run test:ci`, `npm run test:unit`, `npm run test:smoke`, and `npm run build` passed locally after installing the locked test browser prerequisite.
- [x] GitHub Release Quality Gate passed for the readiness evidence commit.
- [x] Automated accessibility, localization, privacy, security, responsive, RTL, and cross-browser coverage is present in the repository and included in the release gate.
- [x] A public-readiness probe is implemented in this change. It performs only read-only HTTP checks and never writes reports, sends alerts, or queries user data.

## P0 — Must close before broad traffic promotion

### P0.1 Production ownership and secrets — Owner-only

- [ ] Review Vercel, Supabase, Upstash, TMDB, Google OAuth, email/push, and alert-provider secret inventories in their owner consoles.
- [ ] Assign a named **role** for every credential family, define rotation cadence, and record the next review date in the evidence checklist. Do not record secret values, full emails, tokens, or private console screenshots in Git.
- [ ] Verify production and preview environments are intentionally separated and that service-role credentials are server-only.
- [ ] Confirm disabled, obsolete, preview-only, and emergency credentials are removed or rotated according to the owner’s policy.

**Acceptance evidence:** dated inventory review, accountable role, rotation policy, next-review date, and a safe private console/ticket reference.

### P0.2 Alert delivery and incident response — Owner-only

- [ ] Choose accountable destinations for Vercel function/5xx failures, security/rate-limit events, Supabase Auth/OAuth failures, Upstash reachability, and independent uptime monitoring.
- [ ] Configure alert thresholds, severity, escalation, quiet hours, and an on-call backup in the provider consoles.
- [ ] Use each provider’s documented non-sensitive test or dry-run mechanism. Do not induce a production failure and do not send user information to an alert channel.
- [ ] Confirm the alert is received by the accountable destination and record only date, provider, coarse event type, outcome, and safe reference.
- [ ] Review the incident runbook and confirm that request IDs, endpoint scope, HTTP status, and aggregate failure volume are the only routine diagnostics shared outside private logs.

**Acceptance evidence:** destination owner, safe dry-run receipt, escalation path, and next review date. Vercel’s current Hobby plan does not expose the anomaly-alert feature; the owner must choose an approved alternative or an appropriately authorized plan decision.

### P0.3 Quotas, capacity, and spending safeguards — Owner-only plus staging validation

- [ ] Review limits and current headroom for Vercel requests/functions/transfer/builds, Supabase database connections/storage/Auth, Upstash commands and bandwidth, TMDB requests, email/push delivery, and independent monitoring.
- [ ] Define warning and stop/escalation thresholds for each provider and assign an owner.
- [ ] Confirm billing protections, payment-method policy, auto-reload state, spending caps, and upgrade approval path. The current Vercel observation showed Hobby, no payment method, `$0.00` AI Gateway balance, and auto-reload Off; this is not a cross-provider safeguard.
- [ ] Run an authorized, non-destructive load and dependency-degradation test against staging or an isolated environment. Measure p95/p99 latency, error rate, database saturation, connection usage, cache behavior, rate-limit behavior, and recovery time.
- [ ] Test rate limiting and backpressure with synthetic identifiers only. Do not load-test production without separate explicit authorization and a provider-approved plan.

**Acceptance evidence:** dated quota table, thresholds, escalation owner, staging load report, and no production user-data mutation.

### P0.4 Backup and recovery — Owner-only

- [ ] Confirm Supabase backup cadence, retention, PITR availability, recovery window, and restore constraints in the project console.
- [ ] Create or use an approved non-personal fixture in an isolated non-production target.
- [ ] Restore through the approved provider path, verify the fixture, measure recovery duration, and remove or retain the isolated target according to policy.
- [ ] Record only operator role, date, isolated target class, coarse pass/fail, duration, and follow-up action.

**Acceptance evidence:** isolated recovery drill record and next quarterly drill date. Never restore a production dump into production or a shared environment.

### P0.5 First scheduled notification observation — Owner-only

- [ ] Allow the normal scheduled worker to run after deployment; do not invoke it manually as a smoke test.
- [ ] Review only coarse telemetry: `processedTitles`, `notificationsCreated`, `errors`, `cursorReset`, and `hasNextPage`.
- [ ] Investigate failures through private logs and request identifiers without copying notification contents, titles, profiles, or account identifiers into reports.

**Acceptance evidence:** coarse first-run observation with no notification content and no manual worker invocation.

## P1 — Required before active growth marketing

### P1.1 Release, rollback, and on-call operations — Implement and owner sign-off

- [x] Keep the release workflow gated on security checks, dependency audit, build, unit, analytics privacy, smoke, mobile, and discovery/visual checks.
- [x] Keep `git diff --check` and generated-file exclusion rules in the release procedure.
- [x] Provide a public read-only readiness probe for health and public routes.
- [ ] Define release owner, approval window, freeze rules, rollback criteria, database forward-compatibility policy, and escalation coverage.
- [ ] Perform a non-production rollback rehearsal and record recovery duration.
- [ ] Establish a support/on-call rota, severity levels, response targets, status-page owner, and incident communications template.

### P1.2 Security and abuse-resilience review — Implement plus independent review

- [x] Preserve automated coverage for RLS boundaries, cron authentication, OAuth callback handling, CSP, request references, consent gating, and sanitized errors.
- [ ] Perform an independent review of OAuth redirect allowlists, service-role isolation, webhook authentication, cron authentication, rate limiting, abuse controls, dependency advisories, and public API exposure.
- [ ] Review failed-login, rate-limit, and upstream-failure behavior under synthetic traffic in staging.
- [ ] Confirm security alerts have an accountable recipient and documented escalation.

### P1.3 Accessibility — Independent reviewer required

- [x] Retain automated keyboard, focus, touch-target, reduced-motion, RTL, zoom/reflow, mobile/desktop, and cross-browser tests.
- [ ] Independently test global navigation, discovery, details/tracking, home/retention, lists/calendar, profile/privacy/settings, and notifications with keyboard-only navigation and at least one screen reader on desktop and mobile.
- [ ] Record device, browser, assistive technology, zoom, locale, severity, reproducible route, remediation owner, and retest result.

### P1.4 Native-language review — Native reviewers required

- [x] Retain strict locale-key parity and automated localization coverage for English, Arabic, French, Turkish, Spanish, and German.
- [ ] Have native reviewers assess home, search, details, watchlist, calendar, notifications, settings, profile, privacy, trust, and measurement.
- [ ] Check meaning, grammar, tone, truncation, pluralization, provider metadata language, operational English fallbacks, and Arabic RTL quality.

### P1.5 Legal, privacy, and commercial governance — Qualified reviewers required

- [ ] Obtain qualified review of privacy, cookies, measurement, retention, deletion/export, regional consumer obligations, accessibility statements, and terms.
- [ ] Before sponsorship or advertising, approve partner suitability, placement labeling, audience-data boundaries, reporting assumptions, escalation, and an accountable commercial owner.
- [ ] Do not claim audience outcomes or enable advertising until approval evidence is recorded.

## P2 — Launch operations after the gates close

- [ ] Start with a controlled rollout and define an explicit promotion threshold based on error rate, latency, support volume, and provider headroom.
- [ ] Review health, alert, quota, and support dashboards daily during the first week, then weekly until traffic stabilizes.
- [ ] Review real-user LCP/CLS and error rates at the 75th percentile on mobile and desktop after traffic exists; lab tests are not a substitute for field data.
- [ ] Review notification-worker coarse telemetry after every scheduled run during the initial observation period; never include notification contents.
- [ ] Conduct quarterly secret, alert, quota, backup/recovery, accessibility, localization, and legal/commercial reviews or sooner after material infrastructure changes.

## Evidence-record requirements

Every closed external gate must add one coarse, non-sensitive row to `docs/PRODUCTION_READINESS_EVIDENCE_CHECKLIST.md` with the date, gate, operator/owner role, pass/fail/partial outcome, safe private reference, follow-up owner, and next review date. Never commit credentials, raw logs, request bodies, email addresses, user records, notification contents, database dumps, or generated test artifacts.

## Final release gate

The launch owner may mark CineTrekker **broad-release ready** only when all P0 sections have dated acceptance evidence, the P1 rollback/security/support decisions are signed off, and the automated Release Quality Gate is green for the exact release commit. If any owner-only item is open, the honest status is **controlled release only**.
