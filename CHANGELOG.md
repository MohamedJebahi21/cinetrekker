# CineTrekker Engineering Changelog

> **Chronological Engineering History**  
> All meaningful architectural, functional, security, and repository workflow changes are documented here.

---

## 2026-09-24 — TV Season Navigation Redesign & Alignment Fixes

### Added
- **Accessible TV Season Select Dropdown (`src/pages/Details.tsx`)**:
  - Replaced cramped horizontal season pill buttons (`S1`, `S2`) with a consolidated Radix `Select` dropdown.
  - Trigger displays active season poster thumbnail, season label, and a watched/total progress badge (emerald pill when complete, muted otherwise).
  - Dropdown options display season poster thumbnail (`h-9 w-6`), bold season title, mini watch progress bar, and completion badges.
  - Synchronizes selection with URL query parameter (`?season=N`) via `setSearchParams(..., { replace: true })` for seamless deep linking.

### Fixed
- **Season Select Dropdown Trigger Layout & Indicator Clearance**:
  - Overrode default Radix `[&>span]:line-clamp-1` constraint on `SelectTrigger` by applying `[&>span]:line-clamp-none` and `[&>span]:flex [&>span]:items-center [&>span]:gap-2.5 [&>span]:min-w-0 [&>span]:flex-1`, preventing `-webkit-box` line breakage that previously caused the poster to stack vertically above the title and clip outside the top border.
  - Added `pl-9` (36px left padding) clearance on `SelectItem` to eliminate overlap between Radix UI's `<Check>` selection indicator and the season poster thumbnail.
  - Standardized poster thumbnail dimensions to `h-9 w-6` with subtle borders and shadows.

---

## 2026-09-24 — TVmaze Metadata Provider Layer

### Added
- **Provider-Agnostic Metadata Architecture (`api/_lib/metadata/`)**:
  - `api/_lib/metadata/types.ts`: Normalized domain models for `NormalizedTVSeries`, `NormalizedEpisode`, `NormalizedSeason`, `TVBroadcastSchedule`, `NormalizedExternalIds`, `EnrichedRatingsSummary`, and a `StreamingProvider` interface placeholder for future Watchmode integration.
  - `api/_lib/metadata/providers/tvmaze.ts`: Full TVmaze client with token-bucket rate limiting (20 req/10s), in-memory caching (12h shows, 6h episodes), exponential backoff on 429s, 6s AbortController timeouts, and HTML-stripping. Supports show lookup by IMDb ID, TheTVDB ID, or TVmaze ID; episode catalog with specials/Season 0; and `normalizeTVmazeShow()`.
  - `api/_lib/metadata/providers/omdb.ts`: Extracted OMDb client from `enrichment.ts` into a dedicated reusable module with caching (7 days) and fail-soft behavior.
  - `api/_lib/metadata/idMatcher.ts`: Multi-stage deterministic cross-provider ID resolution (Exact TVmaze ID → IMDb ID → TheTVDB ID → Title+Year bigram similarity → reject below 0.65 confidence).
  - `api/_lib/metadata/normalizer.ts`: Field-by-field precedence merger (`mergeTVSeriesMetadata`, `mergeSeasonEpisodes`) enforcing: TMDB primary for catalog/poster/backdrop; TVmaze authoritative for broadcast schedule/network/airtimes/specials/next-prev episode; OMDb authoritative for external ratings.
- **New Enrichment Actions (`api/enrichment.ts`)**:
  - `action=tv-details` → full show info: network, broadcast schedule, seasons list, next/prev episode (12h cache).
  - `action=tv-episodes` → complete episode catalog incl. specials with exact air times (6h cache).
  - Existing `action=ratings` and `action=tv-schedule` remain 100% backward-compatible (no breaking changes).
  - Function count stays at **12** (helper modules in `_lib/` are not counted by Vercel).
