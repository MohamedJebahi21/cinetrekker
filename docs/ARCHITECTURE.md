# Architecture Overview

## Runtime Model

CineTrekker runs as a `Vite + React + TypeScript` single-page application deployed to Vercel, with Vercel serverless functions under `api/` handling server-side TMDB proxying, multi-provider enrichment, scheduled background jobs, and dynamic sitemap generation.

The architectural separation is:

- `src/`
  Frontend UI, routing, client-side state, local-first guest caching, Supabase browser client usage, and resilient metadata consumption through same-origin APIs.
- `api/`
  Serverless functions (strictly capped at 12 on Vercel Hobby), secret-backed TMDB requests, OMDb & TVmaze enrichment, cron jobs, and server-side utilities in `api/_lib/`.
- `supabase/`
  PostgreSQL database migrations, Row Level Security (RLS) policies, and `SECURITY DEFINER` stored procedures / RPCs.

---

## Environment Matrix

### Client Runtime (Browser Build)

Exposed to the browser build (must start with `VITE_`):

- `VITE_SUPABASE_URL` — Supabase project API URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_ANON_KEY` — Supabase anonymous/public key
- `VITE_SUPABASE_PROJECT_ID` — Supabase project identifier
- `VITE_ENABLE_VERCEL_SPEED_INSIGHTS` — Optional Vercel Speed Insights toggle
- `VITE_ANALYTICS_WEBSITE_ID` / `VITE_ANALYTICS_HOST` — Optional Umami privacy-first analytics

*Rule: Never place server-only secrets in `VITE_` variables.*

### Vercel Server Runtime (Serverless Functions)

Available exclusively to serverless functions in `api/`:

- `TMDB_API_KEY` — Canonical server-side TMDB read key
- `SUPABASE_URL` — Supabase database URL
- `SUPABASE_ANON_KEY` — Server-side Supabase anonymous client key
- `SUPABASE_SERVICE_ROLE_KEY` — Admin service-role key for background worker jobs
- `CRON_SECRET` — Bearer token authorizing scheduled cron jobs
- `OMDB_API_KEY` — External ratings enrichment key (IMDb, Rotten Tomatoes, Metacritic)
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — Distributed rate limiting cache
- `RESEND_API_KEY` — Contact and feedback email dispatch key

*Legacy compatibility:* `VITE_TMDB_API_KEY` is accepted as a fallback by `api/_lib/env.js`, but `TMDB_API_KEY` is the canonical key.

---

## Serverless Invariants (Vercel Hobby Plan)

Vercel Hobby accounts enforce a strict limit of **12 Serverless Functions**. To stay within this budget permanently:

1. **Multiplex related operations**:
   - `api/enrichment.ts` handles `action=ratings`, `action=tv-schedule`, `action=tv-details`, and `action=tv-episodes`.
   - `api/follow.ts` handles `POST` (follow) and `DELETE` (unfollow) with rewrite in `vercel.json`.
   - `api/notifications.js` handles listing, unread counts, and mark-as-read operations.
2. **Use `api/_lib/` for shared code**:
   - Files and subdirectories inside `api/_lib/` (such as `api/_lib/metadata/`) are treated as helper libraries by Vercel and **do not count** against the 12-function limit.
3. **Never add standalone function files in `api/`** without verifying the total deployment function count first.

---

## Deployment & Chunk Load Resilience Architecture

When a new version is deployed to Vercel, previous JS chunks with content hashes are replaced by new chunks. If a client has an older HTML/JS bundle open in a tab and attempts to dynamically import a lazy-loaded route chunk, the request can fail with `ERR_CACHE_READ_FAILURE` (Chrome disk cache corruption) or `Failed to fetch dynamically imported module`.

CineTrekker implements a 4-tier recovery architecture:

```
[User Navigates to Lazy Route]
         │
         ▼
