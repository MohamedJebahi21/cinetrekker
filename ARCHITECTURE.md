# CineTrekker Technical Architecture

> **Technical Architecture & Data Flow Guide**  
> *Last Updated: 2026-09-24*  
> This document details the runtime layers, data flows, security boundaries, rate limiting, and architectural constraints across CineTrekker.

---

## 1. Runtime Model & Execution Layers

CineTrekker operates across three execution tiers:

```
+-----------------------------------------------------------------------------------------+
| 1. BROWSER RUNTIME (Client-side Single Page Application & PWA)                          |
|    - Vite 8 + React 19.2 + TypeScript + Tailwind CSS                                    |
|    - TanStack Query v5 for asynchronous query & mutation caching                        |
|    - Supabase Browser Client (PostgREST queries scoped to session user)                 |
|    - PWA Service Worker (v2, network-first navigations, skipWaiting, push listener)     |
|    - Boot Watchdog (12s timer with active cache-purging self-healing recovery)          |
|    - Local-First Storage fallback (Guest Watchlist & Watched items in localStorage)     |
+-----------------------------------------------------------------------------------------+
                               |                                 |
                 Same-Origin HTTP Requests             Direct PostgREST / RLS
                 (/api/tmdb-proxy, /api/enrichment)              |
                               v                                 v
+---------------------------------------------------+   +---------------------------------+
| 2. VERCEL SERVERLESS RUNTIME (Node.js 22 ES Mod)  |   | 3. SUPABASE MANAGED BACKEND     |
|    Location: /api/*.ts, /api/*.js                 |   |    - PostgreSQL 15+ with RLS    |
|    Constraint: Strictly <= 12 functions (Hobby)  |   |    - GoTrue Auth (JWT session)  |
|    - Consolidated TMDB & Enrichment proxies       |   |    - Security Definer RPCs      |
|    - Bot protection (Turnstile & Honeypots)       |   |    - Storage Buckets (Avatars)  |
|    - Distributed rate limiting via Upstash Redis  |   |    - Atomic progress mutations  |
|    - Scheduled cron workers (check-updates)       |   +---------------------------------+
|    - Sanitized telemetry & health probes          |                  |
+---------------------------------------------------+                  |
                               |                                       |
                               v                                       v
                 External Services: TMDB API, OMDb API, TVMaze API, Resend, Sentry
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

### E. Multi-Source Metadata Provider Architecture & Enrichment Flow

```
[User Navigates to Title Details: Details.tsx]
       │
       ├──► TMDB details provide details.imdb_id (e.g. "tt0137523")
       │
       ├──► TanStack Query: useEnrichedRatings(imdbId)
       │    └── GET /api/enrichment?action=ratings&imdb_id=tt0137523
       │        ├── Route: vercel.json rewrite from /api/enrichment/ratings
       │        ├── Provider: api/_lib/metadata/providers/omdb.ts
       │        ├── In-memory 7-day TTL cache check
       │        ├── Fetch OMDb API: https://omdbapi.com/?i=tt0137523&apikey=...
       │        ├── Fail-soft fallback if OMDB_API_KEY unset (HTTP 200 with null values)
       │        └── Returns { imdbRating, rottenTomatoes, metascore, awards, boxOffice }
       │
       ├──► TanStack Query (isTV only): useTVSchedule(imdbId)
       │    └── GET /api/enrichment?action=tv-schedule&imdb_id=tt0137523
       │        ├── Route: vercel.json rewrite from /api/enrichment/tv-schedule
       │        ├── Provider: api/_lib/metadata/providers/tvmaze.ts
       │        ├── Rate Limiter: Token Bucket (20 calls / 10s window)
       │        ├── In-memory 6-hour TTL cache check
       │        ├── Fetch TVmaze API: https://api.tvmaze.com/lookup/shows?imdb=tt0137523
       │        └── Returns { network, days, time, nextEpisode: { name, season, number, airdate } }
       │
       ├──► TanStack Query (isTV only): useEnrichedTVDetails(imdbId)
       │    └── GET /api/enrichment?action=tv-details&imdb_id=tt0137523
       │        ├── Route: vercel.json rewrite from /api/enrichment/tv-details
       │        ├── Provider: api/_lib/metadata/providers/tvmaze.ts
       │        ├── Fetches show with embedded seasons, next/prev episodes
       │        └── Returns normalized series metadata (12h TTL cache)
       │
       └──► TanStack Query (isTV only): useEnrichedTVEpisodes(imdbId)
            └── GET /api/enrichment?action=tv-episodes&imdb_id=tt0137523
                ├── Route: vercel.json rewrite from /api/enrichment/tv-episodes
                ├── Provider: api/_lib/metadata/providers/tvmaze.ts
                ├── Fetches full episode catalog including specials / Season 0 (specials=1)
                └── Returns normalized episode list with exact airtimes & descriptions (6h TTL cache)
