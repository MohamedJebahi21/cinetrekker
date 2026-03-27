# Incident Response Basics

## Key Rotation

Rotate immediately when any credential is exposed, suspected compromised, or used unexpectedly.

1. Disable or rotate the affected secret in the source system first.
2. Update the replacement value in:
   - Vercel environment variables
   - Supabase secrets
   - local `.env.local` if needed
3. Redeploy the application and scheduled jobs.
4. Confirm old credentials no longer work.
5. Review logs for follow-up abuse using the old key.
6. Record the incident date, impacted systems, and rotation completion time.

Priority rotation order:
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `TMDB_API_KEY`
- `CRON_SECRET`
- captcha secrets
- alert webhook secrets

## Abuse Playbook

Use this when you see auth failures, rate-limit spikes, cron failures, or feedback spam.

1. Identify the event type and time window from structured security logs.
2. Check whether the traffic is isolated to:
   - one IP
   - one endpoint
   - one authenticated user
   - one cron route
3. Increase the endpoint-specific rate limit strictness only if needed.
4. Block or rotate secrets if cron access or token misuse is suspected.
5. Disable the affected endpoint temporarily if abuse is active and harming availability.
6. Capture:
   - sample request metadata
   - impacted IPs or user IDs
   - timestamps
   - mitigation steps taken

## Rollback Procedure

1. Identify the last known good deployment in Vercel.
2. Roll back the production deployment.
3. Re-run:
   - build
   - security tests
   - header/CSP verification
4. Confirm critical routes and cron jobs still authenticate correctly.
5. If the incident involved secrets, rotate them before re-enabling traffic.
6. Add follow-up action items to the security review backlog.
