# CineTrekker Project Context & System Map

> **Canonical Current-State Specification**  
> *Last Updated: 2026-09-16*  
> This file describes the actual operational state, architecture, database schemas, business rules, design tokens, security boundaries, and navigation map for CineTrekker.

---

## 1. Project Overview

- **Product Identity**: CineTrekker is a responsive movie, TV, and cinema tracking web platform.
- **Core Value Proposition**: Rapid search and catalog discovery across TMDB, local-first watchlists and watch history (operable immediately without signing in), follow-based release notifications, TV season/episode tracking with persistent progress cursors, personalized rating-based recommendations, and privacy-shielded public social profiles.
- **Target Audience**: Cinephiles, casual moviegoers, binge watchers, and cinema communities.
- **Current Operational Status**: Production-grade, deployed to Vercel with Supabase backend. Automated release gates (`test:security`, `test:privacy`, `i18n:verify`, `lint`, `type-check`) are passing.

---

## 2. Technology Stack & Runtime Environments

Verified directly from repository manifests (`package.json`, `vite.config.ts`, `api/`, `supabase/`):

| Domain | Selected Stack & Version | Purpose in CineTrekker |
|---|---|---|
| **Language & Typing** | TypeScript 5.9.3 (`typescript@^5.9.3`), Node.js 22 (`engines.node: "22.x"`) | Strict type checking across client and scripts |
| **Client UI Framework** | React 19.2.4 (`react@^19.2.4`, `react-dom@^19.2.4`) | Component rendering and concurrency |
| **Bundler & Build** | Vite 8.0.16 (`vite@^8.0.16`), `@vitejs/plugin-react-swc@^4.3.1` | Fast HMR dev server & optimized rollup production builds |
| **Routing** | React Router v7 (`react-router-dom@^7.11.0`) | Client-side routing with lazy-loaded code-split chunks |
| **Server State / Cache**| TanStack Query v5 (`@tanstack/react-query@^5.83.0`) | Async caching, mutation lifecycles, and cache invalidation |
| **UI Component System** | Radix UI primitives (`@radix-ui/react-*`), Lucide Icons (`lucide-react@^0.462.0`) | Accessible unstyled primitives, dialogs, dropdowns, tooltips |
| **Styling Engine** | Tailwind CSS v3.4.19 (`tailwindcss@^3.4.19`), PostCSS 8.5.6 | Utility-first styling with HSL CSS custom properties |
| **Backend & Auth** | Supabase (`@supabase/supabase-js@^2.90.1`, GoTrue Auth, Postgres 15) | Auth sessions, relational data, RLS, Definer RPCs, storage |
| **Serverless Functions**| Node.js 22 ES Modules (`api/*.js` deployed on Vercel) | Secret TMDB proxying, rate limiting, cron workers, health probes |
| **Distributed Cache** | Upstash Redis REST API (`@upstash/redis` compatible via REST fetch) | Sliding-window IP/user rate limiting across serverless instances |
| **Internationalization**| `i18next@^25.7.4`, `react-i18next@^16.5.2` | Multi-locale support (`en`, `ar`, `de`, `es`, `fr`, `tr`) with strict audits |
| **Testing** | Node.js Test Runner (`node --test`), Playwright (`@playwright/test@^1.58.2`) | API security unit tests, privacy tests, E2E browser tests |
| **Telemetry & Alerts** | Sentry React/Node (`@sentry/react@^10.70.0`), Webhook alerts | Error scrubbing, incident webhook alerting, zero-PII metrics |

---

## 3. Directory Layout & Architectural Boundaries