- **`vercel.json` rewrites**: Added `/api/enrichment/tv-details` and `/api/enrichment/tv-episodes` path rewrites.
- **Frontend Hooks (`src/hooks/useEnrichedTVDetails.ts`)**: `useEnrichedTVDetails` and `useEnrichedTVEpisodes` React Query hooks — fail-soft, disabled for movies/missing IMDb IDs.
- **New Zod Schemas & Types (`src/lib/schemas/apiContracts.ts`)**: `TVDetailsResponse`, `TVEpisodesResponse`, `TVBroadcastSchedule`, `TVNextOrPrevEpisode`, `TVSeasonSummary`, `NormalizedEpisodeSchema` added.
- **Developer Documentation (`docs/metadata-providers.md`)**: Architecture diagram, provider responsibility table, API endpoint reference, ID resolution strategy, caching/rate-limiting spec, fail-soft guarantees, and a step-by-step guide for adding Watchmode.

### Changed
- `api/enrichment.ts` refactored to use `api/_lib/metadata/providers/omdb.ts` for ratings and `api/_lib/metadata/providers/tvmaze.ts` for TV schedule — no behavior change, improved testability and separation.
- `PROJECT_CONTEXT.md` updated: `_lib/metadata/` subtree documented, enrichment navigation row updated.

---

## 2026-09-24 — Content Enrichment, Follow Pilot TS Migration & Boot Resilience


### Added
- **External Multi-Source Content Enrichment:**
  - Added OMDb ratings endpoint (`api/enrichment/ratings.ts`) for Rotten Tomatoes, Metacritic, and IMDb ratings.
  - Added TVMaze next episode broadcast schedule endpoint (`api/enrichment/tv-schedule.ts`).
  - Added shared Zod validation contracts and TypeScript types in `src/lib/schemas/apiContracts.ts`.
  - Added React Query hooks `useEnrichedRatings` and `useTVSchedule`.
  - Integrated enrichment badges into web `src/pages/Details.tsx` and Flutter Android `ratings_badges.dart`.
- **Serverless TypeScript Migration (Pilot):**
  - Migrated `api/follow.js` and `api/unfollow.js` to TypeScript (`api/follow.ts`, `api/unfollow.ts`) with shared Zod contracts.

### Fixed
- **PWA Service Worker & Deployment Boot Resilience:**
  - Fixed Service Worker stale cache desynchronization in `public/sw.js`: added `self.skipWaiting()`, purged legacy caches, switched HTML navigation to strictly network-first, and let browser native cache manage `/assets/*`.
  - Added inline loading skeleton styles to `index.html` to eliminate the unstyled fallback flash ("CT CineTrekker").
  - Added self-healing cache purge and timestamped reload to `public/boot-watchdog.js` and `src/lib/chunkErrorRecovery.ts`.
  - Fixed cross-platform path resolution in `tests/professionalization-regression.test.mjs`.
- **Vercel Hobby Plan 12-Function Budget Compliance:**
  - Consolidated `ratings.ts` and `tv-schedule.ts` into a unified `api/enrichment.ts` (`action=ratings|tv-schedule`).
  - Unified `follow.ts` and `unfollow.ts` into `api/follow.ts` supporting both `POST` and `DELETE`, with `/api/unfollow` rewritten in `vercel.json`.
  - Restored total serverless function count to exactly 12, satisfying Vercel Hobby deployment constraints.

### Tests & Verification
- `npm run type-check`: Passed (0 errors).
- `npm run test:security`: Passed (18/18 passed).
- `npm run test:privacy`: Passed (5/5 passed).
- `npm run test:professionalization`: Passed (7/7 passed).
- `npm run i18n:verify`: Passed (0 missing keys).
- `npm run build`: Passed (production Vite bundle & budget audit successful).

---

## 2026-09-18 — Incremental Architecture Modernization & Detail Performance Optimization

### Added
- Created `src/lib/schemas/apiContracts.ts`: Single source of truth for shared Zod schemas and TypeScript types:
  - `followRequestSchema` / `FollowRequest`
  - `watchlistMutationSchema` / `WatchlistMutation`
  - `watchedMutationSchema` / `WatchedMutation`
  - `notificationMarkReadSchema` / `NotificationMarkRead`
  - `notificationListQuerySchema` / `NotificationListQuery`
  - `feedbackSubmissionSchema` / `FeedbackSubmission`
