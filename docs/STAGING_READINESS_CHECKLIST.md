# CineTrekker Staging-Readiness Checklist

**Scope:** This checklist moves CineTrekker from **local verified** to **staging verified**. It is intentionally non-destructive. It does not authorize migration application, environment changes, OAuth enablement, remote cron invocation, or production deployment.

## 1. Current non-destructive findings

| Area | Verified locally or read-only | Current staging implication |
| --- | --- | --- |
| Supabase reachability | The configured Supabase Auth settings endpoint responded to a read-only request. The data REST root rejected the supplied key for schema/migration inspection with a secret-key requirement. | A Supabase project is reachable, but its environment identity and migration history are not proven from this session. |
| Email authentication | The reachable Auth settings reported email enabled and `mailer_autoconfirm: true`. | Staging currently does **not** require email confirmation if it is the same project. This conflicts with the requested confirmation test and must be deliberately decided in Supabase Auth settings. |
| OAuth | The app exposes only **Google** in its UI. The reachable Auth settings did not report Google enabled. | Google OAuth is a P0 staging configuration item; do not enable it until the Google client and allowed URLs are ready. |
| Supabase migrations | Filenames sort cleanly with no duplicate timestamp prefixes. The migration-order conflict discovered during this review was corrected locally. | Compare the ordered local list with the target project before applying any missing migration. |
| Vercel cron | `vercel.json` schedules `/api/jobs/check-followed-updates` daily at `0 3 * * *` (03:00 UTC). The handler now accepts Vercel’s GET plus the documented Bearer `CRON_SECRET` authorization. | Configure `CRON_SECRET` in Vercel and verify one safe staging invocation after deployment. |
| Distributed rate limiting | Server routes use `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. Production mode fails closed with HTTP 503 when Redis is absent or unavailable. | Both Upstash variables are mandatory for a working staging security control. |
| Server-side TMDB | The proxy and scheduled update job require `TMDB_API_KEY`; the key is not exposed in client code. | Configure the key server-side in both Vercel and any Supabase Edge Function deployment used by the application. |
| Feedback protection | Feedback requires a CAPTCHA server secret and matching public site key, plus Resend sender/recipient configuration. | Enable either Turnstile or reCAPTCHA and configure feedback mail before treating feedback as staging-verified. |
| Sentry | The browser client initializes Sentry when `VITE_SENTRY_DSN` is supplied. Server API code currently emits structured function logs but contains no Sentry SDK initialization/capture path. | Frontend Sentry can be configured. Backend and cron error capture are **not verified** and must be handled through Vercel logs/alerts or a later explicit server-monitoring implementation. |

## 2. Required deployment configuration by name

> **Do not place server secrets in variables prefixed with `VITE_`.** Vite exposes `VITE_*` variables to the browser bundle.

| Category | Variables or settings | Required scope | Staging acceptance criterion |
| --- | --- | --- | --- |
| Client Supabase | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Build-time browser variables | The browser initializes the correct staging Supabase project and no service-role secret is bundled. |
| Server Supabase | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Vercel serverless functions only | Authenticated API routes and cron can use the admin client; no client code contains the service-role key. |
| TMDB | `TMDB_API_KEY` | Vercel serverless functions and Supabase Edge Function environment if `/functions/v1/tmdb-proxy` is deployed | Trending, search, details, and sitemap calls work; no TMDB key is visible in browser network source or client bundle. |
| Upstash | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Vercel serverless functions only | Normal, burst, reset, authenticated, and unauthenticated rate-limit tests use Redis rather than the development in-memory fallback. |
| Cron | `CRON_SECRET` | Vercel serverless function environment | Vercel’s GET request with `Authorization: Bearer <CRON_SECRET>` reaches the handler; invalid or absent credentials return 401. |
| OAuth and Auth URLs | Supabase Auth **Site URL** and **Redirect URLs** | Supabase dashboard | Exact app origins and `/auth/callback` plus `/auth` recovery paths are allowed. |
| Google OAuth | Google OAuth client ID/secret in Supabase Google provider; Google authorized origins and Supabase callback URI | Google Cloud and Supabase dashboards | Google login completes for a disposable staging identity and returns to the app callback. |
| CAPTCHA | Choose exactly one matching pair: `VITE_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`, or `VITE_RECAPTCHA_SITE_KEY` + `RECAPTCHA_SECRET_KEY` | Public key at build time; secret server-side | Feedback accepts valid CAPTCHA and rejects missing, invalid, or honeypot submissions. |
| Feedback email | `RESEND_API_KEY`, `FEEDBACK_TO_EMAIL`, optional `FEEDBACK_FROM_EMAIL` | Vercel serverless functions only | A disposable staging feedback submission is delivered to the intended non-production inbox. |
| Analytics | `VITE_ENABLE_VERCEL_ANALYTICS`, `VITE_ENABLE_VERCEL_SPEED_INSIGHTS` | Build-time browser variables | Each value is deliberately enabled or disabled per staging policy. |
| Sentry | `VITE_SENTRY_DSN` | Build-time browser variable | An intentional browser test error is captured in the correct staging environment without sending credential, token, or sensitive form content. |
| Base URLs | `APP_BASE_URL`, `VITE_SITE_URL` where used | Server and build environment respectively | Sitemap, canonical metadata, and redirect behavior use the staging domain rather than the production default. |
| Optional alerts | `SECURITY_ALERT_WEBHOOK_URL` | Vercel serverless functions only | A controlled critical security event reaches the designated non-production alert channel without exposing request secrets. |
| AI recommendations | `AI_RECOMMENDATIONS_ENABLED` | Leave unset or set to any value except `true` | `POST /api/recommend` continues returning the upcoming-feature response. Do not configure an OpenAI/Gemini key. |

## 3. Exact Supabase Auth and OAuth settings

The client computes its redirects from `window.location.origin`. Configure these exact values, substituting the actual staging host only where shown.

| Use case | Local URL | Staging URL | Production URL |
| --- | --- | --- | --- |
| Google OAuth callback returned to the app | `http://localhost:4173/auth/callback` and `http://127.0.0.1:4173/auth/callback` if both are used | `https://<staging-domain>/auth/callback` | `https://cinetrekker.vercel.app/auth/callback` and the canonical custom-domain equivalent if one is used |
| Password recovery redirect | `http://localhost:4173/auth` and `http://127.0.0.1:4173/auth` if both are used | `https://<staging-domain>/auth` | `https://cinetrekker.vercel.app/auth` and the canonical custom-domain equivalent if one is used |
| Supabase Site URL | Local development URL only when testing locally | `https://<staging-domain>` | Canonical production URL |
| Google Authorized JavaScript Origin | `http://localhost:4173` and/or `http://127.0.0.1:4173` | `https://<staging-domain>` | `https://cinetrekker.vercel.app` and canonical custom-domain origin |
| Google Authorized Redirect URI | Use the exact Supabase provider callback shown in the provider dashboard | Same Supabase project callback | Same Supabase project callback |

