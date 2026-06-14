// TMDB API Service - handles all TMDB API requests via edge function proxy
// SECURITY: All requests routed through Supabase Edge Function - API key NEVER exposed to client
import {
  Media,
  MediaDetails,
  TMDBResponse,
  TimeWindow,
  Genre,
  PersonSearchResult,
  WatchProviders,
} from "@/types/media";
import { SafetyLevel, type MaturityRating } from "@/lib/contentFilter";
import { createLogger } from "@/lib/logger";
import { ENV, getTmdbProxyUrl } from "@/lib/envValidation";
import { toDisplayTitle } from "@/lib/displayTitle";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";
const logger = createLogger("tmdb-client");
const SUPABASE_URL = ENV.VITE_SUPABASE_URL;
const SUPABASE_API_KEY = ENV.VITE_SUPABASE_ANON_KEY;
const USE_SUPABASE_EDGE_PROXY = import.meta.env.DEV;
const TMDB_PROXY_URL = getTmdbProxyUrl();

const CONTENT_POLICY_STORAGE_KEY = "cinetrekker_content_policy";
const TMDB_CACHE_MAX_ENTRIES = 300;
const TMDB_REQUEST_TIMEOUT_MS = 12_000;
const tmdbResponseCache = new Map<string, { expiresAt: number; data: unknown }>();
const tmdbInFlight = new Map<string, Promise<unknown>>();

function getCacheTTL(endpoint: string): number {
  if (endpoint.startsWith('/trending')) return 5 * 60_000; // 5 min
  if (endpoint.startsWith('/search')) return 30_000; // short-lived search cache
  if (endpoint.startsWith('/movie/') || endpoint.startsWith('/tv/')) {
    return 24 * 60 * 60_000; // 24 hours for media details
  }
  if (endpoint.startsWith('/person/')) {
    return 24 * 60 * 60_000;
  }
  return 2 * 60_000;
}

