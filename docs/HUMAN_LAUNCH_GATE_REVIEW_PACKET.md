# CineTrekker Human Launch-Gate Review Packet

## Purpose

This packet makes the remaining launch gates reviewable by the appropriate people without representing that automated checks, source code, or an AI review can replace independent accessibility testing, account-owner verification, or professional legal/commercial review.

> **Legal note:** This is an operational review checklist, not legal advice. Privacy, retention, sponsorship, advertising, consumer-protection, and regional obligations should be reviewed by a qualified professional before commercial rollout.

## Status Summary

| Gate | What automation has already covered | What remains human or owner controlled | Completion evidence |
|---|---|---|---|
| Accessibility | Keyboard, target size, focus, reduced-motion, RTL, zoom/reflow, mobile/desktop, and cross-browser automated checks | Independent assistive-technology review with real screen readers and keyboard-only journeys | Reviewer, date, devices/browsers, findings, remediation owner, retest result |
| Localization | Strict key parity and localized regression checks for English, Arabic, French, Turkish, Spanish, and German | Native-speaker clarity and cultural-quality review of high-traffic routes | Reviewer, locale, routes, issue log, corrected/retested date |
| Notifications | Preference enforcement, privacy boundaries, UI lifecycle, worker architecture, and the production schema migration | Observe the first normal scheduled run from owner logs; do not invoke it solely as a deployment test | Safe deployment record and coarse first-run telemetry only |
| Production operations | Health/status route, privacy-safe incident reporting, recovery and observability runbooks | Secret inventory, alert routing, quota review, isolated restore drill | `docs/PRODUCTION_READINESS_EVIDENCE_CHECKLIST.md` record |
| Privacy and commercial governance | Privacy/trust/measurement/sponsor guidance routes and product labeling guardrails | Legal review, partnership approval process, commercial owner, reporting sign-off | Qualified reviewer and accountable owner records |

## A. Independent Accessibility Review

Review these journeys with a keyboard and at least one screen reader on desktop and mobile. Do not use production account data; use a designated test account or guest surface where a signed-in scenario is required.

| Journey | Verify | Pass criterion |
|---|---|---|
| Global navigation | Skip link, header, mobile menu, locale/theme controls, focus order | Every control is named, reachable, visible on focus, and escapable |
| Discovery | Search, filters, original-title results, no-result recovery, carousel paging | Results and controls announce purpose; horizontal content remains usable without pointer-only gestures |
| Details and tracking | Watchlist, watched, episode progress, share, provider links | Controls do not unexpectedly submit forms, refresh the page, or lose focus; confirmation state is announced |
| Home and retention | Up Next, queue fallback, activation journey, recommendations, daily check-in, quests | Recommendations and next actions have understandable context; reduced-motion users are not forced through nonessential animation |
| Lists and calendar | Watchlist, collections, watched history, calendar previews | Tables/lists remain navigable at zoom; dialogs/previews scroll and can be dismissed predictably |
| Account surfaces | Profile, privacy, settings, notifications | Privacy state and destructive actions have clear names, consequences, and intentional confirmation |

Document browser, operating system, screen reader, zoom level, locale, issue severity, and a reproducible route for each finding.

## B. Native-Language Review

Review the following high-traffic routes in **Arabic, French, Turkish, Spanish, and German**: home, search, details, watchlist, calendar, notifications, settings, profile, privacy, trust, and measurement. Check factual meaning, grammar, tone, truncation, RTL layout for Arabic, plural forms, names/metadata behavior, and whether any operational fallback remains in English.

## C. Owner-Controlled Production Review

Use `docs/PRODUCTION_READINESS_EVIDENCE_CHECKLIST.md` to record only coarse, non-sensitive evidence for:

1. The completed Supabase notification-scale migration and its schema-only verification; observe future normal scheduled operation without manually invoking the worker as a test.
2. Vercel/Supabase/Upstash/TMDB/Google OAuth secret inventory and accountable rotation owner.
3. Vercel 5xx, security, independent uptime, Supabase Auth, and Upstash alert routing.
4. Provider quota and spending-protection review.
5. Isolated backup-and-recovery drill using an approved non-personal test fixture.

## D. Legal and Commercial Review

A qualified reviewer should assess the deployed privacy, retention, cookie/measurement, user-data deletion, sponsorship labeling, partner reporting, and regional consumer obligations. Before accepting a sponsor commitment, designate a commercial owner and document approval, suitability, audience-data boundaries, placement labels, reporting assumptions, and escalation contacts.

## Handoff Record

| Review area | Reviewer / owner | Date | Outcome | Remaining action | Retest / next review |
|---|---|---|---|---|---|
| Accessibility |  |  |  |  |  |
| Arabic localization |  |  |  |  |  |
| French localization |  |  |  |  |  |
| Turkish localization |  |  |  |  |  |
| Spanish localization |  |  |  |  |  |
| German localization |  |  |  |  |  |
| Production operations |  |  |  |  |  |
| Legal/commercial |  |  |  |  |  |

## Related Materials

- `LAUNCH_READINESS_TODO.md`
- `docs/PRODUCTION_READINESS_EVIDENCE_CHECKLIST.md`
- `docs/PRODUCTION_OBSERVABILITY_RUNBOOK.md`
- `docs/BACKUP_AND_RECOVERY_PLAN.md`
- `supabase/NOTIFICATION_SCALE_DEPLOYMENT_RUNBOOK.md`