Only Google is currently exposed in the UI. The AuthContext type includes Facebook and Apple provider identifiers, but neither is displayed as a user-facing login button. Do not configure Facebook or Apple until they are intentionally added to the product flow.

To enable Google manually, create a web OAuth client in Google Cloud, configure the minimum Supabase-required scopes, add the application origins and the Supabase provider callback URI in Google, then enable Google and add the client credentials in Supabase Auth. Add the browser return routes to the Supabase Redirect URLs allow list. Supabase’s Site URL remains important for confirmation and recovery flows when a call does not specify a redirect. [1] [2] [3]

## 4. Staging authentication procedure

Use two new disposable identities, **User A** and **User B**, from a staging-only mail domain or mail sink. Never use real user accounts.

| Step | Action | Expected result | Evidence to record |
| --- | --- | --- | --- |
| 1 | Register User A with a unique email, username, and compliant password. | No browser error; one `auth.users` row and one `profiles` row are created. | Timestamp, non-secret user UUIDs or redacted UUID suffixes, and browser outcome. |
| 2 | Verify the confirmation email behavior. | If confirmations are enabled, the link works and returns to an allowed app URL. If they are deliberately disabled for staging, document that decision. | Auth setting and email-link result. |
| 3 | Query the staging database with authorized admin access. | `auth.users.id = profiles.id = profiles.user_id`, username reflects metadata, and profile count for User A is exactly one. | Read-only query result with emails redacted. |
| 4 | Log in with correct credentials. | Session starts and protected page access works. | Route and session outcome. |
| 5 | Attempt an invalid password. | Generic safe error; no session or stored token is created. | Error text and storage inspection result. |
| 6 | Log in with Remember Me **off**, refresh, and restart the browser. | Session data is session-scoped; persistence behavior matches the product decision. | Storage keys only, not token values. |
| 7 | Log in with Remember Me **on**, refresh, and restart the browser. | Persistent storage behavior is present only for this choice. | Storage keys only, not token values. |
| 8 | Log out after each persistence mode. | Session state and both storage locations are cleared. | Browser state and protected-route result. |
| 9 | Request password recovery using a known and an unknown disposable email. | Same user-safe browser response; known account receives a recovery message; redirect reaches `/auth`. | Mail sink and browser result. |
| 10 | Start Google OAuth with User A. | Provider opens, consent completes, and return reaches `/auth/callback`; no unsupported-provider response. | Redirect chain and final app state. |
| 11 | Allow a short-lived staging session to expire or use a controlled expiration configuration. | Refresh/expiration handling returns the user safely to an authenticated or sign-in state without stale tokens. | Browser and network outcome. |