function makeCacheKey(endpoint: string, language: string, extraParams: Record<string, string>, maturityLevel: MaturityRating): string {
  const params = Object.entries(extraParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return `${endpoint}|lang=${language}|maturity=${maturityLevel}|${params}`;
}

function setCachedResponse(cacheKey: string, ttlMs: number, data: unknown): void {
  if (tmdbResponseCache.size >= TMDB_CACHE_MAX_ENTRIES) {
    const oldestKey = tmdbResponseCache.keys().next().value;
    if (oldestKey) tmdbResponseCache.delete(oldestKey);
  }
  tmdbResponseCache.set(cacheKey, { expiresAt: Date.now() + ttlMs, data });
}

function parseMaturityFromStorage(): {
  maturityLevel: MaturityRating;
  ageVerified: boolean;
} {
  if (typeof window === "undefined") {
    return { maturityLevel: SafetyLevel.NONE, ageVerified: true };
  }

  try {
    const raw = window.localStorage.getItem(CONTENT_POLICY_STORAGE_KEY);
    if (!raw) return { maturityLevel: SafetyLevel.NONE, ageVerified: true };

    const parsed = JSON.parse(raw) as {
      safetyLevel?: string;
      maturityRating?: string;
      ageVerified?: boolean;
      age?: number | null;
      strictFiltering?: boolean;
      moderateFiltering?: boolean;
      adultContentEnabled?: boolean;
    };

    const ageVerified =
      parsed.ageVerified === true || typeof parsed.age === "number";
    const tier = parsed.safetyLevel ?? parsed.maturityRating;
    if (
      tier === SafetyLevel.STRICT ||
      tier === SafetyLevel.MODERATE ||
      tier === SafetyLevel.NONE
    ) {
      return { maturityLevel: tier, ageVerified };
    }

    if (parsed.strictFiltering === true)
      return { maturityLevel: SafetyLevel.STRICT, ageVerified };
    if (parsed.moderateFiltering === true)
      return { maturityLevel: SafetyLevel.MODERATE, ageVerified };
    if (parsed.adultContentEnabled === true)
      return { maturityLevel: SafetyLevel.NONE, ageVerified };
    return { maturityLevel: SafetyLevel.NONE, ageVerified: true };
  } catch {
    return { maturityLevel: SafetyLevel.NONE, ageVerified: true };
  }
}

export const getImageUrl = (
  path: string | null,
  size: "w92" | "w154" | "w185" | "w342" | "w500" | "w780" = "w342",
) => {
  if (!path) return "/placeholder.svg";
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
};

export const getBackdropUrl = (
  path: string | null,
  size: "w300" | "w342" | "w780" | "w1280" | "original" = "w780",
) => {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
};

/**
 * Secure TMDB API fetch via Supabase Edge Function proxy
 * SECURITY: API key stored server-side only, never exposed to client
 * @param endpoint - TMDB API endpoint (e.g., '/movie/popular')
 * @param language - Language code (default: 'en')
 * @param extraParams - Additional query parameters
 */
const fetchTMDB = async <T>(
  endpoint: string,
  language: string = "en",
  extraParams: Record<string, string> = {},
  signal?: AbortSignal,
): Promise<T> => {
  if (USE_SUPABASE_EDGE_PROXY && (!SUPABASE_URL || !SUPABASE_API_KEY)) {
    throw new Error(
      "TMDB proxy not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env",
    );
  }

  const { maturityLevel } = parseMaturityFromStorage();
  const includeAdultFromStorage =
    maturityLevel === SafetyLevel.NONE ? "true" : "false";
  const cacheKey = makeCacheKey(endpoint, language, extraParams, maturityLevel);
  const now = Date.now();

  const cached = tmdbResponseCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    tmdbResponseCache.delete(cacheKey);
    tmdbResponseCache.set(cacheKey, cached);
    return cached.data as T;
  }

  const inFlight = tmdbInFlight.get(cacheKey);
  if (inFlight) {
    return (await inFlight) as T;
  }

  const params = new URLSearchParams({
    endpoint,
    language,
    ...extraParams,
  });
  params.set("maturity_level", maturityLevel);
  params.set("include_adult", includeAdultFromStorage);

  try {
    const requestPromise = (async () => {
      const controller = new AbortController();
      const timeoutId = globalThis.setTimeout(() => {
        controller.abort();
      }, TMDB_REQUEST_TIMEOUT_MS);

      const onAbort = () => {
        controller.abort();
      };

      if (signal) {
        if (signal.aborted) {
          controller.abort();
        } else {
          signal.addEventListener("abort", onAbort);
        }
      }

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (USE_SUPABASE_EDGE_PROXY && SUPABASE_API_KEY) {
        headers.Authorization = `Bearer ${SUPABASE_API_KEY}`;
        headers.apikey = SUPABASE_API_KEY;
      }

      const response = await fetch(`${TMDB_PROXY_URL}?${params.toString()}`, {
        headers,
        signal: controller.signal,
      }).finally(() => {
        globalThis.clearTimeout(timeoutId);
        if (signal) {
          signal.removeEventListener("abort", onAbort);
        }
      });

      // Explicit 401 handling - Stop retries immediately
      if (response.status === 401) {
        logger.error(
          "401 Unauthorized: Invalid Supabase API key or expired session",
        );
        throw new Error("AUTHENTICATION_ERROR");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const statusText =
          response.status === 404
            ? "Unavailable - Invalid endpoint"
            : response.status >= 500
              ? "Server Error - TMDB proxy issue"
              : `HTTP ${response.status}`;
        logger.error(`TMDB Proxy Error [${response.status}]`, {
          endpoint,
          status: response.status,
          statusText,
          error: errorData,
        });

        throw new Error(errorData.error || `TMDB API error: ${statusText}`);
      }

      const data = await response.json();
      setCachedResponse(cacheKey, getCacheTTL(endpoint), data);
      return data;
    })();

    tmdbInFlight.set(cacheKey, requestPromise);
    const result = await requestPromise;
    tmdbInFlight.delete(cacheKey);
    return result as T;
  } catch (error) {
    tmdbInFlight.delete(cacheKey);
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    // Ensure authentication errors propagate with correct type
    if (error instanceof Error && error.message === "AUTHENTICATION_ERROR") {
      throw error;
    }
    throw error;
  }
};