```

#### Deterministic Source Precedence Matrix

| Data Domain | Authoritative Provider | Secondary / Fallback | Rationale |
|---|---|---|---|
| Catalog discovery, base metadata | **TMDB** | TVmaze | Comprehensive global catalog, multi-language synopses |
| Posters & Backdrops | **TMDB** (image.tmdb.org) | TVmaze | High-resolution assets with standard aspect ratios |
| External Scores & Awards | **OMDb** | — | Authoritative IMDb votes/ratings, Rotten Tomatoes, Metacritic |
| TV Broadcast Schedule | **TVmaze** | — | Precise broadcast network, web channel, air days/time |
| Next / Previous Episodes | **TVmaze** | TMDB | Accurate broadcast countdowns and episode pointers |
| Episode Catalog & Specials | **TVmaze** | TMDB | Full coverage including Season 0 / specials and exact airtimes |
| Episode Descriptions & Images | **TMDB** | TVmaze | Fallback to TVmaze when TMDB episode overview is blank |
| Streaming Availability *(Future)* | **Watchmode** *(contract ready)* | TMDB watch/providers | Normalized `StreamingProvider` interface in `types.ts` |

#### Multi-Stage ID Matching Pipeline (`idMatcher.ts`)

Cross-provider resolution follows a deterministic 5-stage pipeline:
1. **Exact Provider ID**: Direct lookup if TVmaze ID is already known (Confidence: `1.0`)
2. **IMDb ID Match**: Authoritative bridge e.g. `/lookup/shows?imdb=tt...` (Confidence: `1.0`)
3. **TheTVDB ID Match**: Cross-reference via `/lookup/shows?thetvdb=...` (Confidence: `0.95`)
4. **Normalized Title + Year Search**: Bigram similarity (Dice coefficient) on diacritic-stripped, article-trimmed titles with premiere year window ±1 (Confidence: `0.75 - 0.92`)
5. **Safe Rejection**: Any candidate below `0.65` confidence is rejected to prevent false matches.

### F. PWA Boot, Service Worker Lifecycle & Watchdog Self-Healing Flow

```
[Browser Loads HTML Document]
       │
       ├──► 1. index.html renders critical inline CSS + skeleton app shell
       │       (Dark background, red "CT" logo; prevents unstyled content flash)
       │
       ├──► 2. public/sw.js (Service Worker v2)
       │       ├── install: self.skipWaiting() activates new worker immediately
       │       ├── activate: purges all legacy caches (cinetrekker-public-shell-v1)
       │       └── fetch:
       │           - request.mode === 'navigate': Network-First (NEVER cached in CacheStorage)
       │           - Offline fallback: serves /offline.html only on connection failure
       │           - Static chunks (/assets/*): delegated directly to browser native HTTP cache
       │
       ├──► 3. public/boot-watchdog.js
       │       ├── Starts 12-second watchdog timer
       │       ├── Listens for window event "cinetrekker:mounted" from React bootstrap
       │       └── On timeout (>12s): replaces shell with "CineTrekker could not finish loading"
       │           └── Clicking "Reload page" actively purges window.caches, updates SW registrations,
       │               clears sessionStorage retry counter, and reloads with cache-busting timestamp (_cb=...)
       │
       └──► 4. React App Mounts (main.tsx)
               ├── window.dispatchEvent(new Event("cinetrekker:mounted"))
               └── Watchdog cleared; interactive UI rendered
```

### G. TV Season Selector & Episode Presentation Invariants (`Details.tsx`)

To support multi-season TV shows without visual clutter, the season navigation on `/tv/:slug` uses a consolidated Radix `Select` dropdown in place of legacy horizontal button rails.

```
[SelectTrigger: h-11 w-64]
├── [Poster: h-7 w-5] ──► [Season Label: "Season N"] ──► [Progress Badge: "X/Y" (emerald if 100%)] ──► [ChevronDown]
│
▼ [SelectContent: w-[18rem] align="end" backdrop-blur-xl]
├── [SelectItem: S1] ──► [Check Indicator] ──► [Poster: h-9 w-6] ──► [Title + Progress Bar + "X/Y"] ──► [Done Badge]
├── [SelectItem: S2] ──► [Check Indicator] ──► [Poster: h-9 w-6] ──► [Title + Progress Bar + "X/Y"]
└── ...
```

#### Critical CSS & Layout Invariants:
1. **Line-Clamp Flex Override on `SelectTrigger`**:
   - The base Shadcn / Radix `SelectTrigger` applies `[&>span]:line-clamp-1`. Because `line-clamp-1` enforces `display: -webkit-box; -webkit-box-orient: vertical`, any multi-element composite inside `<SelectValue>` (such as `<img>` + title text + progress badge) is treated as separate vertical lines. This previously caused the poster to stack above the title and poke outside the top border.
   - **Rule**: `SelectTrigger` must explicitly include `[&>span]:flex [&>span]:items-center [&>span]:gap-2.5 [&>span]:line-clamp-none [&>span]:min-w-0 [&>span]:flex-1`.
2. **ItemIndicator Clearance on `SelectItem`**:
   - Radix UI's `SelectItem` positions its `<SelectPrimitive.ItemIndicator>` at `absolute left-2.5`.
   - **Rule**: Do not apply generic `px-3` or `pl-3` to `SelectItem`. Always preserve `pl-9` (36px left padding) so the checkmark indicator never overlaps the season poster thumbnail.
3. **Poster Thumbnail Dimensions**:
   - Trigger thumbnail: standard `h-7 w-5` (20x28px, 1:1.4 aspect ratio) with `border border-white/10` and `shrink-0`.
   - Dropdown item thumbnail: standard `h-9 w-6` (24x36px, 1:1.5 aspect ratio). Avoid non-standard classes like `w-5.5` or `w-6.5`.
4. **Deep-Linking Parameter Synchronization**:
   - Season selection immediately synchronizes with the URL search param `?season=N` via `setSearchParams(..., { replace: true })`, preserving deep links and back-forward navigation without pushing redundant history entries.

---

## 3. Security, Authorization & Invariants

1. **Client / Server Key Isolation**:
   - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are the only Supabase keys bundled in client code.
   - `SUPABASE_SERVICE_ROLE_KEY`, `TMDB_API_KEY`, `OMDB_API_KEY`, `CRON_SECRET`, `RESEND_API_KEY`, and Upstash credentials must remain server-side in Vercel environment variables.
2. **Row Level Security (RLS) Policies**:
   - `public.profiles`: Direct reads are restricted to `auth.uid() = user_id`. Public profile access must call `get_public_profile_summary()` which enforces `is_public = true`.
   - `public.user_watchlist` & `public.user_watched`: Restricted to `auth.uid() = user_id`.
   - `public.notifications`: Inserts are restricted to service role (`auth.uid() IS NULL`); users can only select, mark read, or delete their own rows.
3. **API Protection (`api/_lib/requestSecurity.js`)**:
   - All serverless endpoints validate HTTP methods (`GET`, `POST`, `DELETE`).
   - Origins are checked in production (`cinetrekker.vercel.app`).
   - Sliding-window rate limiting is backed by Upstash Redis REST API or in-memory fallback.
4. **Architectural Invariants**:
   - **Vercel Hobby 12-Function Budget**: Vercel's Hobby plan strictly permits a maximum of **12 Serverless Functions**. All endpoints in `api/` must remain consolidated (e.g. `api/enrichment.ts` handles ratings and schedules via `?action=`; `api/follow.ts` handles POST follow and DELETE unfollow via rewrite).
   - **HTML Navigations Must Never Be Cached In Service Worker**: Single-page app HTML must always remain Network-First to prevent stale chunk mismatches across deployments.
   - **Fail-Soft External APIs**: Missing third-party API keys (e.g., `OMDB_API_KEY`) or upstream rate limits must fail soft with null data and HTTP 200, never breaking the UI.
   - **Guest Persistence**: Guest users must never lose watchlist/watched data upon browser reload or when signing up.
   - **Catalog Resilience**: A TMDB failure must never prevent a user from managing their watchlist, history, or profile.
   - **Zero PII Leakage**: No search queries, titles, email addresses, or unmasked IPs in logging or metrics.
