import { Media, MediaDetails, TMDBResponse, TimeWindow, Genre } from '@/types/media';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export const getImageUrl = (path: string | null, size: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w500') => {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
};

export const getBackdropUrl = (path: string | null, size: 'w300' | 'w780' | 'w1280' | 'original' = 'w1280') => {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const fetchTMDB = async <T>(endpoint: string, language: string = 'en', extraParams: Record<string, string> = {}): Promise<T> => {
  const params = new URLSearchParams({
    endpoint,
    language,
    ...extraParams,
  });

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/tmdb-proxy?${params.toString()}`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${response.status}`);
  }

  return response.json();
};

export const getTrending = async (mediaType: 'all' | 'movie' | 'tv' = 'all', timeWindow: TimeWindow = 'day', language: string = 'en'): Promise<TMDBResponse<Media>> => {
  return fetchTMDB(`/trending/${mediaType}/${timeWindow}`, language);
};

export const searchMulti = async (query: string, page: number = 1, language: string = 'en'): Promise<TMDBResponse<Media>> => {
  return fetchTMDB(`/search/multi`, language, { query, page: page.toString() });
};

export const searchMovies = async (query: string, page: number = 1, language: string = 'en'): Promise<TMDBResponse<Media>> => {
  return fetchTMDB(`/search/movie`, language, { query, page: page.toString() });
};

export const searchTV = async (query: string, page: number = 1, language: string = 'en'): Promise<TMDBResponse<Media>> => {
  return fetchTMDB(`/search/tv`, language, { query, page: page.toString() });
};

export const getMovieDetails = async (id: number, language: string = 'en'): Promise<MediaDetails> => {
  return fetchTMDB(`/movie/${id}`, language, { append_to_response: 'credits,similar,recommendations' });
};

export const getTVDetails = async (id: number, language: string = 'en'): Promise<MediaDetails> => {
  return fetchTMDB(`/tv/${id}`, language, { append_to_response: 'credits,similar,recommendations' });
};

export const getTVSeasonDetails = async (tvId: number, seasonNumber: number, language: string = 'en'): Promise<TVSeason> => {
  return fetchTMDB(`/tv/${tvId}/season/${seasonNumber}`, language);
};

export const getPopularMovies = async (page: number = 1, language: string = 'en'): Promise<TMDBResponse<Media>> => {
  return fetchTMDB(`/movie/popular`, language, { page: page.toString() });
};

export const getPopularTV = async (page: number = 1, language: string = 'en'): Promise<TMDBResponse<Media>> => {
  return fetchTMDB(`/tv/popular`, language, { page: page.toString() });
};

export const getTopRatedMovies = async (page: number = 1, language: string = 'en'): Promise<TMDBResponse<Media>> => {
  return fetchTMDB(`/movie/top_rated`, language, { page: page.toString() });
};

export const getTopRatedTV = async (page: number = 1, language: string = 'en'): Promise<TMDBResponse<Media>> => {
  return fetchTMDB(`/tv/top_rated`, language, { page: page.toString() });
};

export const getNowPlayingMovies = async (page: number = 1, language: string = 'en'): Promise<TMDBResponse<Media>> => {
  return fetchTMDB(`/movie/now_playing`, language, { page: page.toString() });
};

export const getUpcomingMovies = async (page: number = 1, language: string = 'en'): Promise<TMDBResponse<Media>> => {
  return fetchTMDB(`/movie/upcoming`, language, { page: page.toString() });
};

export const getAiringTodayTV = async (page: number = 1, language: string = 'en'): Promise<TMDBResponse<Media>> => {
  return fetchTMDB(`/tv/airing_today`, language, { page: page.toString() });
};

export const getOnTheAirTV = async (page: number = 1, language: string = 'en'): Promise<TMDBResponse<Media>> => {
  return fetchTMDB(`/tv/on_the_air`, language, { page: page.toString() });
};

// Discover endpoints for filter-based search
export const discoverMovies = async (
  params: {
    page?: number;
    with_genres?: string;
    primary_release_year?: string;
    with_original_language?: string;
    sort_by?: string;
  },
  language: string = 'en'
): Promise<TMDBResponse<Media>> => {
  const queryParams: Record<string, string> = { page: (params.page || 1).toString() };
  if (params.with_genres) queryParams.with_genres = params.with_genres;
  if (params.primary_release_year) queryParams.primary_release_year = params.primary_release_year;
  if (params.with_original_language) queryParams.with_original_language = params.with_original_language;
  if (params.sort_by) queryParams.sort_by = params.sort_by;
  return fetchTMDB(`/discover/movie`, language, queryParams);
};

export const discoverTV = async (
  params: {
    page?: number;
    with_genres?: string;
    first_air_date_year?: string;
    with_original_language?: string;
    sort_by?: string;
  },
  language: string = 'en'
): Promise<TMDBResponse<Media>> => {
  const queryParams: Record<string, string> = { page: (params.page || 1).toString() };
  if (params.with_genres) queryParams.with_genres = params.with_genres;
  if (params.first_air_date_year) queryParams.first_air_date_year = params.first_air_date_year;
  if (params.with_original_language) queryParams.with_original_language = params.with_original_language;
  if (params.sort_by) queryParams.sort_by = params.sort_by;
  return fetchTMDB(`/discover/tv`, language, queryParams);
};

export const getSimilar = async (mediaType: 'movie' | 'tv', id: number, language: string = 'en'): Promise<TMDBResponse<Media>> => {
  return fetchTMDB(`/${mediaType}/${id}/similar`, language);
};

export const getRecommendations = async (mediaType: 'movie' | 'tv', id: number, language: string = 'en'): Promise<TMDBResponse<Media>> => {
  return fetchTMDB(`/${mediaType}/${id}/recommendations`, language);
};

export const getMovieGenres = async (language: string = 'en'): Promise<{ genres: Genre[] }> => {
  return fetchTMDB(`/genre/movie/list`, language);
};

export const getTVGenres = async (language: string = 'en'): Promise<{ genres: Genre[] }> => {
  return fetchTMDB(`/genre/tv/list`, language);
};

export const getMediaTitle = (media: Media): string => {
  return media.title || media.name || 'Unknown Title';
};

export const getMediaYear = (media: Media): string => {
  const date = media.release_date || media.first_air_date;
  return date ? new Date(date).getFullYear().toString() : '';
};

export const getMediaType = (media: Media): 'movie' | 'tv' => {
  if (media.media_type) return media.media_type;
  if ('title' in media && media.title) return 'movie';
  return 'tv';
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
