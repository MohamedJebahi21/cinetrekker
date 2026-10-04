# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Dependabot dependency groups**: Configured `.github/dependabot.yml` with grouped dependency updates to batch PRs instead of 1 PR per package; reduced `open-pull-requests-limit` to 5 (npm) and 3 (actions).
- **Dependabot ignore rules**: Added `ignore` conditions for `zod` major versions (v4+ breaks schema layer), `react-dom` minor/major (must be upgraded with `react`), and `tailwindcss` major versions to prevent failing PR storms.
- **GitHub Actions v7 upgrades**: Updated all workflows to use `actions/checkout@v7`, `actions/setup-node@v7`, `actions/upload-artifact@v7` (Dependabot PRs #34, #35, #36).

### Security
- **DOMPurify XSS fix**: Bumped `dompurify` (transitive via `isomorphic-dompurify`) from 3.4.13 → 3.4.16; fixes `GHSA-p98j-92pf-mc4p` (DOM XSS via `IN_PLACE` afterSanitize hook) (PR #49).
- **Axios security patches**: Bumped `axios` (dev-only via `wait-on`) from 1.18.1 → 1.20.0; resolves 12 CVEs including prototype pollution, ReDoS, and HTTP/2 adapter vulnerabilities (PR #48).
- **Runtime audit clean**: `npm audit --omit=dev --audit-level=high` reports **0 vulnerabilities** in the production dependency tree.

### Changed
- **Dependency consolidation**: Batched 14 Dependabot PRs (#34–#46, #48, #49) into a single verified commit after confirming all had green CI + Vercel previews. Packages updated: `@radix-ui/react-context-menu` 2.2.15→2.3.7, `@radix-ui/react-dropdown-menu` 2.1.16→2.1.24, `@radix-ui/react-hover-card` 1.1.14→1.1.23, `@radix-ui/react-progress` 1.1.7→1.1.16, `@types/lodash` 4.17.24→4.17.25, `eslint` 10.8.0→10.11.0, `react-hook-form` 7.61.1→7.89.0, `react-i18next` 16.5.2→17.0.15, `react-router-dom` 7.11.0→7.18.4.
- **Stale PR cleanup**: Closed PR #33 (Devin — `buildMediaPath` import already merged to main), PR #40 (react-dom only bump without matching react), PR #47 (Zod v4 breaking major).
- **Documentation synchronization**: Updated `docs/PROJECT_CONTEXT.md`, `docs/ARCHITECTURE.md`, `docs/AI_RULES.md`, `AGENTS.md`, `CLAUDE.md`, and `.github/copilot-instructions.md` with detailed architecture, chunk load error recovery system, deployment caching policies, branch protection rules, and npm standards so all AI agents have complete, synchronized context.

---

## [1.0.0] - 2026-10-04

### Added
- **Open-source governance**: Added root `LICENSE` (MIT), `SECURITY.md` (vulnerability disclosure policy), `CODE_OF_CONDUCT.md` (Contributor Covenant v2.1), and `CONTRIBUTING.md` (branching, quality gates, and Vercel Hobby invariants).
- **GitHub community templates**: Added `.github/ISSUE_TEMPLATE/` (bug report, feature request), `.github/PULL_REQUEST_TEMPLATE.md`, and `.github/dependabot.yml` (weekly updates for npm and GitHub Actions).
- **Environment & Node pinning**: Added `.nvmrc` pinning Node 22; standardized `engines` in `package.json` on `node: 22.x` and `npm: >=10.0.0`.
- **Issue drafts backlog**: Converted completed launch backlog and external action items into `docs/issue-drafts.md` with credential rotation and security follow-ups.
- **Design context**: Relocated brand personality and aesthetic principles to `docs/design-context.md`.
- **Multi-source attribution on About page**: Added dedicated provider links and attribution for TMDB, OMDb API, and TVmaze on `/about` (`src/pages/About.tsx`).
- **GitHub repository security**: Enabled Dependabot alerts, automated security updates, secret scanning, secret scanning push protection, and branch protection on `main`.

### Fixed
- **Deployment chunk load error auto-recovery**: Implemented 4-tier chunk recovery system across `src/lib/chunkErrorRecovery.ts` and `src/components/ErrorBoundary.tsx` with `vite:preloadError` listener, regex matching for `ERR_CACHE_READ_FAILURE` and missing dynamic imports, cache purging (`window.caches`), service worker update, and automatic timestamped reload (`?_cb=`).
- **Blocked analytics error handling**: Added silent `script.onerror` handler in `src/components/UmamiAnalytics.tsx` to eliminate console noise when ad blockers block analytics scripts.
- **Vercel Cache-Control headers**: Added uncacheable header for `/sw.js` (`no-cache, no-store, must-revalidate`) and `stale-while-revalidate` for app icons and manifests to prevent 304 cache-read failure loops.

### Changed
- **Canonical documentation structure**: Consolidated canonical guides (`AI_RULES.md`, `PROJECT_CONTEXT.md`, `ARCHITECTURE.md`, `DEFINITION_OF_DONE.md`) in `docs/` and updated links across `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, and `README.md`.
- **Package metadata**: Renamed package from generic `vite_react_shadcn_ts` to `cinetrekker` and added description, author, repository, homepage, bug tracker, keywords, and license fields.
- **README rewrite**: Comprehensive overhaul with status badges, live demo link, architecture overview with Mermaid diagram, complete environment variables reference table, testing guide, and TMDB/OMDb/TVmaze attribution.
- **Test configuration relocation**: Moved `lighthouserc.desktop.json` to `tests/config/`.

### Removed
- **Tracked build caches & archives**: Removed `.pnpm-store/` (123 files), `tsconfig.tsbuildinfo`, `cinetrekker.tar.gz` (14.8 MB), stray `.tgz` archives, and empty `supabase_dump_data.sql`.
- **Stray scripts & local logs**: Removed `server.cjs`, `scratch/` (containing hardcoded Supabase test tokens), `audit-artifacts/`, `.homepage-engagement-verification.md`, and `vite-localhost.log`.
- **Generated test outputs**: Removed stale `playwright-*-matrix.json` and `.last-run.json` from root.
- **Untracked Vercel metadata**: Untracked `.vercel/` link metadata from git via `git rm --cached` while preserving local links on disk.

---

## 2026-09-30 — Post-Audit Quality Fixes

### Fixed
- **Incorrect OpenAI model name (`api/recommend.js`)**: Changed hard-coded `"gpt-5-mini"` (non-existent model ID) to `getServerEnv("OPENAI_MODEL", "gpt-4o-mini")`. Every recommendation call previously reached OpenAI with an unknown model name.
- **Dead variable re-declaration removed (`api/recommend.js`)**: The inner `const openaiBase` re-declaration inside the try block shadowed the outer variable. Removed.
- **Structured logging in `api/notifications.js` and `api/follow.ts`**: Replaced three raw `console.error(...)` calls with `logger.error(...)` from `createServerLogger`. Errors now emit with `[notifications]` / `[follow]` scope prefixes, consistent with the rest of the API layer.
- **Missing `staleTime` on 4 core queries in `src/pages/Details.tsx`**: Default `staleTime: 0` caused unnecessary TMDB refetches on every mount/focus. Added per-query policies: 5 min (details), 24 h (season-details), 6 h (watch-providers), 1 h (similar-titles).
- **`seasonProgress` computed against unloaded season data (`src/pages/Details.tsx`)**: The memo previously iterated all season numbers against a single loaded season's episodes, producing `0/0` for every other season. Now groups only loaded episodes so unloaded seasons show no progress bar at all.

### Added
- **TVmaze episode air time & runtime enrichment (`src/pages/Details.tsx`)**: Wired `useEnrichedTVEpisodes` into the episode list and mapped TVmaze-provided exact air times (e.g. `22:00`) alongside broadcast dates, as well as fallback runtimes when TMDB has missing episode durations.
- **TVmaze provider unit test suite (`tests/tvmaze-provider.test.mjs`)**: Added 6 tests covering broadcast schedule extraction (networks and web channels), next/previous episode extraction with HTML stripping, normalized series/seasons/specials assembly, and graceful fail-soft handling when embedded data is absent. Included in `npm run test:unit` (now 116 tests total).
- **`OPENAI_MODEL` / `OPENAI_API_BASE` environment variables (`.env.example`)**: Operators can now target `gpt-4o`, Azure OpenAI, or a local Ollama proxy without a code change.

### Verified
- `npm run lint` → 0 errors / 0 warnings
- `npm run type-check` → 0 errors
- `npm run test:security` → 18/18
- `npm run test:unit` → 116/116
- `npm run build` → clean, 1 127.9 KiB preload graph

---

## 2026-09-30 — Dependency hygiene & build warning cleanup

### Fixed
- **Production build noise (`index.html`)**: Removed the commented Umami placeholder script that still contained `%VITE_ANALYTICS_*%` tokens. Vite was warning on every build even though analytics load only through the consent-gated `UmamiAnalytics` component.
- **Dependency vulnerabilities (`package-lock.json`)**: Ran `npm audit fix` to resolve eight moderate/high transitive advisories (including `brace-expansion`, `browserslist`, `joi`, `nanoid`, and `undici`). `npm audit --audit-level=moderate` now reports zero vulnerabilities.

### Verified
- `npm run test:ci`, `npm run build`, and `npm run test:smoke` pass after the lockfile refresh.

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