- Created `api/_lib/types.ts`: Core TypeScript definitions for serverless request/response, security results, and authentication models.
- Enhanced `MediaDetails` interface in `src/types/media.ts` with `"watch/providers"?: WatchProviders` property.

### Changed
- **Detail-Page Request Waterfall Optimization:**
  - Updated `src/services/tmdb.ts` (`getMovieDetails` and `getTVDetails`) to include `watch/providers` in `append_to_response`.
  - Updated `src/pages/Details.tsx` to consume `details?.["watch/providers"]` as `initialData` with 1-hour stale cache time, disabling redundant initial client round trips.
- Audited dual data-path architecture: direct Supabase with RLS vs. Vercel Serverless Function proxying.

### Fixed
- Fixed PostCSS module resolution dependency in workspace packages.

### Files affected
- `src/lib/schemas/apiContracts.ts`
- `api/_lib/types.ts`
- `src/types/media.ts`
- `src/services/tmdb.ts`
- `src/pages/Details.tsx`
- `PROJECT_CONTEXT.md`
- `ARCHITECTURE.md`
- `CHANGELOG.md`

### Database changes
- None.

### API changes
- TMDB proxy now transparently returns `watch/providers` sub-payload in the main movie/TV detail response via standard `append_to_response`.

### Tests & Verification
- `npm run type-check`: Passed cleanly (0 errors).
- `npm run test:security`: Passed (18/18 passed).
- `npm run test:privacy`: Passed (5/5 passed).
- `npm run i18n:verify`: Passed (100% parity across all 6 locales).
- `npm run build`: Passed (production Vite bundle & budget audit successful).

---

## 2026-09-16 — Knowledge System Deep Synchronization & Data Accuracy Update

### Added
- Completed deep schema and code inspection of all 32 SQL migrations in `supabase/migrations/`.
- Embedded verified table names, primary keys, foreign keys, unique constraints, and Row Level Security (RLS) policies into `PROJECT_CONTEXT.md` and `ARCHITECTURE.md`.
- Documented actual PostgreSQL tables: `profiles`, `user_watchlist`, `user_watched`, `movie_followers`, `followed_shows`, `watched_episodes`, `notifications`, `notification_preferences`, `push_subscriptions`, `notification_worker_state`, `collections`, `collection_items`.
- Documented stored procedures and security definer RPCs: `mark_tv_episode_watched`, `get_public_profile_summary`, `list_public_profiles`, `notification_followed_title_batch`.
- Documented exact rate limits from `api/_lib/requestSecurity.js` across endpoints (`tmdb-proxy`, `feedback`, `follow`, `notifications-list`, `client-errors`).
- Documented exact HTTP cache control policies and maturity level filtering logic from `api/tmdb-proxy.js`.

### Changed
- Refined `PROJECT_CONTEXT.md` from high-level abstractions to the exact database schema, tables, storage keys (`mywatch_watchlist`, `mywatch_watched`), and component trees discovered in source files.
- Refined `ARCHITECTURE.md` to document the actual 4-step technical data flows:
  1. Catalog Browsing & TMDB Serverless Proxy
  2. User Tracking & Resilient Media Enrichment
  3. TV Episode Progress Flow (Atomic RPC transaction)
  4. Scheduled Follow Updates & Notification Compaction
- Aligned agent adapter files (`AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`) to point directly to the updated root knowledge system.

### Fixed
- Replaced general references with exact table names (e.g. `user_watchlist` and `user_watched`, distinguishing from `movie_followers` and `followed_shows`).
- Clarified that `notifications` table `INSERT` is restricted to service role (`auth.uid() IS NULL`) while `SELECT`, `UPDATE` (is_read), and `DELETE` are permitted for owner.

---

## 2026-09-16 — Universal AI Knowledge & Engineering Workflow System Initial Setup

### Added
- Created canonical repository knowledge system at root: `AI_RULES.md`, `PROJECT_CONTEXT.md`, `ARCHITECTURE.md`, `DEFINITION_OF_DONE.md`, `CHANGELOG.md`.
- Created lightweight agent discovery adapters: `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`.
