# CineTrekker Launch-Readiness Implementation Backlog

**Goal:** Convert the launch-readiness audit into a verified release program without altering existing user watch history, ratings, watchlists, profiles, privacy controls, follows, or notification state.

## P0 — Reliability, performance, and scale foundations

- [x] **OBS-01 — Production error reporting:** Add a privacy-scrubbed client/server error-reporting adapter with request/reference correlation, release tags, safe failure behavior, and automated coverage. Source surfaces: `src/lib/logger.ts`, `src/components/ErrorBoundary.tsx`, `api/_lib/logger.js`.
- [x] **OBS-02 — Health and operational visibility:** Add authenticated health/readiness endpoints and a public status/help surface that does not expose secrets. Include tests for dependency degradation and recovery messaging. Source surfaces: `api/`, `src/pages/`.
- [x] **PERF-01 — Initial bundle budget:** Introduce a repeatable asset-budget check and defer nonessential visualization/motion work from initial routes. Source surfaces: `vite.config.ts`, route imports, chart modules, CI tests.
- [x] **PERF-02 — Loading quality:** Replace generic full-page loading where appropriate with page-specific, stable skeletons and add “time to useful content” test coverage for major authenticated pages.
- [x] **BROWSER-01 — Mobile and WebKit stability:** Synchronize stale mobile contracts, isolate Safari carousel/route coverage, add cross-browser baseline policy, and make the intentional symmetric-gutter behavior explicit in tests.
- [x] **DATA-01 — Watched-history filter correctness:** Reproduce and repair the range-state ambiguity; add regression coverage for range/filter display and query results.
- [x] **NOTIFY-01 — Preference enforcement:** Ensure notification generation honors per-user category and frequency preferences before inserting inbox rows.
- [x] **NOTIFY-02 — Scalable worker execution:** Replace unbounded follower loading with cursor-driven work units, deterministic batch limits, durable run checkpoints, idempotency, and job telemetry while retaining the existing secure scheduled endpoint.
- [x] **NOTIFY-03 — Retention and compaction:** Add safe archival/expiry rules and title-level grouping metadata so repeated/superseded alerts do not produce an endless inbox.

## P1 — Premium everyday product experience

- [x] **UX-01 — Watchlist hierarchy:** Prioritize one next-best action, demote bulk/advanced management, consolidate duplicated metrics, and make nudges dismissible or snoozable.
- [x] **UX-02 — Notification center:** Group related alerts, display a concise current-state summary, provide purposeful bulk/archive actions, and move destructive per-row controls behind deliberate interaction.
- [x] **UX-03 — Profile management:** Replace always-visible favorite-removal actions with edit/contextual controls and add clearer explanatory copy for Taste & Stats methodology.
- [x] **UX-04 — Calendar hierarchy and trust:** Establish a single contextual primary action, simplify competing controls, and show data freshness/time-zone context.
- [x] **UX-05 — Statistics insight layer:** Add an understandable headline insight, methodology/help affordance, and action-oriented next step ahead of detailed charts.
- [x] **A11Y-01 — WCAG 2.2 workflow:** Add automated target-size, focus, reduced-motion, keyboard, RTL, and zoom/reflow coverage; record remaining manual assistive-technology validation as an external release dependency.
- [x] **I18N-01 — Dynamic content clarity:** Explain provider metadata language behavior and ensure all new interface copy has strict locale parity.

## P2 — Trust, measurement, and commercial foundations

- [x] **ANALYTICS-01 — Privacy-preserving metric contract:** Extend aggregate event taxonomy for activation, retention, feature adoption, notification effectiveness, reliability, and performance without collecting titles, IDs, search text, or personal identifiers.
- [x] **ANALYTICS-02 — Measurement methodology:** Publish a plain-language metrics and data-coverage methodology page plus consent coverage diagnostics.
- [x] **TRUST-01 — Trust center:** Add concise security, privacy, data-retention, accessibility, support, and service-status entry points.
- [x] **SEO-01 — Crawl semantics:** Add crawler-safe not-found handling, dynamic metadata checks, and sitemap/robots regression coverage.
- [x] **SEC-01 — CSP hardening:** Tighten overly broad CSP directives where implementation-compatible, add reporting configuration, and preserve required integrations.
- [x] **SPONSOR-01 — Sponsor readiness:** Add transparent media-kit, sponsorship-labeling, suitability, placement, and reporting-methodology pages. Do not enable advertisements or make audience guarantees.

## P3 — External evidence and governance required before large-scale commercial launch

- [ ] **DEPLOY-EXT-01 — Apply notification-scale migration:** Apply `supabase/migrations/20260824190000_notification_scale_and_retention.sql` through the approved Supabase production process before, or atomically with, the notification API/frontend release. Use `supabase/NOTIFICATION_SCALE_DEPLOYMENT_RUNBOOK.md` for schema-only verification. As of 2026-08-24, read-only probes confirm the new worker-state table and server-only batch RPC are not yet present in production.
- [ ] **OPS-EXT-01 — Production operations evidence:** Verify production secret inventory/rotation, Upstash connectivity, Supabase backup-and-restore drill, cron-health alert routing, quotas, and ownership. Requires deployment-console access and/or operator confirmation.
- [ ] **A11Y-EXT-01 — Human accessibility validation:** Perform independent keyboard, screen-reader, zoom/reflow, and assistive-technology evaluation.
- [ ] **LEGAL-EXT-01 — Legal/commercial review:** Obtain qualified review of privacy, data retention, sponsor contracts, labeling, and regional obligations before commercial rollout.
- [ ] **SPONSOR-EXT-01 — Commercial governance:** Establish partner approval, brand suitability review, campaign reporting sign-off, and an accountable commercial owner before accepting sponsor commitments.

## Verified release evidence — 2026-08-24

The source-level backlog above has passed the full GitHub Release Quality Gate on commits `336cb12` and `a10a6e7`. The stabilized functional desktop matrix passed with 129 checks in Chromium, Firefox, and WebKit; one explicitly skipped authenticated social-boundary test remains per engine. Chromium is the only reviewed visual-baseline engine; generated Firefox/WebKit snapshots are intentionally not adopted. The public health endpoint returned HTTP 200 with coarse healthy dependency indicators, while public status, trust, measurement, and partnership routes returned HTTP 200 during read-only production checks.

## Completion rules

Every implemented item must include appropriate tests, locale coverage, responsive/RTL review, `git diff --check`, and the full quality gate before release. Database work must be additive/idempotent and must never mutate existing user records as part of deployment. Items marked `EXT` require real production-console access, independent human review, or legal/commercial decisions; they are tracked but cannot truthfully be completed by source-code changes alone.
