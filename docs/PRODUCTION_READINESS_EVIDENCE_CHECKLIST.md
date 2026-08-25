# CineTrekker Production-Readiness Evidence Checklist

## Purpose

This checklist records the **evidence** required to close production operations gates without placing credentials, raw user data, or private provider logs in the repository. It supplements the incident, observability, backup, and notification migration runbooks; it does not replace their technical procedures. The prioritized execution plan for a broad launch is maintained in [`docs/THOUSANDS_USER_LAUNCH_TODO.md`](THOUSANDS_USER_LAUNCH_TODO.md).

> **Safety boundary:** Do not paste API keys, service-role keys, OAuth secrets, database dumps, email addresses, IP addresses, profile records, watch history, ratings, watchlists, or notification content into this document. Record only an owner, date, provider console location, coarse outcome, and a safe reference link or ticket identifier.

## Current State

| Gate | Current status | Required evidence to close | Owner-controlled action |
|---|---|---|---|
| Notification-scale schema | Complete on 2026-08-24 | Migration applied as one transaction; schema-only verification confirmed three notification columns, worker-state table, server-only `DEFINER` RPC, and no `anon` or `authenticated` execute permission | Continue routine operational observation; do not invoke the worker solely as a deployment test. |
| Production secret inventory | Not verified in this repository | Dated secret inventory review, rotation owner, and next-review date; no secret values | Review Vercel, Supabase, Upstash, TMDB, Google OAuth, and alert-webhook configuration in their owner consoles. |
| Alert routing | Not verified in this repository | Test alert receipt for a non-sensitive provider test event or documented dry-run; destination owner and escalation path | Configure and verify Vercel 5xx, security webhook, Supabase Auth, Upstash, and independent uptime alert routing. |
| Backup and recovery | Not verified in this repository | Date, operator, isolated restore target, coarse success/failure, recovery duration, and follow-up item | Complete a non-production backup/restore drill; never restore a production dump into a shared environment. |
| Quotas and billing protections | Not verified in this repository | Dated review of provider quotas, spending limits, and responsible owner | Review Vercel, Supabase, Upstash, TMDB, and email/push providers. |
| Human accessibility review | Not verified in this repository | Reviewer, assistive technologies, viewport/zoom coverage, findings, remediation owner, and follow-up date | Run independent keyboard, screen-reader, zoom/reflow, and reduced-motion review. |
| Legal and commercial governance | Not verified in this repository | Qualified reviewer, decision date, approved markets/terms, commercial owner, and next-review date | Obtain professional review before sponsorship, advertising, or large-scale commercial rollout. |

## Current Read-Only Evidence

The following checks are safe public observations, not a substitute for owner-controlled evidence or a completed migration.

| Date (UTC) | Scope | Coarse result | Boundary |
|---|---|---|---|
| 2026-08-24 | `GET /api/health` | HTTP 200; database, content provider, scheduled jobs, and rate limiting reported healthy | Public, read-only health response; no user records queried. |
| 2026-08-24 | Public routes | `/status`, `/trust`, `/measurement`, `/partnerships`, and `/notifications` returned HTTP 200 | Public, read-only route checks only. |
| 2026-08-24 | Notification migration | Applied successfully through a fresh owner-authenticated Supabase Dashboard session after project identity verification | The complete migration ran once as a SQL Editor batch. Schema-only verification passed; no worker invocation, user notification action, or user-data mutation occurred. The migration’s intended operational checkpoint was the only inserted row. |
| 2026-08-25 | Vercel operations access | Partial read-only review completed in the verified `cinetrekker` production project; current deployment was Ready, recent observability showed 0% function error and 0% timeout, and the signed-in team member was visibly `Owner` | Private Vercel owner-console reference: project Overview, Deployments, Logs, Observability, Alerts, Usage, and Team Settings > Billing/Members. No secrets, raw logs, request bodies, email addresses, or settings were recorded. Vercel anomaly alerts were not available on the active Hobby plan and no alert destination was visible. | Owner to complete secret inventory, alert delivery, cross-provider quota/spend review, and backup drill; review by 2026-11-25. |
| 2026-08-25 | Read-only public readiness probe | Passed — `/api/health` returned HTTP 200 with all four coarse dependencies healthy, and `/status`, `/notifications`, `/trust`, `/measurement`, and `/partnerships` returned HTTP 200 | Command: `npm run readiness:public`; no response bodies, user records, or generated artifacts were stored | Re-run before each broad-release promotion and after material infrastructure changes; next review 2026-11-25. |

## Evidence Record Template

Add one record per completed external activity. Keep references private if they reveal organization or personal information.

| Date (UTC) | Gate | Operator/owner | Coarse outcome | Safe evidence reference | Follow-up / due date |
|---|---|---|---|---|---|
| 2026-08-25 | Vercel production operations | Vercel team/project owner | Partial — deployment and coarse health/usage evidence visible; alert rules/destinations unavailable or not shown on Hobby; no configuration changed | Private Vercel owner console: `cinetrekker` Overview, Deployments, Logs, Observability, Alerts, Usage, Team Settings > Billing/Members | Owner-only secret inventory, alert test/delivery, quota/spend safeguards, and isolated recovery drill; next review 2026-11-25. |
| _YYYY-MM-DD_ | _Example: backup and recovery_ | _Role, not a secret_ | _Passed / failed / partial_ | _Private ticket or console artifact reference_ | _Action and date_ |

## Approved Read-Only Post-Change Checks

After an owner-controlled infrastructure change, use only the relevant documented read-only validation path.

| Change | Safe verification | Do not do during verification |
|---|---|---|
| Notification migration | Run the schema-only SQL in `supabase/NOTIFICATION_SCALE_DEPLOYMENT_RUNBOOK.md`; load `/api/health`, `/status`, `/notifications` as guest, `/trust`, `/measurement`, and `/partnerships` | Do not run the scheduled worker; do not archive, mark read, follow, save, rate, or alter a profile. |
| Vercel configuration | Confirm current deployment health, public status route, and function logs using safe request identifiers | Do not expose environment values or copy request bodies into evidence. |
| Backup drill | Restore only into an isolated non-production target and inspect a deliberately created test record | Do not restore into production or use a real user’s records as drill data. |
| Alert routing | Use a provider’s documented test/dry-run mechanism where available and record only coarse receipt | Do not induce a production failure or send user information to an alert channel. |

## Review Cadence

The owner should review secret inventory, alert routing, quotas, and provider status at least quarterly and after a material infrastructure change. A backup-and-recovery drill should be performed at least quarterly in an isolated environment. Any failed drill or alert test remains open until its corrective action is verified.

## Related Runbooks

- `docs/PRODUCTION_OBSERVABILITY_RUNBOOK.md`
- `docs/INCIDENT_RESPONSE.md`
- `docs/BACKUP_AND_RECOVERY_PLAN.md`
- `docs/RELEASE_AND_INCIDENT_OPERATIONS.md`
- `supabase/NOTIFICATION_SCALE_DEPLOYMENT_RUNBOOK.md`
- `LAUNCH_READINESS_TODO.md`