[Browser attempts dynamic import]
         │
    ❌ Failure (ChunkLoadError / ERR_CACHE_READ_FAILURE)
         │
         ├── Tier 1: vite:preloadError Listener (installChunkErrorHandlers)
         ├── Tier 2: unhandledrejection & error Event Handlers
         └── Tier 3: React ErrorBoundary (componentDidCatch)
                   │
                   ▼
         [chunkErrorRecovery.handleError()]
                   │
         [purgeCachesAndReload()]
           ├── 1. window.caches.delete(all)
           ├── 2. navigator.serviceWorker.getRegistrations() -> reg.update()
           └── 3. window.location.replace(currentUrl + '?_cb=' + timestamp)
                   │
         (Session retry capped at 1 attempt via sessionStorage)
                   │
         If retries exhausted ──► 'Update Required' modal with manual refresh
```

### Supporting Components:
- **`src/lib/chunkErrorRecovery.ts`**: Singleton manager tracking retry counts, regex patterns for chunk/cache failures, and the cache-purging reload implementation.
- **`src/components/ErrorBoundary.tsx`**: Catch-all UI boundary that detects chunk errors, prevents cascading React re-renders of rejected promises, and renders an 'Update & Reload' button.
- **`public/boot-watchdog.js`**: 12-second client startup watchdog. If the React application fails to mount within 12 seconds, it renders a standalone recovery panel with a cache-busting reload action.
- **`public/sw.js`**: PWA Service Worker (v2) configured with `self.skipWaiting()`, network-first navigation handling, and zero caching of application JS chunks.

---

## Caching Strategy & HTTP Headers (`vercel.json`)

Header rules enforce security, fast navigations, and cache consistency:

| Route / Asset Pattern | Cache-Control Policy | Purpose |
|---|---|---|
| `/sw.js` | `no-cache, no-store, must-revalidate` | Ensures clients always fetch the latest service worker immediately. |
| `/(apple-touch-icon.*|favicon.*|manifest.*|og-image.*)` | `public, max-age=86400, stale-while-revalidate=604800` | Prevents 304 disk cache read failures while keeping icons responsive. |
| `/assets/*`, `/static/*` | `public, max-age=31536000, immutable` | Vite hashed chunks are permanent and safe to cache for 1 year. |
| `/api/*` | `no-store, no-cache, must-revalidate, proxy-revalidate` | Serverless endpoints are never cached at intermediate proxies. |
| Dynamic HTML routes | `no-store, no-cache, must-revalidate, proxy-revalidate` | Ensures the browser always receives fresh chunk manifest references. |

### Global Security Headers
- **Content-Security-Policy (CSP)**: Enforces `default-src 'self'`, trusted image/connect endpoints (`*.supabase.co`, `api.themoviedb.org`, `cloud.umami.is`), and Trusted Types (`cinetrekker default dompurify`).
- **HSTS**: `max-age=31536000; includeSubDomains; preload`
- **Isolation Policies**: `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`.
- **Permissions Policy**: Camera, microphone, geolocation, and payment access are restricted.

---

## Data Boundaries

- **Supabase**: Persistent user data (watchlists, watched records, profile preferences, custom collections, follows, notifications). Protected via Row Level Security (RLS) and Security Definer RPCs.
- **TMDB**: Primary external catalog metadata (titles, posters, backdrops, synopses, cast/crew, recommendations). Accessed via serverless proxy or direct cached calls.
- **OMDb API**: Supplementary ratings authority (IMDb, Rotten Tomatoes, Metacritic), box office, and award data.
- **TVmaze**: TV broadcast schedule authority (networks, exact air times, upcoming/previous episodes, specials/Season 0).
- **Guest Mode**: Local-first storage (`localStorage`) that seamlessly syncs to Supabase on account creation/login.

---

## Verification & Quality Gates

Every change must satisfy all gates before merging:

```bash
npm run lint                  # ESLint checks across codebase
npm run type-check            # TypeScript compiler check (tsc --noEmit)
npm run test:security         # Serverless API security & auth validation
npm run test:privacy          # RLS policies & zero-PII telemetry verification
npm run test:professionalization # Regression tests for core product structure
npm run i18n:verify           # Strict locale key parity across en, ar, de, es, fr, tr
npm run test:unit             # Unit test suite (116 tests)
npm run build                 # Production bundle and bundle-budget check
```