export const getTrending = async (
  mediaType: "all" | "movie" | "tv" = "all",
  timeWindow: TimeWindow = "day",
  language: string = "en",
  page: number = 1,
  includeAdult: boolean = false,
): Promise<TMDBResponse<Media>> => {
  return fetchTMDB(`/trending/${mediaType}/${timeWindow}`, language, {
    page: page.toString(),
    include_adult: includeAdult ? "true" : "false",
  });
};

export const searchMulti = async (
  query: string,
  page: number = 1,
  language: string = "en",
  includeAdult: boolean = false,
  signal?: AbortSignal,
): Promise<TMDBResponse<Media>> => {
  return fetchTMDB(`/search/multi`, language, {
    query,
    page: page.toString(),
    include_adult: includeAdult ? "true" : "false",
  }, signal);
};

export const searchMovies = async (
  query: string,
  page: number = 1,
  language: string = "en",
  includeAdult: boolean = false,
  signal?: AbortSignal,
): Promise<TMDBResponse<Media>> => {
  return fetchTMDB(`/search/movie`, language, {
    query,
    page: page.toString(),
    include_adult: includeAdult ? "true" : "false",
  }, signal);
};

export const searchTV = async (
  query: string,
  page: number = 1,
  language: string = "en",
  includeAdult: boolean = false,
  signal?: AbortSignal,
): Promise<TMDBResponse<Media>> => {
  return fetchTMDB(`/search/tv`, language, {
    query,
    page: page.toString(),
    include_adult: includeAdult ? "true" : "false",
  }, signal);
};

export const searchPeople = async (
  query: string,
  page: number = 1,
  language: string = "en",
  signal?: AbortSignal,
): Promise<TMDBResponse<PersonSearchResult>> => {
  return fetchTMDB(`/search/person`, language, {
    query,
    page: page.toString(),
  }, signal);
};

export const getPopularPeople = async (
  page: number = 1,
  language: string = "en",
): Promise<TMDBResponse<PersonSearchResult>> => {
  return fetchTMDB(`/person/popular`, language, { page: page.toString() });
};

export const getMovieDetails = async (
  id: number,
  language: string = "en",
): Promise<MediaDetails> => {
  return fetchTMDB(`/movie/${id}`, language, {
    append_to_response: "credits,similar,recommendations,release_dates,videos,keywords,external_ids,images",
  });
};

export const getTVDetails = async (
  id: number,
  language: string = "en",
): Promise<MediaDetails> => {
  return fetchTMDB(`/tv/${id}`, language, {
    append_to_response: "credits,similar,recommendations,content_ratings,videos,keywords,external_ids,images",
  });
};

export const getTVSeasonDetails = async (
  tvId: number,
  seasonNumber: number,
  language: string = "en",
): Promise<TVSeason> => {
  return fetchTMDB(`/tv/${tvId}/season/${seasonNumber}`, language);
};

export const getPopularMovies = async (
  page: number = 1,
  language: string = "en",
  includeAdult: boolean = false,
): Promise<TMDBResponse<Media>> => {
  return fetchTMDB(`/movie/popular`, language, {
    page: page.toString(),
    include_adult: includeAdult ? "true" : "false",
  });
};

export const getPopularTV = async (
  page: number = 1,
  language: string = "en",
  includeAdult: boolean = false,
): Promise<TMDBResponse<Media>> => {
  return fetchTMDB(`/tv/popular`, language, {
    page: page.toString(),
    include_adult: includeAdult ? "true" : "false",
  });
};

export const getTopRatedMovies = async (
  page: number = 1,
  language: string = "en",
  includeAdult: boolean = false,
): Promise<TMDBResponse<Media>> => {
  return fetchTMDB(`/movie/top_rated`, language, {
    page: page.toString(),
    include_adult: includeAdult ? "true" : "false",
  });
};

export const getTopRatedTV = async (
  page: number = 1,
  language: string = "en",
  includeAdult: boolean = false,
): Promise<TMDBResponse<Media>> => {
  return fetchTMDB(`/tv/top_rated`, language, {
    page: page.toString(),
    include_adult: includeAdult ? "true" : "false",
  });
};

