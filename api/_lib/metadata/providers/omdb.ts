/**
 * OMDb Metadata Provider Client
 *
 * Authoritative provider for external ratings:
 * IMDb rating & votes, Rotten Tomatoes score, Metascore, Awards, and Box Office.
 */

import { getServerEnv } from "../../env.js";
import type { EnrichedRatingsSummary } from "../types.ts";

const OMDB_BASE_URL = "https://www.omdbapi.com";
const DEFAULT_TIMEOUT_MS = 6000;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CacheEntry {
  data: EnrichedRatingsSummary;
  expiresAt: number;
}

const ratingsCache = new Map<string, CacheEntry>();

export const EMPTY_RATINGS: EnrichedRatingsSummary = {
  imdbRating: null,
  imdbVotes: null,
  rottenTomatoes: null,
  metascore: null,
  awards: null,
  boxOffice: null,
};

/**
 * Fetch authoritative ratings from OMDb by IMDb ID.
 */
export async function getRatingsByImdbId(
  imdbId: string,
): Promise<EnrichedRatingsSummary> {
  if (!imdbId || !/^tt\d{5,10}$/.test(imdbId)) {
    return { ...EMPTY_RATINGS };
  }

  const cached = ratingsCache.get(imdbId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const apiKey = getServerEnv("OMDB_API_KEY");
  if (!apiKey) {
    return { ...EMPTY_RATINGS };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    const url = `${OMDB_BASE_URL}/?i=${encodeURIComponent(imdbId)}&apikey=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "CineTrekker/1.0" },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return { ...EMPTY_RATINGS };
    }

    const data = (await response.json()) as Record<string, unknown>;
    if (data.Response === "False") {
      return { ...EMPTY_RATINGS };
    }

    let rottenTomatoes: string | null = null;
    if (Array.isArray(data.Ratings)) {
      const rtEntry = data.Ratings.find(
        (r: unknown) =>
          typeof r === "object" &&
          r !== null &&
          (r as Record<string, unknown>).Source === "Rotten Tomatoes",
      ) as Record<string, unknown> | undefined;
      if (rtEntry && typeof rtEntry.Value === "string") {
        rottenTomatoes = rtEntry.Value;
      }
    }

    const result: EnrichedRatingsSummary = {
      imdbRating:
        typeof data.imdbRating === "string" && data.imdbRating !== "N/A"
          ? data.imdbRating
          : null,
      imdbVotes:
        typeof data.imdbVotes === "string" && data.imdbVotes !== "N/A"
          ? data.imdbVotes
          : null,
      rottenTomatoes,
      metascore:
        typeof data.Metascore === "string" && data.Metascore !== "N/A"
          ? data.Metascore
          : null,
      awards:
        typeof data.Awards === "string" && data.Awards !== "N/A"
          ? data.Awards
          : null,
      boxOffice:
        typeof data.BoxOffice === "string" && data.BoxOffice !== "N/A"
          ? data.BoxOffice
          : null,
    };

    ratingsCache.set(imdbId, {
      data: result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return result;
  } catch {
    return { ...EMPTY_RATINGS };
  }
}