```
cinetrekker/
├── api/                           # Vercel Serverless Endpoints (Node.js 22 runtime)
│   ├── _lib/                      # Server helpers: env.js, http.js, logger.js,
│   │                              # requestSecurity.js (rate limiting), supabaseAdmin.js,
│   │                              # securityMonitor.js, operationalMonitor.js
│   ├── jobs/                      # Background cron workers
│   │   └── check-followed-updates.js # Cursor-driven follower update checker
│   ├── user/                      # Authenticated user endpoints (followed.js)
│   ├── client-errors.js           # Privacy-scrubbed client incident collector
│   ├── edge-meta.js               # Crawler SSR meta tag & JSON-LD injection
│   ├── feedback.js                # Turnstile/Honeypot protected feedback via Resend
│   ├── follow.js / unfollow.js    # Follow/unfollow server actions
│   ├── health.js                  # Coarse dependency readiness probe (safe; no secrets)
│   ├── notifications.js           # Consolidated list, unread-count, and mark-read actions
│   ├── recommend.js               # AI & heuristic personalized recommendation generator
│   ├── sitemap.js                 # Dynamic XML sitemap builder
│   └── tmdb-proxy.js              # Cached & rate-limited proxy to api.themoviedb.org
├── docs/                          # Runbooks, audit logs, recovery plans, and history (121 files)
├── public/                        # Static assets, favicon, manifest, robots.txt
├── scripts/                       # CI/CD integrity scripts (check-bundle-budget, check-i18n-keys)
├── src/                           # Client Application Code
│   ├── components/                # UI presentation components
│   │   ├── ui/                    # Base Radix primitives & shadcn components
│   │   ├── movie/ & tv/           # Media cards, carousels, action buttons, episode grids
│   │   ├── Navigation.tsx         # Responsive header, quick search, locale & theme switches
│   │   └── ErrorBoundary.tsx      # Application crash boundary with incident reporting
│   ├── contexts/                  # React Contexts
│   │   ├── AuthContext.tsx        # Supabase auth session, signIn, signUp, OAuth preflight
│   │   ├── UserListsContext.tsx   # Top-level list context (delegates to Auth or Guest)
│   │   ├── AuthenticatedUserListsProvider.tsx # Supabase-synced list mutations & TanStack queries
│   │   ├── ThemeContext.tsx       # Dark/light theme engine & localStorage persistence
│   │   └── content-policy-context.tsx # Maturity filtering & content rating preferences
│   ├── hooks/                     # Custom React Hooks
│   │   ├── useGuestMediaLists.ts  # Local-first localStorage watchlist & watched manager
│   │   ├── useWatchlistQueries.ts # TanStack Query mutations for user_watchlist
│   │   ├── useWatchedQueries.ts   # TanStack Query mutations for user_watched
│   │   └── useMediaDetails.ts     # Media detail retrieval with fallback handling
│   ├── lib/                       # Core client utilities
│   │   ├── mediaEnrichment.ts     # Resilient TMDB hydration and fallback synthesis
│   │   ├── mediaFallback.ts       # Fallback object factory for offline/failed TMDB titles
│   │   ├── envValidation.ts       # Browser env checks (VITE_SUPABASE_URL, etc.)
│   │   ├── logger.ts              # Structured client logging
│   │   └── engagement.ts          # Zero-PII privacy-preserving aggregate telemetry
│   ├── locales/                   # i18n JSON resource files (en, ar, de, es, fr, tr)
│   ├── pages/                     # Routed page views (lazy-loaded in AppRoutes)
│   ├── services/                  # API client services (tmdb.ts, social.ts, profile.ts)
│   ├── types/                     # TypeScript schemas (media.ts, etc.)
│   ├── AppRoutes.tsx              # Central React Router tree with skeleton fallback
│   ├── App.tsx                    # Root provider composition tree
│   ├── index.css                  # CSS tokens, theme variables, custom utilities
│   └── main.tsx                   # React 19 bootstrap & Sentry error monitoring
├── supabase/                      # Supabase Infrastructure & Database State
│   ├── migrations/                # 32 SQL migrations defining tables, RLS, and RPCs
│   └── functions/                 # Supabase Edge Functions
└── tests/                         # Node test runner security & Playwright suites
```

---

## 4. Complete Application Routes Catalog

