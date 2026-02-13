export interface Media {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids?: number[];
  genres?: Genre[];
  media_type?: 'movie' | 'tv';
  adult?: boolean;
  runtime?: number;
  episode_run_time?: number[];
}

export interface Movie extends Media {
  title: string;
  original_title: string;
  release_date: string;
  runtime?: number;
  budget?: number;
  revenue?: number;
  status?: string;
  tagline?: string;
}

export interface TVShow extends Media {
  name: string;
  original_name: string;
  first_air_date: string;
  episode_run_time?: number[];
  number_of_episodes?: number;
  number_of_seasons?: number;
  status?: string;
  type?: string;
  in_production?: boolean;
}

export interface Genre {
  id: number;
  name: string;
}

export interface Cast {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface Credits {
  cast: Cast[];
}

export interface TVNetwork {
  id: number;
  name: string;
  logo_path?: string | null;
  origin_country?: string;
}

export interface TVEpisodeInfo {
  id: number;
  name: string;
  overview: string;
  air_date: string;
  episode_number: number;
  season_number: number;
  still_path?: string | null;
  vote_average?: number;
  runtime?: number;
}

export interface MediaDetails extends Media {
  credits?: Credits;
  similar?: { results: Media[] };
  recommendations?: { results: Media[] };
  runtime?: number;
  episode_run_time?: number[];
  number_of_episodes?: number;
  number_of_seasons?: number;
  status?: string;
  original_language?: string;
  networks?: TVNetwork[];
  next_episode_to_air?: TVEpisodeInfo | null;
  last_episode_to_air?: TVEpisodeInfo | null;
  seasons?: Season[];
}

export interface Season {
  id: number;
  name?: string;
  overview?: string;
  episode_count: number;
  season_number: number;
  air_date?: string;
  poster_path?: string | null;
}

export interface TMDBResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export type MediaType = 'movie' | 'tv' | 'all';
export type TimeWindow = 'day' | 'week';

export interface PersonSearchResult {
  id: number;
  name: string;
  profile_path: string | null;
  popularity: number;
  known_for_department?: string;
  known_for?: Media[];
  adult?: boolean;
  media_type: 'person';
}

export interface UserMediaItem {
  id: string;
  mediaId: number;
  mediaType: 'movie' | 'tv';
  userId: string;
  rating?: number;
  note?: string;
  status?: 'watching' | 'completed' | 'dropped' | 'plan_to_watch';
  addedAt: string;
  watchedAt?: string;
}

export interface HiddenRecommendation {
  id: string;
  mediaId: number;
  mediaType: 'movie' | 'tv';
  userId: string;
  hiddenAt: string;
}
