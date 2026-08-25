# CineTrekker Production Observability Runbook

## Purpose

This runbook defines the minimum monitoring and incident-response procedure for CineTrekker production traffic. It is designed to make user-visible failures diagnosable without exposing provider credentials, bearer tokens, full request bodies, or raw upstream responses.

> **Safe diagnostic rule:** Record request identifiers, endpoint scope, response status, and aggregate failure volume. Do not copy access tokens, OAuth callback fragments, provider secrets, full IP addresses, or user-generated private content into tickets or chat.

## Correlation Contract

Protected API endpoints create or preserve a safe request identifier and return it in the `X-Request-Id` response header. The same identifier is included in structured security-event logs when the security middleware reports an event.

| Field | Purpose | Safe to share with support | Must not contain |
|---|---|---:|---|
| `X-Request-Id` | Correlate an API response with server logs | Yes | Tokens, email addresses, IP addresses, query payloads |
| Client error reference | Correlate an error-boundary report with browser console evidence | Yes | Stack traces, session data, user profile fields |
| Endpoint scope | Identify the affected feature area | Yes | Provider credentials or raw request data |
| HTTP status | Classify the type of failure | Yes | Upstream diagnostic content |

When a user reports a failure, ask for the approximate time, feature name, visible client error reference if present, and `X-Request-Id` from the failed API response. Search the Vercel function logs around that time using the request identifier before making changes.

## Safe public readiness probe

Before a controlled release, run `npm run readiness:public` from a clean checkout. The probe performs only `GET` requests to `/api/health`, `/status`, `/notifications`, `/trust`, `/measurement`, and `/partnerships`. It records only HTTP status, elapsed time, coarse health state, and dependency booleans for `/api/health`; it does not authenticate, mutate data, invoke the notification worker, store response bodies, or send alerts. Use `CINETREKKER_PUBLIC_URL` to point the same probe at an explicitly approved non-production environment.

A successful probe is evidence that the public routes responded, not evidence that secrets, provider quotas, alert delivery, backup recovery, or authenticated user workflows are ready. Those gates remain governed by the production evidence checklist and the owner-controlled review packet.

## Monitoring Checklist

| Signal | Where to inspect | Alert condition | First response |
|---|---|---|---|
| API 5xx rate | Vercel function logs and deployment analytics | Sustained elevated errors for five minutes | Identify the affected endpoint and search by `X-Request-Id`. |
| `rate_limit_unavailable` | Structured security events | Any production occurrence | Treat as a protection outage; verify Upstash REST URL/token reachability before changing traffic policy. |
| `rate_limit_hit` volume | Structured security events | Sudden endpoint-specific spike | Determine whether the cause is product traffic, a broken client retry loop, or abuse. |
| TMDB upstream 502 rate | `tmdb-proxy` function logs | Sustained errors affecting discovery or details pages | Check TMDB availability and cache behavior; keep client errors sanitized. |
| Authentication failures | Supabase Auth logs and client reports | Repeated OAuth callback or sign-in failures | Confirm provider status, redirect allow list, consent audience, and callback route. |
| Feedback/social 5xx rate | Vercel function logs | Repeated submission or mutation errors | Verify required server environment variables and Supabase availability. |
| Client chunk-load failures | Browser error reports and deployment timing | Spike immediately after a deployment | Verify the deployed asset manifest, retain the current automatic chunk recovery behavior, and consider rollback. |

## Triage Procedure

| Step | Action | Expected result |
|---|---|---|
| 1 | Confirm the user-visible symptom, timestamp, route, and request/error reference. | The incident is scoped without requesting sensitive data. |
| 2 | Search Vercel function logs by request identifier and affected endpoint. | The matching server-side event is located. |
| 3 | Classify the failure as client, auth, upstream content, rate limiting, social mutation, or deployment mismatch. | The owning service and runbook branch are known. |
| 4 | Check whether the event is isolated or sustained. | Decide between targeted recovery and incident escalation. |
| 5 | Apply the smallest authorized recovery action. | The service recovers without widening access controls or exposing diagnostics. |
| 6 | Re-run the corresponding smoke path using a fresh browser session. | Recovery is confirmed from a user perspective. |
| 7 | Record cause, impact, recovery time, and follow-up action. | The incident produces a durable improvement. |

## Endpoint-Specific Guidance

### TMDB Discovery and Detail Failures

If discovery, search, or details endpoints return 503 with a protection-unavailable message, do not disable rate limiting. Verify the production Upstash REST configuration and reachability, then redeploy only after the distributed limiter is healthy. Use `docs/PRODUCTION_DISCOVERY_RECOVERY_RUNBOOK.md` for the approved recovery sequence.

### Google Sign-In Failures

For an OAuth failure, verify the Google provider remains enabled in Supabase, the Supabase callback URL is registered in Google Cloud, and the relevant local or production callback destination remains in Supabase URL Configuration. If the Google consent audience is in testing mode, ensure the affected account is an approved tester before treating the failure as an application bug.

### Social and Feedback Failures

For follow, notification, or feedback errors, first verify the response request identifier and corresponding Vercel function log. Do not expose Supabase error payloads to the client. If the pending public-social RPC migration has not been applied, do not treat unavailable directory/profile data as a client regression.

## Alerting Configuration To Apply Later

The following remote configuration is intentionally not changed by this local batch. Apply it only with explicit authorization.

| Configuration | Recommended target | Reason |
|---|---|---|
| Vercel log alert | Production function 5xx surge | Detects widespread serverless failures quickly. |
| Security alert webhook | `SECURITY_ALERT_WEBHOOK_URL` | Delivers throttled alerts for `rate_limit_unavailable` and other opted-in security events. |
| Uptime check | Home page plus a low-cost public route | Detects unavailable deployments independently of user reports. |
| Supabase Auth monitoring | Authentication and OAuth events | Detects provider or callback issues before they affect many users. |
| Upstash monitoring | Redis REST reachability and error rate | Protects the fail-closed rate-limit dependency. |

## Post-Incident Review

Document the incident in a short internal record containing the timestamp, impact window, symptoms, affected endpoint, safe request identifiers, root cause, recovery action, and preventive follow-up. If credentials may have been exposed, rotate them before restoring traffic and follow `docs/INCIDENT_RESPONSE.md`.
