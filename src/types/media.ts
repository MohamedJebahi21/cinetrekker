export interface Media {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview: string;
  poster_path: string | null;
  profile_path?: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids?: number[];
  genres?: Genre[];
  media_type?: "movie" | "tv" | "person";
  original_language?: string;
  adult?: boolean;
  runtime?: number;
  episode_run_time?: number[];
  production_countries?: Array<{ iso_3166_1: string; name: string }>;
  origin_country?: string[];
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

export interface CastMember {
  id: number;
  name: string;
  character?: string;
  profile_path?: string | null;
  order?: number;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department?: string;
  profile_path?: string | null;
}

export interface Credits {
  cast: CastMember[];
  crew?: CrewMember[];
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

export interface Creator {
  id: number;
  name: string;
  profile_path?: string | null;
}

export interface Keyword {
  id: number;
  name: string;
}

export interface ProductionCompany {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

export interface ExternalIds {
  imdb_id?: string | null;
  facebook_id?: string | null;
  instagram_id?: string | null;
  twitter_id?: string | null;
}

export interface MediaImage {
  file_path: string;
  width: number;
  height: number;
  vote_average?: number;
}

export interface MediaImages {
  backdrops?: MediaImage[];
  posters?: MediaImage[];
}

export interface MediaVideoResult {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
  published_at?: string;
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
  tagline?: string;
  original_language?: string;
  networks?: TVNetwork[];
  next_episode_to_air?: TVEpisodeInfo | null;
  last_episode_to_air?: TVEpisodeInfo | null;
  seasons?: Season[];
  created_by?: Creator[];
  // Extended fields (from append_to_response)
  budget?: number;
  revenue?: number;
  homepage?: string | null;
  imdb_id?: string | null;
  in_production?: boolean;
  production_companies?: ProductionCompany[];
  keywords?: { keywords?: Keyword[]; results?: Keyword[] };
  external_ids?: ExternalIds;
  videos?: { results: MediaVideoResult[] };
  images?: MediaImages;
  "watch/providers"?: WatchProviders;
}

export interface Season {
  id: number;
  name?: string;
  overview?: string;
  episode_count: number;
  season_number: number;
  air_date?: string;
  poster_path?: string | null;
  vote_average?: number;
}

export interface TMDBResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export type MediaType = "movie" | "tv" | "all";
export type TimeWindow = "day" | "week";

export interface PersonSearchResult {
  id: number;
  name: string;
  profile_path: string | null;
  popularity: number;
  known_for_department?: string;
  known_for?: Media[];
  adult?: boolean;
  media_type: "person";
}

export interface UserMediaItem {
  id: string;
  mediaId: number;
  mediaType: "movie" | "tv";
  userId: string;
  rating?: number;
  note?: string;
  status?: "watching" | "completed" | "dropped" | "plan_to_watch";
  addedAt: string;
  watchedAt?: string;
}

export interface HiddenRecommendation {
  id: string;
  mediaId: number;
  mediaType: "movie" | "tv";
  userId: string;
  hiddenAt: string;
}

// Watch Providers types
export interface Provider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  display_priority: number;
  short_name?: string;
  clear_name?: string;
  icon_url?: string | null;
  provider_url?: string;
  url?: string;
  urls?: {
    standard_web?: string;
    web?: string;
  } | null;
}

export interface WatchProviderDetails {
  link?: string | null;
  rent?: Provider[];
  buy?: Provider[];
  flatrate?: Provider[];
  [key: string]: unknown;
}

export interface WatchProviders {
  results: Record<string, WatchProviderDetails>;
}

// Genre response type
export interface GenreResponse {
  genres: Genre[];
}

// AI recommendation types
export interface RankingResult {
  title: string;
  score: number;
  reason?: string;
}

export interface AIRecommendationItem extends Omit<Media, "genre_ids"> {
  confidence: string;
  ai_reason: string;
}

export interface AIRecommendationResponse {
  summary: string;
  results: AIRecommendationItem[];
}

// Generic TV episode collection type
export interface EpisodeCollectionResult {
  episodes: TVEpisodeInfo[];
  [key: string]: unknown;
}

// Provider data for utility functions
export interface ProviderDataResult {
  link?: string | null;
  rent?: Provider[];
  buy?: Provider[];
  flatrate?: Provider[];
  [key: string]: unknown;
}