export const getNowPlayingMovies = async (
  page: number = 1,
  language: string = "en",
  includeAdult: boolean = false,
): Promise<TMDBResponse<Media>> => {
  return fetchTMDB(`/movie/now_playing`, language, {
    page: page.toString(),
    include_adult: includeAdult ? "true" : "false",
  });
};

export const getUpcomingMovies = async (
  page: number = 1,
  language: string = "en",
  includeAdult: boolean = false,
): Promise<TMDBResponse<Media>> => {
  return fetchTMDB(`/movie/upcoming`, language, {
    page: page.toString(),
    include_adult: includeAdult ? "true" : "false",
  });
};

export const getAiringTodayTV = async (
  page: number = 1,
  language: string = "en",
  includeAdult: boolean = false,
): Promise<TMDBResponse<Media>> => {
  return fetchTMDB(`/tv/airing_today`, language, {
    page: page.toString(),
    include_adult: includeAdult ? "true" : "false",
  });
};

export const getOnTheAirTV = async (
  page: number = 1,
  language: string = "en",
  includeAdult: boolean = false,
): Promise<TMDBResponse<Media>> => {
  return fetchTMDB(`/tv/on_the_air`, language, {
    page: page.toString(),
    include_adult: includeAdult ? "true" : "false",
  });
};

export type DiscoverMovieParams = {
  page?: number;
  with_genres?: string;
  primary_release_year?: string;
  primary_release_date_gte?: string;
  primary_release_date_lte?: string;
  with_original_language?: string;
  sort_by?: string;
  vote_count_gte?: string;
  with_runtime_gte?: string;
  with_runtime_lte?: string;
  with_watch_providers?: string;
  watch_region?: string;
  include_adult?: string;
};

export type DiscoverTVParams = {
  page?: number;
  with_genres?: string;
  first_air_date_year?: string;
  first_air_date_gte?: string;
  first_air_date_lte?: string;
  with_original_language?: string;
  sort_by?: string;
  vote_count_gte?: string;
  with_runtime_gte?: string;
  with_runtime_lte?: string;
  with_watch_providers?: string;
  watch_region?: string;
  include_adult?: string;
};

// Discover endpoints for filter-based search
export const discoverMovies = async (
  params: DiscoverMovieParams,
  language: string = "en",
): Promise<TMDBResponse<Media>> => {
  const queryParams: Record<string, string> = {
    page: (params.page || 1).toString(),
  };
  if (params.with_genres) queryParams.with_genres = params.with_genres;
  if (params.primary_release_year)
    queryParams.primary_release_year = params.primary_release_year;
  if (params.primary_release_date_gte)
    queryParams["primary_release_date.gte"] = params.primary_release_date_gte;
  if (params.primary_release_date_lte)
    queryParams["primary_release_date.lte"] = params.primary_release_date_lte;
  if (params.with_original_language)
    queryParams.with_original_language = params.with_original_language;
  if (params.sort_by) queryParams.sort_by = params.sort_by;
  if (params.vote_count_gte)
    queryParams["vote_count.gte"] = params.vote_count_gte;
  if (params.with_runtime_gte)
    queryParams["with_runtime.gte"] = params.with_runtime_gte;
  if (params.with_runtime_lte)
    queryParams["with_runtime.lte"] = params.with_runtime_lte;
  if (params.with_watch_providers)
    queryParams.with_watch_providers = params.with_watch_providers;
  if (params.watch_region) queryParams.watch_region = params.watch_region;
  if (params.include_adult) queryParams.include_adult = params.include_adult;
  return fetchTMDB(`/discover/movie`, language, queryParams);
};

