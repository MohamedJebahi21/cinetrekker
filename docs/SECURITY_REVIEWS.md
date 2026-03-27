# Recurring Security Reviews

## Monthly Quick Scan

Run once every month:

1. `npm audit --omit=dev`
2. `npm run test:security`
3. `node scripts/verify-security-config.mjs`
4. review structured security logs for:
   - auth failures
   - rate-limit hits
   - cron auth failures
   - feedback bot failures
5. confirm cron secrets and captcha secrets are still scoped correctly

## Quarterly Deep Audit

Run once every quarter:

1. Review API auth and authorization flows endpoint by endpoint.
2. Review CSP, headers, Trusted Types, and third-party script usage.
3. Review cron routes, scheduler secrets, and edge function exposure.
4. Review dependency risk including dev tooling.
5. Re-check abuse thresholds and alert routing.
6. Update incident response docs after any lessons learned.

## Ownership

- Monthly quick scan: engineering owner
- Quarterly deep audit: engineering lead + security reviewer
- Incident follow-ups: same sprint when possible, otherwise next scheduled review