| Route Path | Component | Auth Required | Purpose & Behavior |
|---|---|---|---|
| `/` | `Index` | Public | Homepage: Hero carousel, Trending rails, Continue Watching, Up Next focus, personalized discovery. |
| `/search` | `Search` | Public | Multi-filter search (movie/tv/person), genre selector, sort filters, pagination. |
| `/trending` | `Trending` | Public | Trending media across day/week windows. |
| `/movie/:slug` | `Details` | Public | Movie synopsis, trailers, cast/crew, streaming providers, release dates, reviews, watch controls. |
| `/tv/:slug` | `Details` | Public | TV series overview, season selector, episode list, episode progress tracker, follow toggle. |
| `/person/:slug` | `Person` | Public | Biography, known-for titles, acting/directing filmography. |
| `/discover` | `Discover` | Public | Parametric catalog filtering (year ranges, ratings, genres, certifications). |
| `/movie-tracker`| `MovieTracker` | Public | Visual landing presentation of tracking capabilities and features. |
| `/genres` | `GenreBrowser` | Public | Grid of TMDB genres linking to pre-filtered search results. |
| `/decades` | `DecadeExplorer`| Public | Browse cinema by historic decade (1950s through 2020s). |
| `/awards` | `AwardWinners` | Public | Curated selections of Academy Award, Cannes, and BAFTA winners. |
| `/calendar` | `Calendar` | Public | Interactive calendar showing release dates of followed titles and upcoming movies. |
| `/watchlist` | `Watchlist` | Public/Guest/Auth | User watchlist. Works offline for guests; syncs to Supabase for signed-in users. |
| `/watched` | `Watched` | Public/Guest/Auth | Chronological watch history, personal ratings (1-10), notes, and viewing status tags. |
| `/profile` | `Profile` | **Protected** | Authenticated user profile, statistics summary, favorite genres/titles, taste radar. |
| `/user/:userId`| `UserProfile` | Public | View public community member profiles via sanitized RPC. Honors user `is_public` setting. |
| `/people` | `People` | Public | Community member directory and user search (filtered to public profiles). |
| `/following` | `Following` | **Protected** | Management view of followed movies and TV shows with alert controls. |
| `/notifications`| `Notifications`| Public/Auth | Notification center for episode air-dates, release reminders, and announcements. |
| `/recommendations`| `Recommendations`| **Protected**| Custom recommendation rails derived from high-rated watched titles. |
| `/stats` | `EnhancedStats` | **Protected** | Detailed analytics on watched hours, format breakdowns, genre distribution. |
| `/achievements`| `Achievements` | **Protected** | Gamified milestone badges (e.g. "Marathoner", "Sci-Fi Explorer"). |
| `/quests` | `Quests` | **Protected** | Thematic viewing challenges and cinema quests. |
| `/collections` | `Collections` | Public | Thematic user-curated and platform collections. |
| `/year-in-review`| `YearInReview`| **Protected** | Personalized annual retrospective of watched titles and trends. |
| `/print-watchlist`| `PrintWatchlist`| **Protected**| Clean, printer-friendly export view of the active watchlist. |
| `/settings` | `Settings` | **Protected** | Account security, display name, avatar upload, privacy toggles, notification options. |
| `/accessibility`| `AccessibilitySettings`| Public | Motion preferences, high contrast toggles, font scaling. |
| `/status` | `ServiceStatus` | Public | System status dashboard consuming coarse data from `/api/health`. |
| `/trust` | `TrustCenter` | Public | Security overview, data retention disclosure, privacy commitments. |
| `/partnerships`| `Partnerships` | Public | Sponsorship and partner principles without third-party tracking. |
| `/measurement` | `Measurement` | Public | Transparent measurement and analytics methodology disclosure. |
| `/feedback` | `Feedback` | Public | Form with Honeypot + Turnstile bot protection sending to support email. |
| `/about`, `/terms`, `/privacy`, `/cookies` | Respective | Public | Static legal, privacy policy, and informational compliance routes. |
| `*` | `TitleStatus` | Fallback | Intelligent 404 handler and dynamic title resolver. |

---

## 5. Database Schema & Tables (Supabase PostgreSQL)

