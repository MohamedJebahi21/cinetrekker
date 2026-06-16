/**
 * TMDB Resolver — batched, cached fetcher for TV details and seasons.
 *
 * Leverages the existing tmdb.ts service caching layer but adds:
 * - Show-level deduplication (no two callers fetch the same show)
 * - Aggressive in-memory LRU (5-min TTL) for repeated renders
 *
 * The key improvement over the old code:
 * - Promise.all() all shows → parallel, not sequential
 * - Deduped: same showId across multiple callers = 1 network call
 * - Season episode data: we only fetch the single needed season per show
 */

import { getTVDetails, getTVSeasonDetails } from "@/services/tmdb";
import type { MediaDetails } from "@/types/media";

/** Simple in-memory cache entry with TTL. */
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const TTL_MS = 5 * 60 * 1000;
const globalCache = new Map<string, CacheEntry<unknown>>();

function cacheGet<T>(key: string): T | null {
  const entry = globalCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    globalCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function cacheSet<T>(key: string, data: T): void {
  globalCache.set(key, { data, expiresAt: Date.now() + TTL_MS });
  // LRU eviction: if cache > 500, delete oldest 100
  if (globalCache.size > 500) {
    const keys = Array.from(globalCache.keys()).slice(0, 100);
    for (const k of keys) globalCache.delete(k);
  }
}

/** In-flight tracker prevents duplicate simultaneous requests. */
const inFlight = new Map<string, Promise<unknown>>();

async function dedupedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cached = cacheGet<T>(key);
  if (cached) return cached;

  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = fetcher()
    .then((data) => {
      cacheSet(key, data);
      return data;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

export interface SeasonFetchRequest {
  showId: number;
  seasonNumber: number;
}

export type SeasonResult = Awaited<ReturnType<typeof getTVSeasonDetails>> | null;

/**
 * Batch-fetch TV details for multiple shows in parallel.
 * Returns a Map<showId, MediaDetails | null> (null = fetch failure).
 */
export async function batchResolveTVDetails(
  showIds: number[],
  language: string,
): Promise<Map<number, MediaDetails | null>> {
  const unique = Array.from(new Set(showIds));
  const results = new Map<number, MediaDetails | null>();

  await Promise.all(
    unique.map(async (id) => {
      try {
        const data = await dedupedFetch(`tv:${id}:${language}`, () =>
          getTVDetails(id, language),
        );
        results.set(id, data);
      } catch {
        results.set(id, null);
      }
    }),
  );

  return results;
}

/**
 * Batch-fetch season details for many shows in parallel.
 * Returns a Map<"season:{showId}:{seasonNumber}:{language}", SeasonResult | null>.
 */
export async function batchResolveSeasons(
  requests: SeasonFetchRequest[],
  language: string,
): Promise<Map<string, SeasonResult>> {
  const unique = Array.from(
    new Map(requests.map((r) => [`${r.showId}-${r.seasonNumber}`, r])).values(),
  );
  const results = new Map<string, SeasonResult>();

  await Promise.all(
    unique.map(async ({ showId, seasonNumber }) => {
      const key = `season:${showId}:${seasonNumber}:${language}`;
      try {
        const data = await dedupedFetch(key, () =>
          getTVSeasonDetails(showId, seasonNumber, language),
        );
        results.set(key, data);
      } catch {
        results.set(key, null);
      }
    }),
  );

  return results;
}