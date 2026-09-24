# CineTrekker — Metadata Provider Architecture

## Overview

CineTrekker uses **three metadata providers** to serve movies and TV series. Each provider is authoritative for a specific data domain. The system is designed so a fourth provider (e.g. Watchmode for streaming availability) can be plugged in without rewriting any existing code.

```
                      ┌──────────────────────────────────────────┐
                      │           Frontend (React)               │
                      │  useEnrichedRatings  useTVSchedule       │
                      │  useEnrichedTVDetails useEnrichedTVEpisodes│
                      └─────────────────┬────────────────────────┘
                                        │  /api/enrichment/*
                                        ▼
                      ┌──────────────────────────────────────────┐
                      │    api/enrichment.ts  (1 of 12 fns)     │
                      │  action=ratings | tv-schedule            │
                      │  action=tv-details | tv-episodes         │
                      └──────┬──────────────┬────────────────────┘
                             │              │
               ┌─────────────┘              └───────────────────┐
               ▼                                                ▼
  ┌────────────────────┐                        ┌──────────────────────┐
  │  api/_lib/metadata/│                        │  api/_lib/metadata/  │
  │  providers/omdb.ts │                        │  providers/tvmaze.ts │
  │  (ratings)         │                        │  (TV metadata)       │
  └────────────────────┘                        └──────────────────────┘
```

The `api/_lib/metadata/` helper directory **does not count** toward Vercel's 12 serverless-function limit.

---

## Provider Responsibilities & Precedence

| Data Field | Authoritative Source | Fallback |
|---|---|---|
| Title, overview, genres | TMDB | TVmaze |
| Poster image | TMDB (image.tmdb.org) | TVmaze |
| Backdrop image | TMDB (image.tmdb.org) | — |
| Release date / premiere date | TMDB | TVmaze |
| Seasons list | TMDB | TVmaze |
| IMDb rating & votes | OMDb | — |
| Rotten Tomatoes score | OMDb | — |
| Metacritic score | OMDb | — |
| Awards / box office | OMDb | — |
| Broadcast network | TVmaze | — |
| Air days & time | TVmaze | — |
| Next episode pointer | TVmaze | — |
| Previous episode pointer | TVmaze | — |
| Episode air times (exact) | TVmaze | TMDB air_date only |
| Episode descriptions | TMDB | TVmaze (if TMDB blank) |
| Episode still images | TMDB | TVmaze |
| Specials / Season 0 | TVmaze | — |

---

## Module Map

```
api/
├── enrichment.ts                   ← Single serverless function (counted toward limit)
└── _lib/
    └── metadata/                   ← NOT counted toward 12-function limit
        ├── types.ts                ← Provider-agnostic normalized domain models
        ├── idMatcher.ts            ← Multi-stage cross-provider ID resolution
        ├── normalizer.ts           ← Precedence merger (TMDB + TVmaze + OMDb → unified)
        └── providers/
            ├── tvmaze.ts           ← TVmaze client (schedule, episodes, specials)
            └── omdb.ts             ← OMDb client (ratings)

src/
└── hooks/
    ├── useTVSchedule.ts            ← Existing: schedule + next episode (TVmaze)
    ├── useEnrichedTVDetails.ts     ← NEW: full TV show metadata from TVmaze
    └── (useEnrichedRatings.ts)     ← Ratings from OMDb via enrichment
```

---

## API Endpoints

All enrichment data flows through a single Vercel function (`api/enrichment.ts`), with path-based routing via `vercel.json` rewrites.

| URL Path | Query Param | Description |
|---|---|---|
| `/api/enrichment/ratings?imdb_id=ttXXXX` | `action=ratings` | IMDb/RT/Metacritic/Awards/BoxOffice (OMDb) |
| `/api/enrichment/tv-schedule?imdb_id=ttXXXX` | `action=tv-schedule` | Broadcast schedule + next episode (TVmaze) |
| `/api/enrichment/tv-details?imdb_id=ttXXXX` | `action=tv-details` | Full TV show info: network, schedule, seasons (TVmaze) |
| `/api/enrichment/tv-episodes?imdb_id=ttXXXX` | `action=tv-episodes` | All episodes incl. specials/Season 0 with air times (TVmaze) |

All endpoints accept only `GET` requests and return `application/json`.

---

## TVmaze Rate Limiting & Caching

TVmaze allows **20 requests per 10 seconds** (no API key required).

The provider client (`api/_lib/metadata/providers/tvmaze.ts`) implements:

