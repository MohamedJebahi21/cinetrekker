import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserMediaItem, HiddenRecommendation } from '@/types/media';

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
}

const UserListsContext = createContext<UserListsContextType | undefined>(undefined);

const STORAGE_KEYS = {
  watchlist: 'mywatch_watchlist',
  watched: 'mywatch_watched',
  hidden: 'mywatch_hidden_recommendations',
};

export function UserListsProvider({ children }: { children: ReactNode }) {
  const [watchlist, setWatchlist] = useState<UserMediaItem[]>([]);
  const [watched, setWatched] = useState<UserMediaItem[]>([]);
  const [hiddenRecommendations, setHiddenRecommendations] = useState<HiddenRecommendation[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const storedWatchlist = localStorage.getItem(STORAGE_KEYS.watchlist);
    const storedWatched = localStorage.getItem(STORAGE_KEYS.watched);
    const storedHidden = localStorage.getItem(STORAGE_KEYS.hidden);

    if (storedWatchlist) setWatchlist(JSON.parse(storedWatchlist));
    if (storedWatched) setWatched(JSON.parse(storedWatched));
    if (storedHidden) setHiddenRecommendations(JSON.parse(storedHidden));
  }, []);

  // Save to localStorage on changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.watchlist, JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.watched, JSON.stringify(watched));
  }, [watched]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.hidden, JSON.stringify(hiddenRecommendations));
  }, [hiddenRecommendations]);

  const addToWatchlist = (mediaId: number, mediaType: 'movie' | 'tv') => {
    const newItem: UserMediaItem = {
      id: `${mediaType}-${mediaId}`,
      mediaId,
      mediaType,
      userId: 'local',
      addedAt: new Date().toISOString(),
    };
    setWatchlist(prev => [...prev.filter(item => !(item.mediaId === mediaId && item.mediaType === mediaType)), newItem]);
  };

  const removeFromWatchlist = (mediaId: number, mediaType: 'movie' | 'tv') => {
    setWatchlist(prev => prev.filter(item => !(item.mediaId === mediaId && item.mediaType === mediaType)));
  };

  const addToWatched = (mediaId: number, mediaType: 'movie' | 'tv', rating?: number, note?: string, status?: string) => {
    const newItem: UserMediaItem = {
      id: `${mediaType}-${mediaId}`,
      mediaId,
      mediaType,
      userId: 'local',
      rating,
      note,
      status: (status as UserMediaItem['status']) || 'completed',
      addedAt: new Date().toISOString(),
      watchedAt: new Date().toISOString(),
    };
    setWatched(prev => [...prev.filter(item => !(item.mediaId === mediaId && item.mediaType === mediaType)), newItem]);
    // Remove from watchlist if present
    removeFromWatchlist(mediaId, mediaType);
  };

  const removeFromWatched = (mediaId: number, mediaType: 'movie' | 'tv') => {
    setWatched(prev => prev.filter(item => !(item.mediaId === mediaId && item.mediaType === mediaType)));
  };

  const updateWatchedItem = (mediaId: number, mediaType: 'movie' | 'tv', updates: Partial<UserMediaItem>) => {
    setWatched(prev => prev.map(item => 
      item.mediaId === mediaId && item.mediaType === mediaType
        ? { ...item, ...updates }
        : item
    ));
  };

  const isInWatchlist = (mediaId: number, mediaType: 'movie' | 'tv') => {
    return watchlist.some(item => item.mediaId === mediaId && item.mediaType === mediaType);
  };

  const isWatched = (mediaId: number, mediaType: 'movie' | 'tv') => {
    return watched.some(item => item.mediaId === mediaId && item.mediaType === mediaType);
  };

  const getWatchedItem = (mediaId: number, mediaType: 'movie' | 'tv') => {
    return watched.find(item => item.mediaId === mediaId && item.mediaType === mediaType);
  };

  const hideFromRecommendations = (mediaId: number, mediaType: 'movie' | 'tv') => {
    const newItem: HiddenRecommendation = {
      id: `${mediaType}-${mediaId}`,
      mediaId,
      mediaType,
      userId: 'local',
      hiddenAt: new Date().toISOString(),
    };
    setHiddenRecommendations(prev => [...prev, newItem]);
  };

  const isHiddenFromRecommendations = (mediaId: number, mediaType: 'movie' | 'tv') => {
    return hiddenRecommendations.some(item => item.mediaId === mediaId && item.mediaType === mediaType);
  };

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
