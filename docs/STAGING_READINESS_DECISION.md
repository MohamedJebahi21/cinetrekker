# CineTrekker Staging-Readiness Decision

**Scope:** Local repository review and limited read-only Supabase Auth inspection. No remote database, Vercel project, OAuth provider, cron schedule, or production environment was changed.

## 1. Verified

The local application remains verified after the Apply All work. Linting, strict TypeScript checks, production build, security tests, unit tests, smoke tests, protected-route tests, and the 44-case mobile/desktop accessibility sweep passed during the local verification phase. The code continues to keep AI Recommendations disabled by default.

The staging-readiness review also verified the local configuration contract. Client Supabase variables are separated from server-side Supabase service-role credentials; TMDB is server-side; production rate limiting fails closed when Upstash is unavailable; feedback requires matching CAPTCHA and mail configuration; and the Vercel build, rewrites, headers, and daily cron configuration are present in `vercel.json`.

Two genuine deployment defects were found and remediated locally. The migration `20260814170000_harden_legacy_state_rls.sql` originally assumed a legacy table existed even though an earlier migration removes it. It is now conditional and will not block a staged migration sequence. The scheduled follow-update handler is now compatible with Vercel Cron’s actual GET request and `Authorization: Bearer <CRON_SECRET>` delivery model, while retaining the explicit header path for safe manual staging checks. The security regression suite now covers both invalid and valid Vercel-style Bearer credentials. [1] [2]

## 2. Configuration Required

| System | Manual configuration required before staging verification |
| --- | --- |
| Supabase migrations | Compare the local ordered migration list with the target project history and apply only missing migrations in order. This includes the signup trigger repair, notification policy hardening, performance indexes, notification indexes, and the guarded legacy-state hardening migration. |
| Supabase Auth | Decide whether email confirmation is required in staging, then configure the Site URL and redirect allow list for `/auth/callback` and `/auth`. The reachable Auth settings currently reported automatic email confirmation enabled. |
| Google OAuth | The UI exposes Google only. Configure a Google web OAuth client, enter its credentials in Supabase, enable the Google provider, and add application origins plus the Supabase provider callback URI. The read-only Auth settings inspection did not report Google enabled. |
| Vercel | Set the required environment variables by name: public Supabase URL/anon key, server Supabase URL/service-role key, TMDB key, Upstash REST URL/token, `CRON_SECRET`, base URL, feedback/CAPTCHA values, and optional analytics/Sentry/alert values. Do not expose server secret values. |
| TMDB | Set `TMDB_API_KEY` only in server/Edge Function environments, then test normal, error, timeout, and rate-limit paths. |
| Upstash | Set both REST variables and prove a burst test increments Redis-backed counters. Production code returns HTTP 503 when Redis is missing or unreachable rather than falling back to process memory. |
| Feedback | Configure either Turnstile or reCAPTCHA with a matching client and server key pair, and configure Resend recipient/sender values if feedback email is part of staging acceptance. |
| Monitoring | Configure `VITE_SENTRY_DSN` to validate browser error capture. Backend/cron errors currently produce structured Vercel logs; a server-side Sentry capture implementation has not been verified. |

The full operational sequence is in [`STAGING_READINESS_CHECKLIST.md`](./STAGING_READINESS_CHECKLIST.md), while the exact migration dependency analysis is in [`STAGING_MIGRATION_READINESS.md`](./STAGING_MIGRATION_READINESS.md).

## 3. Remaining Bugs

The local review found no currently failing user-facing local test or unresolved code defect after the migration-order and Vercel Cron fixes. The following external behaviors are not classified as code bugs because their target environments were intentionally not changed or exercised: the Google provider is disabled in the reachable Supabase Auth settings, and the target runtime’s TMDB/Upstash/Resend/CAPTCHA configuration has not been inspected.

## 4. Remaining Risks

The effective deployed database migration state, RLS policy state, storage policies, OAuth credentials, Vercel environment assignment, Upstash availability, email delivery, CAPTCHA verification, TMDB quota behavior, runtime duration, and concurrent cron behavior cannot be proven from a local-only review. Real traffic may also expose cache patterns, upstream outages, third-party quota limits, and rate-limit tuning needs that synthetic local tests cannot reproduce.

Vercel cron delivery is best-effort and does not automatically retry a failed run; overlapping invocations are possible if execution exceeds the interval. The current job uses batch processing and idempotent notification/state upserts, but staging should still inspect duration, error counts, and duplicate invocation behavior. [1]

## 5. Launch Blockers

| Priority | Blocker | Why it blocks production |
| --- | --- | --- |
| P0 | Target Supabase migration state is unverified. | The signup trigger and RLS/index changes cannot be assumed to exist remotely. |
| P0 | Target server environment variables are unverified. | Missing TMDB, Supabase service-role, or Upstash credentials would break core data paths, authenticated APIs, cron, or rate limiting. |
| P0 | Google OAuth is exposed in the UI but disabled in the reachable Auth configuration. | Users would receive an unsupported-provider failure until the provider is deliberately enabled or the UI is gated. |
| P0 | No disposable-user staging authentication and RLS isolation test has been completed. | Profile creation integrity and cross-user data protection cannot be signed off locally. |
| P0 | Staging cron has not run under Vercel’s actual scheduler and authorized Bearer secret. | Scheduled follow notifications remain unproven until one safe staging run completes. |
| P1 | Server-side Sentry capture is not implemented or verified. | Browser monitoring can be configured, but server/cron error visibility relies on Vercel logs and alert configuration. |

## 6. Final Launch Decision

# NO-GO

CineTrekker is **local verified** but not **staging verified**. Production deployment should wait until the P0 staging configuration and validation steps above are complete and recorded. No external changes were made during this review.

## References

[1]: https://vercel.com/docs/cron-jobs/manage-cron-jobs "Vercel: Managing Cron Jobs"

[2]: https://vercel.com/docs/cron-jobs "Vercel: Cron Jobs"