| Table Name | Primary Key | Key Columns & Constraints | RLS Enforcement |
|---|---|---|---|
| `public.profiles` | `id (UUID)` | `user_id (UUID UNIQUE REFERENCES auth.users)`, `display_name`, `bio`, `profile_photo`, `avatar_url`, `favorite_genres (INT[])`, `favorite_titles (TEXT[])`, `is_public (BOOLEAN DEFAULT false)`, `show_age (BOOLEAN)` | Direct `SELECT/INSERT/UPDATE` strictly restricted to `auth.uid() = user_id`. Public reads use `get_public_profile_summary()`. |
| `public.user_watchlist` | `id (UUID)` | `user_id (UUID REFERENCES auth.users)`, `media_id (INT)`, `media_type ('movie'\|'tv')`, `added_at (TIMESTAMPTZ)`. UNIQUE(`user_id, media_id, media_type`) | Only owner: `auth.uid() = user_id` for SELECT, INSERT, DELETE. |
| `public.user_watched` | `id (UUID)` | `user_id (UUID REFERENCES auth.users)`, `media_id (INT)`, `media_type ('movie'\|'tv')`, `rating (INT 1-10)`, `note (TEXT)`, `status ('watching'\|'completed'\|'dropped'\|'plan_to_watch')`, `watched_at (TIMESTAMPTZ)`. UNIQUE(`user_id, media_id, media_type`) | Only owner: `auth.uid() = user_id` for SELECT, INSERT, UPDATE, DELETE. |
| `public.movie_followers` | `id (UUID)` | `user_id (UUID REFERENCES auth.users)`, `movie_id (TEXT, e.g. 'movie-550', 'tv-1399')`, `created_at (TIMESTAMPTZ)`. UNIQUE(`user_id, movie_id`) | Only owner: `auth.uid() = user_id` for SELECT, INSERT, DELETE. |
| `public.followed_shows` | `id (UUID)` | `user_id (UUID REFERENCES auth.users)`, `show_id (INT)`, `show_name (TEXT)`, `poster_path (TEXT)`, `last_watched_season (INT)`, `last_watched_episode (INT)`. UNIQUE(`user_id, show_id`) | Only owner: `auth.uid() = user_id` for SELECT, INSERT, UPDATE, DELETE. |
| `public.watched_episodes` | `id (UUID)` | `user_id (UUID REFERENCES auth.users)`, `show_id (INT)`, `season_number (INT)`, `episode_number (INT)`, `episode_name (TEXT)`, `air_date (DATE)`, `watched_at (TIMESTAMPTZ)`. UNIQUE(`user_id, show_id, season_number, episode_number`) | Only owner: `auth.uid() = user_id`. Updated via atomic RPC `mark_tv_episode_watched()`. |
| `public.notifications` | `id (UUID)` | `user_id (UUID REFERENCES auth.users)`, `movie_id (TEXT)`, `type (TEXT)`, `message (TEXT)`, `is_read (BOOLEAN DEFAULT false)`, `event_key (TEXT)`, `group_key (TEXT)`, `expires_at (TIMESTAMPTZ)`, `archived_at (TIMESTAMPTZ)` | SELECT, UPDATE (is_read), DELETE allowed for owner. INSERT strictly restricted to service role (`auth.uid() IS NULL`). |
| `public.notification_preferences` | `user_id (UUID)` | `release_updates (BOOL DEFAULT true)`, `in_app_toasts (BOOL DEFAULT true)`, `social_activity (BOOL DEFAULT true)`, `weekly_digest (BOOL DEFAULT false)`, `browser_push_enabled (BOOL DEFAULT false)`, `digest_day (SMALLINT)` | Owner-only access (`auth.uid() = user_id`). |
| `public.push_subscriptions` | `id (UUID)` | `user_id (UUID REFERENCES auth.users)`, `endpoint (TEXT UNIQUE)`, `p256dh (TEXT)`, `auth (TEXT)`, `is_active (BOOLEAN DEFAULT true)` | Owner-only access (`auth.uid() = user_id`). |
| `public.notification_worker_state`| `worker_name (TEXT)`| `cursor_movie_id (TEXT)`, `last_started_at`, `last_completed_at`, `last_error_at`, `last_error_code`, `updated_at` | Service-role only table. No public access. |
| `public.collections` | `id (BIGINT)` | `user_id (UUID REFERENCES auth.users)`, `name (TEXT)`, `description (TEXT)`, `items (JSONB)` | Owner-only access (`auth.uid() = user_id`). |
| `public.collection_items`| Composite PK | `collection_id (BIGINT REFERENCES collections)`, `media_id (BIGINT)`, `media_type ('movie'\|'tv')`, `added_at` | Access allowed if user owns parent collection (`collections.user_id = auth.uid()`). |

### Key Stored Procedures & Security Definer RPCs
- `get_public_profile_summary(target_user_id)`: Exposes only safe public profile fields (avatar, display name, bio, follower counts, favorites) if `is_public = true` or `target_user_id = auth.uid()`.
- `list_public_profiles(search_term, result_limit)`: Returns search results across public profiles without leaking private fields.
- `mark_tv_episode_watched(...)`: Atomic transaction updating `watched_episodes` and syncing `last_watched_season/episode` in `followed_shows`.
- `notification_followed_title_batch(after_movie_id, batch_size)`: Service-role query for cursor-based follower batch processing. Client execution revoked.

---

## 6. Business Logic Rules

1. **Guest Mode & Seamless Sync**:
   - Unauthenticated visitors store watchlists and watched history in `localStorage` under `STORAGE_KEYS` (`mywatch_watchlist`, `mywatch_watched`).
   - When the user registers or logs in, `AuthenticatedUserListsProvider.tsx` detects guest items and performs an upsert migration to Supabase without overwriting existing cloud items.
2. **Media Enrichment Fallback**:
   - Database tables store IDs and types (`media_id: 157336`, `media_type: 'movie'`).
   - The UI hydrates metadata (title, poster, rating, runtime) on the fly using `enrichMediaItems`.
   - If TMDB fails or times out, `createFallbackMedia()` produces a synthetic placeholder ensuring the user can still remove, view, or change the status of the item.
