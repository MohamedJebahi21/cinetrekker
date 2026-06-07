import { createContext, useContext } from 'react';
import type { UserMediaItem, HiddenRecommendation } from '@/types/media';

export interface UserListsContextType {
  watchlist: UserMediaItem[];
  watched: UserMediaItem[];
  hiddenRecommendations: HiddenRecommendation[];
  addToWatchlist: (mediaId: number, mediaType: 'movie' | 'tv') => Promise<void>;
  removeFromWatchlist: (mediaId: number, mediaType: 'movie' | 'tv') => Promise<void>;
  addToWatched: (mediaId: number, mediaType: 'movie' | 'tv', rating?: number, note?: string, status?: string) => Promise<void>;
  removeFromWatched: (mediaId: number, mediaType: 'movie' | 'tv') => Promise<void>;
  updateWatchedItem: (mediaId: number, mediaType: 'movie' | 'tv', updates: Partial<UserMediaItem>) => void;
  isInWatchlist: (mediaId: number, mediaType: 'movie' | 'tv') => boolean;
  isWatched: (mediaId: number, mediaType: 'movie' | 'tv') => boolean;
  getWatchedItem: (mediaId: number, mediaType: 'movie' | 'tv') => UserMediaItem | undefined;
  hideFromRecommendations: (mediaId: number, mediaType: 'movie' | 'tv') => void;
  isHiddenFromRecommendations: (mediaId: number, mediaType: 'movie' | 'tv') => boolean;
  loading: boolean;
}

export const STORAGE_KEYS = {
  watchlist: 'mywatch_watchlist',
  watched: 'mywatch_watched',
  hidden: 'mywatch_hidden_recommendations',
};

export const UserListsContext = createContext<UserListsContextType | undefined>(undefined);

export function useUserLists(): UserListsContextType {
  const context = useContext(UserListsContext);
  if (context === undefined) {
    throw new Error('useUserLists must be used within a UserListsProvider');
  }
  return context;
}

export { UserListsProvider } from '@/contexts/UserListsContext';
