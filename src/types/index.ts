/**
 * Unified type exports for the entire application
 * This file serves as the single source of truth for all TypeScript types
 * Import from '@/types' instead of scattered type files
 */

// Media types
export type {
  Media,
  Movie,
  TVShow,
  Genre,
  MediaDetails,
  Cast,
  Credits,
  Season,
  TVEpisodeInfo,
  TMDBResponse,
  PersonSearchResult,
  UserMediaItem,
  HiddenRecommendation,
  Provider,
  WatchProviderDetails,
  WatchProviders,
  GenreResponse,
  RankingResult,
  AIRecommendationItem,
  AIRecommendationResponse,
  EpisodeCollectionResult,
  ProviderDataResult,
  MediaType,
  TimeWindow,
} from "./media";

// Context types
export type { User, Session } from "@supabase/supabase-js";

import type { User, Session } from "@supabase/supabase-js";

// User lists context type
export interface UserListsContextType {
  watchlist: UserMediaItem[];
  watched: UserMediaItem[];
  hiddenRecommendations: HiddenRecommendation[];
  addToWatchlist: (mediaId: number, mediaType: "movie" | "tv") => Promise<void>;
  removeFromWatchlist: (
    mediaId: number,
    mediaType: "movie" | "tv",
  ) => Promise<void>;
  addToWatched: (
    mediaId: number,
    mediaType: "movie" | "tv",
    rating?: number,
    note?: string,
    status?: string,
  ) => Promise<void>;
  removeFromWatched: (
    mediaId: number,
    mediaType: "movie" | "tv",
  ) => Promise<void>;
  updateWatchedItem: (
    mediaId: number,
    mediaType: "movie" | "tv",
    updates: Partial<UserMediaItem>,
  ) => void;
  isInWatchlist: (mediaId: number, mediaType: "movie" | "tv") => boolean;
  isWatched: (mediaId: number, mediaType: "movie" | "tv") => boolean;
  getWatchedItem: (
    mediaId: number,
    mediaType: "movie" | "tv",
  ) => UserMediaItem | undefined;
  hideFromRecommendations: (mediaId: number, mediaType: "movie" | "tv") => void;
  isHiddenFromRecommendations: (
    mediaId: number,
    mediaType: "movie" | "tv",
  ) => boolean;
  loading: boolean;
}

// Auth context type
export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, code: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, code: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}