3. **Maturity Content Policy**:
   - Server-side proxy `/api/tmdb-proxy` accepts `maturity_level` parameter (`strict`, `moderate`, `none`).
   - For `strict` or `moderate`, `include_adult=false` is enforced, certification filters (`PG-13` / `R`) are attached to Discover calls, and returned payloads are scrubbed.
4. **Followed Title State & 90-Day Notification Compaction**:
   - TV airings or movie release shifts generate notifications grouped by `group_key` and tagged with `expires_at = now() + 90 days`.
   - Superseded duplicate notifications are merged using `event_key`.

---

## 7. Design System & Tokens

Defined in `tailwind.config.ts` and `src/index.css`:
- **Color Variables (HSL)**:
  - `--background`: Cinematic dark base (`222 47% 7%`), light (`0 0% 100%`)
  - `--foreground`: Text primary (`210 40% 98%` dark, `222 47% 11%` light)
  - `--card`: Surface backdrop (`222 47% 10%`) with `--card-hover` (`222 47% 14%`)
  - `--primary`: Accent blue/indigo (`217 91% 60%`)
  - `--muted` / `--muted-foreground`: Secondary text with WCAG contrast enforcement
  - `--rating-high` (`hsl(142 76% 36%)`), `--rating-medium` (`hsl(38 92% 50%)`), `--rating-low` (`hsl(0 84% 60%)`)
- **Animation & Transitions**:
  - `skeleton-shimmer`: Shimmering gradient animation for placeholders
  - Motion tokens strictly disable animations when `@media (prefers-reduced-motion: reduce)` is detected.
- **RTL Support**: Native layout mirroring for Arabic locale (`dir="rtl"`).

---

## 8. Security & Rate Limiting Specifications

- **Rate Limits (`api/_lib/requestSecurity.js`)**:
  - `tmdb-proxy`: 60 requests / minute per IP
  - `feedback`: 3 requests / 10 minutes per IP
  - `follow` / `unfollow`: 12 / min (IP), 20 / min (User)
  - `notifications-list`: 20 / min (IP), 45 / min (User)
  - `client-errors`: 8 / min per IP
- **Bot Protection**: Feedback endpoint requires Cloudflare Turnstile verification or Google reCAPTCHA, supplemented with hidden honeypot fields.
- **Error Scrubbing**: `api/client-errors.js` and `src/lib/errorScrubber.ts` strip query strings, tokens, passwords, and PII before dispatching to Sentry or webhooks.

---

## 9. Project Navigation Map (What to read first)

| If you need to modify... | Read / Inspect these files first: |
|---|---|
| **Watchlist / Watched tracking** | `src/contexts/UserListsContext.tsx`, `src/contexts/AuthenticatedUserListsProvider.tsx`, `src/hooks/useGuestMediaLists.ts`, `src/hooks/useWatchlistQueries.ts`, `src/hooks/useWatchedQueries.ts` |
| **TV Episode Tracking** | `supabase/migrations/20260729140000_tv_episode_progress_rpc.sql`, `src/components/tv/`, `src/pages/Details.tsx` |
| **TMDB API integration** | `api/tmdb-proxy.js`, `src/services/tmdb.ts`, `src/lib/mediaEnrichment.ts`, `src/lib/mediaFallback.ts` |
| **Authentication & Auth flow** | `src/contexts/AuthContext.tsx`, `src/components/ProtectedRoute.tsx`, `src/pages/Auth.tsx`, `src/pages/AuthCallback.tsx` |
| **Follow & Notification jobs** | `api/jobs/check-followed-updates.js`, `api/notifications.js`, `supabase/migrations/20260824190000_notification_scale_and_retention.sql` |
| **Social, Profiles & Privacy** | `src/services/social.ts`, `src/services/profile.ts`, `supabase/migrations/20260814190000_add_public_social_profile_rpc.sql`, `supabase/migrations/20260820215500_harden_private_profile_select_rls.sql` |
| **Design tokens & UI styling** | `src/index.css`, `tailwind.config.ts`, `src/components/ui/` |
| **Routes & Page Loading** | `src/AppRoutes.tsx`, `src/App.tsx`, `src/components/ErrorBoundary.tsx` |
| **Security & Rate Limiting** | `api/_lib/requestSecurity.js`, `api/_lib/supabaseAdmin.js`, `tests/security-api.test.mjs` |
| **Internationalization (i18n)** | `src/i18n.ts`, `src/locales/`, `scripts/check-i18n-keys.mjs` |