- **Token bucket rate limiter** — 20 tokens / 10s refill window
- **In-memory caching** — Show details: 12 hours, Episodes: 6 hours
- **Exponential backoff** — Retries 429 responses with doubling delay (1s → 2s)
- **AbortController timeout** — 6s hard timeout per fetch call
- **Fail-soft** — All errors return `null`; callers degrade gracefully

OMDb caches for **7 days** (ratings rarely change).

---

## ID Resolution Strategy

When looking up a TV show across providers, `api/_lib/metadata/idMatcher.ts` uses this priority order:

1. **Exact TVmaze ID** — Highest confidence (1.0)
2. **IMDb ID** — Gold standard cross-provider bridge (1.0). Format: `ttXXXXXXX`
3. **TheTVDB ID** — Secondary provider bridge (0.95)
4. **Title + Year search** — Bigram similarity ≥ 0.95 + year within ±1 = confidence 0.85–0.92
5. **Reject** — Confidence below 0.65 threshold = no match returned

---

## Normalized Domain Models

All provider data is normalized into a common schema defined in `api/_lib/metadata/types.ts` before being returned to the frontend.

Key types:
- `NormalizedTVSeries` — Full TV show with schedule, seasons, episodes, specials
- `NormalizedEpisode` — Episode with airDate, airTime, isSpecial flag, TVmaze URL
- `NormalizedSeason` — Season with episode list
- `TVBroadcastSchedule` — Network, webChannel, days, time, timezone
- `NextOrPrevEpisode` — Upcoming/most-recent episode pointer
- `EnrichedRatingsSummary` — IMDb/RT/Metacritic/Awards/BoxOffice (OMDb output)
- `StreamingProvider` (interface) — **Placeholder for Watchmode** (not yet implemented)

---

## Frontend Hook Usage

```tsx
import { useEnrichedTVDetails, useEnrichedTVEpisodes } from "@/hooks/useEnrichedTVDetails";

// Inside a TV show detail page:
const { data: tvDetails } = useEnrichedTVDetails(imdbId, mediaType === "tv");
const { data: tvEpisodes } = useEnrichedTVEpisodes(imdbId, mediaType === "tv");

// tvDetails?.broadcastSchedule.network → "HBO"
// tvDetails?.broadcastSchedule.days    → ["Sunday"]
// tvDetails?.broadcastSchedule.time    → "21:00"
// tvDetails?.nextEpisode?.airdate      → "2026-10-05"
// tvEpisodes?.episodes[0].isSpecial    → false
// tvEpisodes?.episodes[0].airTime      → "21:00"
```

Both hooks are **fail-soft** — they return `null` if TVmaze is unavailable, and TMDB data continues to work normally.

---

## Fail-Soft Guarantees

- If **TVmaze is unreachable** → enrichment endpoints return `{ found: false }` or `{ episodes: [] }`. TMDB + OMDb continue normally.
- If **OMDb is unreachable** → ratings endpoint returns all-null fields. TMDB ratings still show.
- If **TMDB proxy is slow** → Frontend shows skeleton loaders; TVmaze schedule data loads independently.
- **No unhandled errors** are ever surfaced to users. All external call failures are caught internally.

---

## Adding Watchmode (Future)

Watchmode provides streaming availability data (which platforms a title can be watched on). To integrate it:

1. **Implement the `StreamingProvider` interface** in `api/_lib/metadata/providers/watchmode.ts`:

```typescript
import type { StreamingProvider, StreamingSource, NormalizedExternalIds } from "../types.ts";

export class WatchmodeProvider implements StreamingProvider {
  readonly name = "watchmode";

  async getWatchProviders(
    externalIds: NormalizedExternalIds,
    mediaType: "movie" | "tv",
    region = "US",
  ): Promise<StreamingSource[]> {
    // ... Watchmode API calls here
  }
}
```

2. **Add `WATCHMODE_API_KEY`** to Vercel environment variables.

3. **Add a new action** `action=streaming` to `api/enrichment.ts` (no new function file needed).

4. **Add a vercel.json rewrite**: `/api/enrichment/streaming` → `/api/enrichment?action=streaming`.

5. **Create a frontend hook** `useStreamingAvailability` that calls the new endpoint.

No existing provider code needs to change.

---

## Security Notes

- TVmaze API is fully public — no API key needed, no secret to protect.
- OMDb API key is stored as a Vercel environment variable (`OMDB_API_KEY`), never exposed to the client.
- All `api/enrichment` actions are guarded by `enforceRequestSecurity` (rate limiting, allowed methods, bot protection).
- The CSP does not need updating for TVmaze — all TVmaze calls are made server-side only.
