# CineTrekker Technical Architecture

> **Technical Architecture & Data Flow Guide**  
> *Last Updated: 2026-09-16*  
> This document details the runtime layers, data flows, security boundaries, rate limiting, and architectural constraints across CineTrekker.

---

## 1. Runtime Model & Execution Layers

CineTrekker operates across three execution tiers:

```
+-----------------------------------------------------------------------------------------+
| 1. BROWSER RUNTIME (Client-side Single Page Application)                                |
|    - Vite 8 + React 19.2 + TypeScript + Tailwind CSS                                    |
|    - TanStack Query v5 for asynchronous query & mutation caching                        |
|    - Supabase Browser Client (PostgREST queries scoped to session user)                 |
|    - Local-First Storage fallback (Guest Watchlist & Watched items in localStorage)     |
+-----------------------------------------------------------------------------------------+
                               |                                 |
                 Same-Origin HTTP Requests             Direct PostgREST / RLS
                 (/api/tmdb-proxy, /api/follow)                  |
                               v                                 v
+---------------------------------------------------+   +---------------------------------+
| 2. VERCEL SERVERLESS RUNTIME (Node.js 22 ES Mod)  |   | 3. SUPABASE MANAGED BACKEND     |
|    Location: /api/*.js                            |   |    - PostgreSQL 15+ with RLS    |
|    - Server-side TMDB Proxy with upstream caching |   |    - GoTrue Auth (JWT session)  |
|    - Bot protection (Turnstile & Honeypots)       |   |    - Security Definer RPCs      |
|    - Distributed rate limiting via Upstash Redis  |   |    - Storage Buckets (Avatars)  |
|    - Scheduled cron workers (check-updates)       |   |    - Atomic progress mutations  |
|    - Sanitized telemetry & health probes          |   +---------------------------------+
+---------------------------------------------------+                  |
                               |                                       |
                               v                                       v
                 External Services: The Movie Database (TMDB API), Resend Email, Sentry
```

---

## 2. Core Technical Data Flows

### A. Catalog Browsing & TMDB Serverless Proxy Flow

```
[User Action: Search / Browse / Details]
       │
       ▼
[React Page: Search.tsx / Details.tsx]
       │
       ▼
[Service: src/services/tmdb.ts]
       │
       ▼ (GET request to /api/tmdb-proxy?endpoint=...&maturity_level=...)
[Serverless Proxy: api/tmdb-proxy.js]
       │
       ├──► 1. Origin verification & IP sliding-window rate limit (60 req/min via Upstash)
       ├──► 2. Validate endpoint regex (/^[a-zA-Z0-9/_-]+$/) to prevent path traversal
       ├──► 3. Enforce content policy constraints (add certification.lte, include_adult=false)
       ├──► 4. Attach secret TMDB_API_KEY and fetch from https://api.themoviedb.org/3
       ├──► 5. Apply server-side safety filtering on returned payload (isBlockedByMaturity)
       └──► 6. Set HTTP Cache-Control:
                - /trending: s-maxage=300, stale-while-revalidate=600
                - /movie/:id, /tv/:id: s-maxage=86400, stale-while-revalidate=604800
       ▼
[JSON Response] ──► [TanStack Query Cache] ──► [UI Render with Skeleton Transition]
```

### B. User Tracking & Resilient Media Enrichment Flow

