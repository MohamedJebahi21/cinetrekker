# Architecture Overview

## Runtime Model

CineTrekker runs as a `Vite + React + TypeScript` single-page app deployed to Vercel, with Vercel serverless functions under [`api/`](/f:/My%20Own%20Games/CineTrekker/cinetrekker/api) handling server-side TMDB access, scheduled jobs, and sitemap generation.

The intended split is:

- `src/`
  Frontend UI, routing, client-side state, Supabase browser client usage, and resilient TMDB consumption through same-origin APIs.
- `api/`
  Server-only integrations, secret-backed TMDB requests, cron jobs, and server-side utility code.
- `supabase/`
  Database migrations, policies, and Supabase-side operational assets.

## Environment Matrix

### Client runtime

Expected in the browser build:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`
- `VITE_ENABLE_VERCEL_SPEED_INSIGHTS` (optional)

### Vercel server runtime

Expected in Vercel functions:

- `TMDB_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` for admin/server-only jobs where required
- `CRON_SECRET` for scheduled endpoints where applicable

Legacy compatibility:

- `VITE_TMDB_API_KEY` is still accepted by the shared server env resolver as a fallback, but `TMDB_API_KEY` is the canonical key going forward.

## Shared Runtime Utilities

- [`api/_lib/env.js`](/f:/My%20Own%20Games/CineTrekker/cinetrekker/api/_lib/env.js)
  Canonical server env resolution.
- [`api/_lib/logger.js`](/f:/My%20Own%20Games/CineTrekker/cinetrekker/api/_lib/logger.js)
  Shared server logging.
- [`src/lib/envValidation.ts`](/f:/My%20Own%20Games/CineTrekker/cinetrekker/src/lib/envValidation.ts)
  Client env/runtime validation.
- [`src/lib/mediaEnrichment.ts`](/f:/My%20Own%20Games/CineTrekker/cinetrekker/src/lib/mediaEnrichment.ts)
  Shared resilient TMDB enrichment and fallback helpers.

## Data Boundaries

- Supabase owns persisted user data:
  watchlist, watched titles, profile data, follows, notifications, and app-specific relational state.
- TMDB owns external catalog metadata:
  posters, synopses, cast, release data, recommendations, and provider metadata.
- Guest mode is local-first and syncs into Supabase after sign-in.

## Current Refactor Direction

- Canonical context modules use uppercase filenames:
  `AuthContext.tsx`, `ThemeContext.tsx`, `UserListsContext.tsx`
- Saved-list and history views should consume the shared media enrichment layer instead of ad hoc `Promise.all` detail fetches.
- Large pages are being split incrementally by responsibility, starting with shared hooks for cross-page behavior such as pinned favorites.

## Testing Priorities

- API route coverage for TMDB proxy, recommendations, sitemap, and cron auth
- UI resilience when TMDB fails but user data still exists
- Responsive regression coverage across phone, iPad, and tablet breakpoints
- Case-sensitive import validation in CI/Linux
