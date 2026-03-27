# CineTrekker Security Audit (2026-03-24)

## Scope
- Application surface reviewed:
  - Vercel API routes under `api/`
  - Shared API security helpers under `api/_lib/`
  - Supabase Edge Functions under `supabase/functions/`
  - Security headers and CSP in `vercel.json` and `_headers`
  - Frontend XSS-sensitive usage in `src/`
  - Dependency vulnerabilities via `npm audit` and `npm audit --omit=dev`

## Methodology
- Static code review for authz/authn, input validation, CORS/CSP, sensitive data handling, and abuse resistance.
- Dependency scan:
  - `npm audit --json`
  - `npm audit --omit=dev --json`
- Secret-pattern scan in application, workflow, and env files.

## Executive Summary
- Overall posture is **good** with strong baseline controls already in place:
  - Authenticated endpoints enforce bearer auth + user ownership checks.
  - Origin checks and endpoint-level rate limiting exist.
  - Production security headers are present and fairly strict.
  - No production dependency CVEs were reported.
- Key risks remain around cron authentication semantics and operational hardening.

## Findings (Ordered by Severity)

### 1) Medium: Cron secret accepted via bearer token in Edge Function
- Severity: Medium
- Location: `supabase/functions/check-new-episodes/index.ts`
- Evidence:
  - The function accepts either `x-cron-secret` **or** `Authorization: Bearer <CRON_SECRET>`.
  - Logic: `if (cronHeader !== cronSecret && bearerToken !== cronSecret) { ...401... }`
- Risk:
  - Secret reuse across different auth channels weakens auth boundaries.
  - Increases accidental exposure risk through tooling/logging conventions around Authorization headers.
- Recommendation:
  - Accept only `x-cron-secret` for machine-to-machine cron auth.
  - Remove bearer fallback and keep one dedicated auth channel for cron execution.

### 2) Medium: Rate-limit key generation performs auth lookups before auth gate
- Severity: Medium
- Location: `api/_lib/requestSecurity.js`
- Evidence:
  - `enforceRequestSecurity()` runs before endpoint auth checks in protected routes.
  - `getRateLimitKey()` calls `getAuthenticatedUserId()`.
  - `getAuthenticatedUserId()` performs `supabase.auth.getUser(accessToken)` for bearer tokens.
- Risk:
  - Attackers can force repeated upstream auth calls with random bearer tokens.
  - Potential availability degradation (increased latency/cost) before the explicit auth check rejects requests.
- Recommendation:
  - Make rate-limit key generation token-agnostic by default (IP-only first).
  - Optionally add user-id augmentation only after endpoint-level auth succeeds.
  - If user-aware limiting is required pre-auth, parse JWT claims locally (without remote introspection) and treat as untrusted hint.

### 3) Low: Public feedback endpoint lacks bot challenge control
- Severity: Low
- Location: `api/feedback.js`
- Evidence:
  - Endpoint has origin + rate limiting but no CAPTCHA/honeypot/challenge.
- Risk:
  - Bot abuse can still generate spam attempts against email provider quota.
- Recommendation:
  - Add Turnstile/reCAPTCHA (or signed challenge token) and optional honeypot field.
  - Keep current rate limits as secondary control.

### 4) Low: Dev dependency vulnerability surface present (non-production)
- Severity: Low
- Evidence:
  - `npm audit --omit=dev` reported **0** vulnerabilities.
  - `npm audit` reported vulnerabilities in dev/build chain (not runtime), including transitive issues tied to `@vercel/node` dependency graph.
- Risk:
  - Supply-chain risk in local/CI tooling, though not directly exposed in production runtime.
- Recommendation:
  - Pin and regularly update dev tooling.
  - Consider scheduled dependency update workflow and lockfile refresh cadence.

## Positive Controls Observed
- Strong authz checks in state-changing APIs:
  - `api/follow.js`, `api/unfollow.js`, `api/notifications/mark-read.js`, `api/user/followed.js`
  - Each enforces authenticated user identity match for user-scoped operations.
- Input validation is present for IDs and payload fields across protected routes.
- Security headers present in `vercel.json`, including CSP, HSTS, frame protections, referrer policy, and permissions policy.
- `tmdb-proxy` endpoint/path validation and adult-content filtering are implemented in both Vercel and Edge variants.

## Dependency Scan Result
- Production dependencies (`npm audit --omit=dev`):
  - `0` vulnerabilities.
- Full tree (`npm audit`):
  - Vulnerabilities exist in dev/build toolchain only.

## Secret Exposure Check
- No hardcoded production secrets detected in tracked app/source/workflow files in this audit pass.
- Noted local environment file with Supabase anon key (`.env.local`), which is expected for client configuration and ignored by git per `.gitignore`.

## Prioritized Remediation Plan
1. Remove bearer-token cron fallback from `supabase/functions/check-new-episodes/index.ts`.
2. Refactor `api/_lib/requestSecurity.js` to avoid remote `getUser()` lookups during pre-auth rate-limit keying.
3. Add anti-automation challenge to `api/feedback.js`.
4. Patch dev dependency chain and re-run `npm audit` until only accepted residuals remain.

## Re-test Checklist
- Verify cron endpoint works only with `x-cron-secret` and rejects bearer fallback.
- Load test protected endpoints with forged bearer tokens and confirm no upstream auth flood behavior.
- Confirm feedback endpoint blocks challenge-less submissions.
- Re-run:
  - `npm audit --omit=dev`
  - `npm audit`
  - Existing deployment protection workflow checks.

## Conclusion
Current implementation demonstrates a strong baseline and no critical/high exploitable issues were found in production runtime paths during this audit. The main improvements are operational hardening around cron auth semantics and pre-auth rate-limit design.