```
[User Action: "Add to Watchlist" or "Log Watch"]
       │
       ▼
[Context Hook: useUserLists() in UserListsContext.tsx]
       │
  ┌────┴──────────────────────────────────────────────┐
  ▼                                                   ▼
[Guest Mode: unauthenticated]                [Authenticated User]
  │                                                   │
  ▼                                                   ▼
Save to localStorage                         Insert into Supabase
(STORAGE_KEYS: mywatch_watchlist / watched)  (user_watchlist / user_watched)
  │                                                   │
  └─────────────────────────┬─────────────────────────┘
                            ▼
[Hydration Layer: src/lib/mediaEnrichment.ts]
  │
  ├── 1. Extract { mediaId, mediaType } references from user records
  ├── 2. Map existing items to Map<string, T> with key createMediaLookupKey(type, id)
  ├── 3. Concurrently fetch missing details via fetchMediaDetailsByReference() -> /api/tmdb-proxy
  └── 4. Gracefully handle errors: if TMDB fails, invoke createFallbackMedia()
         -> Returns complete fallback object with placeholder posters so user list stays operational
  ▼
[Rendered UI Grid / Table]
```

### C. TV Episode Progress Flow (Single-Transaction RPC)

```
[User Marks TV Episode as Watched]
       │
       ▼
[Service: markTvEpisodeWatched() in src/services/social.ts]
       │
       ▼ (Supabase RPC Call)
[PostgreSQL RPC: public.mark_tv_episode_watched()]
       │
       ├── 1. Verify caller auth: auth.uid() NOT NULL
       ├── 2. Upsert row into public.watched_episodes (show_id, season_number, episode_number)
       └── 3. Upsert row into public.followed_shows:
               - Update last_watched_season & last_watched_episode
               - Automatically follow show if show_name and poster_path provided
       ▼
[Client tanStack Cache Invalidation: ['watched_episodes', showId], ['followed_shows']]
```

### D. Scheduled Follow Updates & Notification Compaction Flow

```
[Vercel Cron Trigger: HTTP POST /api/jobs/check-followed-updates]
       │
       ├──► Check header: req.headers['x-cron-secret'] === env.CRON_SECRET
       │    (Reject with 401 Unauthorized if missing/mismatched)
       │
       ▼
[Worker Execution: api/jobs/check-followed-updates.js]
       │
       ├── 1. Read cursor_movie_id from public.notification_worker_state
       ├── 2. Call DEFINER RPC: public.notification_followed_title_batch(after_movie_id, batch_size=12)
       ├── 3. Query TMDB details for air-date / status changes
       ├── 4. Check user notification preferences (notification_preferences.release_updates = true)
       ├── 5. Insert notification with:
       │       - group_key (e.g. 'tv-1399-s4')
       │       - expires_at (now + 90 days)
       │       - event_key for deduplication
       ├── 6. Purge expired notifications (expires_at <= now())
       └── 7. Save updated checkpoint cursor in public.notification_worker_state
```

---

## 3. Security, Authorization & Invariants

1. **Client / Server Key Isolation**:
   - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are the only Supabase keys bundled in client code.
   - `SUPABASE_SERVICE_ROLE_KEY`, `TMDB_API_KEY`, `CRON_SECRET`, `RESEND_API_KEY`, and Upstash credentials must remain server-side in Vercel environment variables.
2. **Row Level Security (RLS) Policies**:
   - `public.profiles`: Direct reads are restricted to `auth.uid() = user_id`. Public profile access must call `get_public_profile_summary()` which enforces `is_public = true`.
   - `public.user_watchlist` & `public.user_watched`: Restricted to `auth.uid() = user_id`.
   - `public.notifications`: Inserts are restricted to service role (`auth.uid() IS NULL`); users can only select, mark read, or delete their own rows.
3. **API Protection (`api/_lib/requestSecurity.js`)**:
   - All serverless endpoints validate HTTP methods (`GET`, `POST`).
   - Origins are checked in production (`cinetrekker.vercel.app`).
   - Sliding-window rate limiting is backed by Upstash Redis REST API or in-memory fallback.
4. **Architectural Invariants**:
   - **Guest Persistence**: Guest users must never lose watchlist/watched data upon browser reload or when signing up.
   - **Catalog Resilience**: A TMDB failure must never prevent a user from managing their watchlist, history, or profile.
   - **Zero PII Leakage**: No search queries, titles, email addresses, or unmasked IPs in logging or metrics.