export const discoverTV = async (
  params: DiscoverTVParams,
  language: string = "en",
): Promise<TMDBResponse<Media>> => {
  const queryParams: Record<string, string> = {
    page: (params.page || 1).toString(),
  };
  if (params.with_genres) queryParams.with_genres = params.with_genres;
  if (params.first_air_date_year)
    queryParams.first_air_date_year = params.first_air_date_year;
  if (params.first_air_date_gte)
    queryParams["first_air_date.gte"] = params.first_air_date_gte;
  if (params.first_air_date_lte)
    queryParams["first_air_date.lte"] = params.first_air_date_lte;
  if (params.with_original_language)
    queryParams.with_original_language = params.with_original_language;
  if (params.sort_by) queryParams.sort_by = params.sort_by;
  if (params.vote_count_gte)
    queryParams["vote_count.gte"] = params.vote_count_gte;
  if (params.with_runtime_gte)
    queryParams["with_runtime.gte"] = params.with_runtime_gte;
  if (params.with_runtime_lte)
    queryParams["with_runtime.lte"] = params.with_runtime_lte;
  if (params.with_watch_providers)
    queryParams.with_watch_providers = params.with_watch_providers;
  if (params.watch_region) queryParams.watch_region = params.watch_region;
  if (params.include_adult) queryParams.include_adult = params.include_adult;
  return fetchTMDB(`/discover/tv`, language, queryParams);
};

// Get movie videos (trailers, etc.)
export const getMovieVideos = async (
  id: number,
  language: string = "en",
): Promise<{ results: VideoResult[] }> => {
  return fetchTMDB(`/movie/${id}/videos`, language);
};

export const getTVVideos = async (
  id: number,
  language: string = "en",
): Promise<{ results: VideoResult[] }> => {
  return fetchTMDB(`/tv/${id}/videos`, language);
};

export interface VideoResult {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
}

export const getSimilar = async (
  mediaType: "movie" | "tv",
  id: number,
  language: string = "en",
): Promise<TMDBResponse<Media>> => {
  return fetchTMDB(`/${mediaType}/${id}/similar`, language);
};

export const getRecommendations = async (
  mediaType: "movie" | "tv",
  id: number,
  language: string = "en",
): Promise<TMDBResponse<Media>> => {
  return fetchTMDB(`/${mediaType}/${id}/recommendations`, language);
};

export const getPersonDetails = async (
  id: number,
  language: string = "en",
): Promise<PersonDetails> => {
  return fetchTMDB(`/person/${id}`, language, {
    append_to_response: "combined_credits",
  });
};

export const getMovieGenres = async (
  language: string = "en",
): Promise<{ genres: Genre[] }> => {
  return fetchTMDB(`/genre/movie/list`, language);
};

export const getWatchProviders = async (
  mediaType: "movie" | "tv",
  id: number,
): Promise<WatchProviders> => {
  return fetchTMDB(`/${mediaType}/${id}/watch/providers`);
};

export const getTVGenres = async (
  language: string = "en",
): Promise<{ genres: Genre[] }> => {
  return fetchTMDB(`/genre/tv/list`, language);
};

export const getMediaTitle = (media: Media): string => {
  // Prefer original title/name so media names stay in their source language.
  return toDisplayTitle(
    media.original_title ||
      media.original_name ||
      media.title ||
      media.name ||
      "Unknown Title",
  );
};

export const getMediaYear = (media: Media): string => {
  const date = media.release_date || media.first_air_date;
  return date ? new Date(date).getFullYear().toString() : "";
};

export const getMediaType = (media: Media): "movie" | "tv" => {
  if (media.media_type === "tv") return "tv";
  if (media.media_type === "movie") return "movie";
  if ("title" in media && media.title) return "movie";
  return "tv";
};

export type { MediaDetails } from "@/types/media";

// TV Season & Episode Types
export interface TVEpisode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  air_date: string | null;
  still_path: string | null;
  vote_average: number;
  runtime: number | null;
}

export interface TVSeason {
  id: number;
  name: string;
  overview: string;
  season_number: number;
  episode_count: number;
  air_date: string | null;
  poster_path: string | null;
  episodes: TVEpisode[];
}

// Person/Actor Types
export interface PersonCredit extends Media {
  credit_id?: string;
  character?: string;
  department?: string;
  job?: string;
}

export interface PersonDetails {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string;
  popularity?: number;
  combined_credits?: {
    cast: PersonCredit[];
    crew: PersonCredit[];
  };
}