## 5. Staging API, TMDB, and error-state procedure

After `TMDB_API_KEY` is set on the staging server, perform the following through the staging browser or a non-destructive API client. Do not log key values.

| Scenario | Test | Expected result |
| --- | --- | --- |
| Trending | Load home and trending screens. | Results render or a bounded, user-safe error state appears. |
| Search | Search a common title and an uncommon string. | Relevant results or an empty state; no unhandled rejection. |
| Movie and TV detail | Open a known movie and known TV title. | Detail pages load with metadata, poster fallback, and normal navigation. |
| Seasons and episodes | Open a known multi-season title. | Season/episode data loads and handles unavailable episodes gracefully. |
| Invalid ID and 404 | Use a valid route shape with a nonexistent ID. | Structured not-found/error state; no infinite spinner. |
| 429 | Exercise a controlled staging rate-limit response or mock upstream 429 in a dedicated staging test. | User-safe retry message and correct HTTP mapping. |
| Timeout | Induce a safe staging timeout or mock the upstream connection. | Bounded timeout response; no hanging request. |
| Malformed upstream payload | Use a controlled proxy mock only in staging/test infrastructure. | Structured invalid-response error; no client crash. |

## 6. RLS two-user procedure

Use the same disposable User A and User B accounts. Execute all data reads and mutations with their own user sessions, not the service-role key. The target result is always that User A can operate on User A’s records and User B cannot read, update, delete, or forge records owned by User A.

