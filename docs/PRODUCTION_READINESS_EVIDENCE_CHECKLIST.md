# CineTrekker Production-Readiness Evidence Checklist

## Purpose

This checklist records the **evidence** required to close production operations gates without placing credentials, raw user data, or private provider logs in the repository. It supplements the incident, observability, backup, and notification migration runbooks; it does not replace their technical procedures.

> **Safety boundary:** Do not paste API keys, service-role keys, OAuth secrets, database dumps, email addresses, IP addresses, profile records, watch history, ratings, watchlists, or notification content into this document. Record only an owner, date, provider console location, coarse outcome, and a safe reference link or ticket identifier.

## Current State

| Gate | Current status | Required evidence to close | Owner-controlled action |
|---|---|---|---|
| Notification-scale schema | Blocked by unavailable authenticated Supabase session | Migration recorded as applied; schema-only verification output shows three columns, worker-state table, server-only RPC, and no client execute permission | Apply `20260824190000_notification_scale_and_retention.sql` in one transaction using `supabase/NOTIFICATION_SCALE_DEPLOYMENT_RUNBOOK.md`. |
| Production secret inventory | Not verified in this repository | Dated secret inventory review, rotation owner, and next-review date; no secret values | Review Vercel, Supabase, Upstash, TMDB, Google OAuth, and alert-webhook configuration in their owner consoles. |
| Alert routing | Not verified in this repository | Test alert receipt for a non-sensitive provider test event or documented dry-run; destination owner and escalation path | Configure and verify Vercel 5xx, security webhook, Supabase Auth, Upstash, and independent uptime alert routing. |
| Backup and recovery | Not verified in this repository | Date, operator, isolated restore target, coarse success/failure, recovery duration, and follow-up item | Complete a non-production backup/restore drill; never restore a production dump into a shared environment. |
| Quotas and billing protections | Not verified in this repository | Dated review of provider quotas, spending limits, and responsible owner | Review Vercel, Supabase, Upstash, TMDB, and email/push providers. |
| Human accessibility review | Not verified in this repository | Reviewer, assistive technologies, viewport/zoom coverage, findings, remediation owner, and follow-up date | Run independent keyboard, screen-reader, zoom/reflow, and reduced-motion review. |
| Legal and commercial governance | Not verified in this repository | Qualified reviewer, decision date, approved markets/terms, commercial owner, and next-review date | Obtain professional review before sponsorship, advertising, or large-scale commercial rollout. |

## Evidence Record Template

Add one record per completed external activity. Keep references private if they reveal organization or personal information.

| Date (UTC) | Gate | Operator/owner | Coarse outcome | Safe evidence reference | Follow-up / due date |
|---|---|---|---|---|---|
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
