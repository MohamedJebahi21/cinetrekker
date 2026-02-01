import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { UserMediaItem, HiddenRecommendation } from '@/types/media';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { validateNote, validateRating } from '@/lib/validation';
import { 
  useWatchlistQuery, 
  useAddToWatchlist as useAddToWatchlistMutation, 
  useRemoveFromWatchlist as useRemoveFromWatchlistMutation 
} from '@/hooks/useWatchlistQueries';
import {
  useWatchedQuery,
  useAddToWatched as useAddToWatchedMutation,
  useRemoveFromWatched as useRemoveFromWatchedMutation,
  useUpdateWatched as useUpdateWatchedMutation
} from '@/hooks/useWatchedQueries';
interface UserListsContextType {
  watchlist: UserMediaItem[];
  watched: UserMediaItem[];
  hiddenRecommendations: HiddenRecommendation[];
  addToWatchlist: (mediaId: number, mediaType: 'movie' | 'tv') => void;
  removeFromWatchlist: (mediaId: number, mediaType: 'movie' | 'tv') => void;
  addToWatched: (mediaId: number, mediaType: 'movie' | 'tv', rating?: number, note?: string, status?: string) => void;
  removeFromWatched: (mediaId: number, mediaType: 'movie' | 'tv') => void;
  updateWatchedItem: (mediaId: number, mediaType: 'movie' | 'tv', updates: Partial<UserMediaItem>) => void;
  isInWatchlist: (mediaId: number, mediaType: 'movie' | 'tv') => boolean;
  isWatched: (mediaId: number, mediaType: 'movie' | 'tv') => boolean;
  getWatchedItem: (mediaId: number, mediaType: 'movie' | 'tv') => UserMediaItem | undefined;
  hideFromRecommendations: (mediaId: number, mediaType: 'movie' | 'tv') => void;
  isHiddenFromRecommendations: (mediaId: number, mediaType: 'movie' | 'tv') => boolean;
  loading: boolean;
}

const UserListsContext = createContext<UserListsContextType | undefined>(undefined);

const STORAGE_KEYS = {
  watchlist: 'mywatch_watchlist',
  watched: 'mywatch_watched',
  hidden: 'mywatch_hidden_recommendations',
};

export function UserListsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
  // Use TanStack Query hooks for watchlist and watched
  const { data: watchlistData = [], isLoading: watchlistLoading } = useWatchlistQuery();
  const { data: watchedData = [], isLoading: watchedLoading } = useWatchedQuery();
  
  const addToWatchlistMutation = useAddToWatchlistMutation();
  const removeFromWatchlistMutation = useRemoveFromWatchlistMutation();
  const addToWatchedMutation = useAddToWatchedMutation();
  const removeFromWatchedMutation = useRemoveFromWatchedMutation();
  const updateWatchedMutation = useUpdateWatchedMutation();
  
  const [watchlist, setWatchlist] = useState<UserMediaItem[]>([]);
  const [watched, setWatched] = useState<UserMediaItem[]>([]);
  const [hiddenRecommendations, setHiddenRecommendations] = useState<HiddenRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync query data with local state for backward compatibility
  useEffect(() => {
    setWatchlist(watchlistData);
    setWatched(watchedData);
    setLoading(watchlistLoading || watchedLoading);
  }, [watchlistData, watchedData, watchlistLoading, watchedLoading]);

  // Load hidden recommendations from localStorage
  useEffect(() => {
    const loadHidden = () => {
      if (user) {
        const storedHidden = localStorage.getItem(`${STORAGE_KEYS.hidden}_${user.id}`);
        if (storedHidden) setHiddenRecommendations(JSON.parse(storedHidden));
      } else {
        const storedHidden = localStorage.getItem(STORAGE_KEYS.hidden);
        if (storedHidden) setHiddenRecommendations(JSON.parse(storedHidden));
      }
    };
    loadHidden();
  }, [user]);

  // Save hidden recommendations to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem(`${STORAGE_KEYS.hidden}_${user.id}`, JSON.stringify(hiddenRecommendations));
    } else {
      localStorage.setItem(STORAGE_KEYS.hidden, JSON.stringify(hiddenRecommendations));
    }
  }, [hiddenRecommendations, user]);

  // Wrapper functions to maintain backward compatibility with existing code
  const addToWatchlist = useCallback((mediaId: number, mediaType: 'movie' | 'tv') => {
    addToWatchlistMutation.mutate({ mediaId, mediaType });
  }, [addToWatchlistMutation]);

  const removeFromWatchlist = useCallback((mediaId: number, mediaType: 'movie' | 'tv') => {
    removeFromWatchlistMutation.mutate({ mediaId, mediaType });
  }, [removeFromWatchlistMutation]);

  const addToWatched = useCallback((mediaId: number, mediaType: 'movie' | 'tv', rating?: number, note?: string, status?: string) => {
    addToWatchedMutation.mutate({ mediaId, mediaType, rating, note, status });
  }, [addToWatchedMutation]);

  const removeFromWatched = useCallback((mediaId: number, mediaType: 'movie' | 'tv') => {
    removeFromWatchedMutation.mutate({ mediaId, mediaType });
  }, [removeFromWatchedMutation]);

  const updateWatchedItem = useCallback((mediaId: number, mediaType: 'movie' | 'tv', updates: Partial<UserMediaItem>) => {
    updateWatchedMutation.mutate({ mediaId, mediaType, updates });
  }, [updateWatchedMutation]);

  const isInWatchlist = useCallback((mediaId: number, mediaType: 'movie' | 'tv') => {
    return watchlist.some(item => item.mediaId === mediaId && item.mediaType === mediaType);
  }, [watchlist]);

  const isWatched = useCallback((mediaId: number, mediaType: 'movie' | 'tv') => {
    return watched.some(item => item.mediaId === mediaId && item.mediaType === mediaType);
  }, [watched]);

  const getWatchedItem = useCallback((mediaId: number, mediaType: 'movie' | 'tv') => {
    return watched.find(item => item.mediaId === mediaId && item.mediaType === mediaType);
  }, [watched]);

  const hideFromRecommendations = useCallback((mediaId: number, mediaType: 'movie' | 'tv') => {
    const newItem: HiddenRecommendation = {
      id: `${mediaType}-${mediaId}`,
      mediaId,
      mediaType,
      userId: user?.id || 'local',
      hiddenAt: new Date().toISOString(),
    };
    setHiddenRecommendations(prev => [...prev, newItem]);
  }, [user]);

  const isHiddenFromRecommendations = useCallback((mediaId: number, mediaType: 'movie' | 'tv') => {
    return hiddenRecommendations.some(item => item.mediaId === mediaId && item.mediaType === mediaType);
  }, [hiddenRecommendations]);

  return (
    <UserListsContext.Provider value={{
      watchlist,
      watched,
      hiddenRecommendations,
      addToWatchlist,
      removeFromWatchlist,
      addToWatched,
      removeFromWatched,
      updateWatchedItem,
      isInWatchlist,
      isWatched,
      getWatchedItem,
      hideFromRecommendations,
      isHiddenFromRecommendations,
      loading,
    }}>
      {children}
    </UserListsContext.Provider>
  );
}

export function useUserLists() {
  const context = useContext(UserListsContext);
  if (context === undefined) {
    throw new Error('useUserLists must be used within a UserListsProvider');
  }
  return context;
}