| Resource | User A positive test | User B isolation test |
| --- | --- | --- |
| Profiles | Read and update own permitted fields. | Cannot update A; public profile behavior follows privacy setting. |
| Watchlist and watched media | Create, list, update status where supported, delete own rows. | Cannot read or mutate A’s rows. |
| Watched episodes and TV RPCs | Mark/unmark own episode progress. | Cannot execute writes against A’s user ID or rows. |
| Collections and collection items | Create list, add item, remove item. | Cannot read or modify A’s collection or its items. |
| Follows | Follow/unfollow own titles. | Cannot add/remove records with A’s user ID. |
| Notifications | Read/update/delete own notifications. | Cannot read/mutate A’s notifications or forge cross-user notifications. |
| Followed state | Read/update own user-scoped state through intended flows. | Cannot access A’s state. |
| Storage | Upload/read/delete only the user’s permitted objects. | Cannot obtain or overwrite A’s private objects. |
| Comments | Run the equivalent tests **only if** comments exist in the deployed staging schema; they are not defined by the current local migrations. | Verify owner/public-sharing policy rather than weakening it. |

## 7. Rate limiting and cron procedure

| System | Staging test | Expected result |
| --- | --- | --- |
| Redis health | Check the Upstash REST endpoint/console using authorized operational access. | The configured database is reachable and usage counters move during testing. |
| Normal request | Call a protected endpoint below the limit. | Normal success path. |
| Burst request | Send controlled requests from a staging test IP until the documented endpoint threshold is crossed. | HTTP 429 with `Retry-After`; security event is logged. |
| Reset behavior | Wait for the configured window to expire, then repeat one request. | Request is accepted after expiry. |
| Authenticated limit | Use a signed-in disposable user against follow/notification endpoints. | User/IP limiting is enforced without affecting another test identity incorrectly. |
| Unauthenticated limit | Repeat requests with an invalid or missing token. | Pre-auth/IP protection engages without repeated costly auth lookups. |
| Redis fail-closed behavior | Only in a dedicated staging window approved by the owner, temporarily point to an invalid test Redis endpoint or use a safe proxy simulation. | Production-mode handler returns HTTP 503 rather than silently switching to in-memory limiting. |
| Vercel cron auth | After deployment, manually invoke only the **staging** cron through the Vercel dashboard or a safe GET using the authorized secret. | `Authorization: Bearer <CRON_SECRET>` is accepted; an invalid bearer returns 401. |
| Cron job behavior | Verify schedule, batch processing, idempotent notification keys, and state upserts with disposable follows. | The job processes unique titles in batches of five, upserts `user_id,event_key`, and records a bounded result. |

Vercel invokes configured cron paths with an HTTP **GET** and automatically sends `CRON_SECRET` in the `Authorization` header. It does not retry failed invocations automatically, and concurrent runs can overlap if a previous run exceeds its interval; the current job is idempotent through state and notification upserts, but production monitoring should watch duration and duplicate runs. [4] [5]

## 8. Browser acceptance matrix

Run every row after staging configuration is complete. Test direct URLs, refresh, back/forward navigation, desktop, mobile, loading states, and expected error states.

| Public | Authenticated |
| --- | --- |
| Home, search, trending, discover, calendar | Profile, watchlist, watched, following, notifications/social |
| Movie details, TV details, seasons, episodes | Collections/custom lists, settings, feedback, logout |
| Recommendations (must remain non-AI/upcoming) | Profile privacy and account persistence flows |
| About, privacy, terms, cookies, sitemap | Protected-route redirects when signed out |

## 9. Confirmation boundary

The following operations would alter an external service and require explicit confirmation before execution: applying Supabase migrations; enabling email confirmation or Google OAuth; setting Vercel, Supabase, Google, Upstash, Sentry, CAPTCHA, or Resend configuration; manually running the staging cron; creating disposable remote users; sending recovery emails; and deploying a staging build.

## References

[1]: https://supabase.com/docs/guides/auth/social-login/auth-google "Supabase: Login with Google"

[2]: https://supabase.com/docs/guides/auth/redirect-urls "Supabase: Redirect URLs"

[3]: https://supabase.com/docs/guides/auth/passwords "Supabase: Password-based Auth"

[4]: https://vercel.com/docs/cron-jobs "Vercel: Cron Jobs"

[5]: https://vercel.com/docs/cron-jobs/manage-cron-jobs "Vercel: Managing Cron Jobs"
