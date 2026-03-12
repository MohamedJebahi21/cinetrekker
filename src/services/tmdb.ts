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

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";
const TMDB_PROXY_PATH = "/functions/v1/tmdb-proxy";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_API_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const TMDB_PROXY_URL = import.meta.env.DEV
  ? TMDB_PROXY_PATH
  : `${SUPABASE_URL}${TMDB_PROXY_PATH}`;

const CONTENT_POLICY_STORAGE_KEY = "cinetrekker_content_policy";

function parseMaturityFromStorage(): {
  maturityLevel: MaturityRating;
  ageVerified: boolean;
} {
  if (typeof window === "undefined") {
    return { maturityLevel: SafetyLevel.STRICT, ageVerified: false };
  }

  try {
    const raw = window.localStorage.getItem(CONTENT_POLICY_STORAGE_KEY);
    if (!raw) return { maturityLevel: SafetyLevel.STRICT, ageVerified: false };

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
    return { maturityLevel: SafetyLevel.STRICT, ageVerified };
  } catch {
    return { maturityLevel: SafetyLevel.STRICT, ageVerified: false };
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
  size: "w342" | "w780" | "w1280" = "w780",
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
): Promise<T> => {
  if (!SUPABASE_URL || !SUPABASE_API_KEY) {
    throw new Error(
      "TMDB proxy not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env",
    );
  }

  const { maturityLevel } = parseMaturityFromStorage();
  const includeAdultFromStorage =
    maturityLevel === SafetyLevel.NONE ? "true" : "false";

  const params = new URLSearchParams({
    endpoint,
    language,
    ...extraParams,
  });
  params.set("maturity_level", maturityLevel);
  params.set("include_adult", includeAdultFromStorage);

  try {
    const response = await fetch(`${TMDB_PROXY_URL}?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${SUPABASE_API_KEY}`,
        apikey: SUPABASE_API_KEY,
        "Content-Type": "application/json",
      },
    });

    // Explicit 401 handling - Stop retries immediately
    if (response.status === 401) {
      console.error(
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
            ? "Server Error - TMDB or Supabase issue"
            : `HTTP ${response.status}`;
      console.error(`TMDB Proxy Error [${response.status}]:`, {
        endpoint,
        status: response.status,
        statusText,
        error: errorData,
      });

      throw new Error(errorData.error || `TMDB API error: ${statusText}`);
    }

    return response.json();
  } catch (error) {
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
): Promise<TMDBResponse<Media>> => {
  return fetchTMDB(`/search/multi`, language, {
    query,
    page: page.toString(),
    include_adult: includeAdult ? "true" : "false",
  });
};

export const searchMovies = async (
  query: string,
  page: number = 1,
  language: string = "en",
  includeAdult: boolean = false,
): Promise<TMDBResponse<Media>> => {
  return fetchTMDB(`/search/movie`, language, {
    query,
    page: page.toString(),
    include_adult: includeAdult ? "true" : "false",
  });
};

export const searchTV = async (
  query: string,
  page: number = 1,
  language: string = "en",
  includeAdult: boolean = false,
): Promise<TMDBResponse<Media>> => {
  return fetchTMDB(`/search/tv`, language, {
    query,
    page: page.toString(),
    include_adult: includeAdult ? "true" : "false",
  });
};

export const searchPeople = async (
  query: string,
  page: number = 1,
  language: string = "en",
): Promise<TMDBResponse<PersonSearchResult>> => {
  return fetchTMDB(`/search/person`, language, {
    query,
    page: page.toString(),
  });
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
    append_to_response: "credits,similar,recommendations,release_dates",
  });
};

export const getTVDetails = async (
  id: number,
  language: string = "en",
): Promise<MediaDetails> => {
  return fetchTMDB(`/tv/${id}`, language, {
    append_to_response: "credits,similar,recommendations,content_ratings",
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

// Discover endpoints for filter-based search
export const discoverMovies = async (
  params: {
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
  },
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
  params: {
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
  },
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
  return media.title || media.name || "Unknown Title";
};

export const getMediaYear = (media: Media): string => {
  const date = media.release_date || media.first_air_date;
  return date ? new Date(date).getFullYear().toString() : "";
};

export const getMediaType = (media: Media): "movie" | "tv" => {
  if (media.media_type) return media.media_type;
  if ("title" in media && media.title) return "movie";
  return "tv";
};

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
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string;
  combined_credits?: {
    cast: PersonCredit[];
    crew: PersonCredit[];
  };
  episode_count: number;
  air_date: string | null;
  poster_path: string | null;
  episodes: TVEpisode[];
}
