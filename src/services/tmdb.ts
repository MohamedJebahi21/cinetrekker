import { Media, MediaDetails, TMDBResponse, TimeWindow, Genre } from '@/types/media';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// For demo purposes, using a read-only API key
// In production, this should be handled via environment variables on the backend
const TMDB_API_KEY = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJkMmZlNjkwMzNmMGVhYjdlMGYzNTI0NDQ5NjFkMzNlMyIsIm5iZiI6MTc0NjkwMjM0OC42MjgsInN1YiI6IjY4MWYxNjNjOWQ4NzFhM2VkZDQzMjhmZCIsInNjb3BlcyI6WyJhcGlfcmVhZF9hY2Nlc3MiXSwidmVyc2lvbiI6MX0.JBIp1Y67N8ZHZeFVNDKvYdD4Cg9YKN0D0dXpCGrJk9E';

export const getImageUrl = (path: string | null, size: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w500') => {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
};

export const getBackdropUrl = (path: string | null, size: 'w300' | 'w780' | 'w1280' | 'original' = 'w1280') => {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
};

const fetchTMDB = async <T>(endpoint: string, language: string = 'en'): Promise<T> => {
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  url.searchParams.set('language', language);
  
  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${TMDB_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status}`);
  }
  
  return response.json();
};

export const getTrending = async (mediaType: 'all' | 'movie' | 'tv' = 'all', timeWindow: TimeWindow = 'day', language: string = 'en'): Promise<TMDBResponse<Media>> => {
  return fetchTMDB(`/trending/${mediaType}/${timeWindow}`, language);
};

export const searchMulti = async (query: string, page: number = 1, language: string = 'en'): Promise<TMDBResponse<Media>> => {
  const encoded = encodeURIComponent(query);
  return fetchTMDB(`/search/multi?query=${encoded}&page=${page}&include_adult=false`, language);
};

export const searchMovies = async (query: string, page: number = 1, language: string = 'en'): Promise<TMDBResponse<Media>> => {
  const encoded = encodeURIComponent(query);
  return fetchTMDB(`/search/movie?query=${encoded}&page=${page}&include_adult=false`, language);
};

export const searchTV = async (query: string, page: number = 1, language: string = 'en'): Promise<TMDBResponse<Media>> => {
  const encoded = encodeURIComponent(query);
  return fetchTMDB(`/search/tv?query=${encoded}&page=${page}&include_adult=false`, language);
};

export const getMovieDetails = async (id: number, language: string = 'en'): Promise<MediaDetails> => {
  return fetchTMDB(`/movie/${id}?append_to_response=credits,similar,recommendations`, language);
};

export const getTVDetails = async (id: number, language: string = 'en'): Promise<MediaDetails> => {
  return fetchTMDB(`/tv/${id}?append_to_response=credits,similar,recommendations`, language);
};

export const getPopularMovies = async (page: number = 1, language: string = 'en'): Promise<TMDBResponse<Media>> => {
  return fetchTMDB(`/movie/popular?page=${page}`, language);
};

export const getPopularTV = async (page: number = 1, language: string = 'en'): Promise<TMDBResponse<Media>> => {
  return fetchTMDB(`/tv/popular?page=${page}`, language);
};

export const getTopRatedMovies = async (page: number = 1, language: string = 'en'): Promise<TMDBResponse<Media>> => {
  return fetchTMDB(`/movie/top_rated?page=${page}`, language);
};

export const getTopRatedTV = async (page: number = 1, language: string = 'en'): Promise<TMDBResponse<Media>> => {
  return fetchTMDB(`/tv/top_rated?page=${page}`, language);
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
