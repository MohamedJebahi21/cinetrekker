import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { UserMediaItem, HiddenRecommendation } from '@/types/media';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { validateNote, validateRating } from '@/lib/validation';
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
  const [watchlist, setWatchlist] = useState<UserMediaItem[]>([]);
  const [watched, setWatched] = useState<UserMediaItem[]>([]);
  const [hiddenRecommendations, setHiddenRecommendations] = useState<HiddenRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data from Supabase when user logs in, or from localStorage when not logged in
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      if (user) {
        // Fetch from Supabase
        const [watchlistResult, watchedResult] = await Promise.all([
          supabase.from('user_watchlist').select('*').eq('user_id', user.id),
          supabase.from('user_watched').select('*').eq('user_id', user.id),
        ]);

        if (watchlistResult.data) {
          setWatchlist(watchlistResult.data.map(item => ({
            id: item.id,
            mediaId: item.media_id,
            mediaType: item.media_type as 'movie' | 'tv',
            userId: item.user_id,
            addedAt: item.added_at,
          })));
        }

        if (watchedResult.data) {
          setWatched(watchedResult.data.map(item => ({
            id: item.id,
            mediaId: item.media_id,
            mediaType: item.media_type as 'movie' | 'tv',
            userId: item.user_id,
            rating: item.rating ?? undefined,
            note: item.note ?? undefined,
            status: (item.status as UserMediaItem['status']) ?? undefined,
            addedAt: item.watched_at,
            watchedAt: item.watched_at,
          })));
        }

        // Load hidden recommendations from localStorage (user-specific key)
        const storedHidden = localStorage.getItem(`${STORAGE_KEYS.hidden}_${user.id}`);
        if (storedHidden) setHiddenRecommendations(JSON.parse(storedHidden));
      } else {
        // Load from localStorage for non-authenticated users
        const storedWatchlist = localStorage.getItem(STORAGE_KEYS.watchlist);
        const storedWatched = localStorage.getItem(STORAGE_KEYS.watched);
        const storedHidden = localStorage.getItem(STORAGE_KEYS.hidden);

        if (storedWatchlist) setWatchlist(JSON.parse(storedWatchlist));
        if (storedWatched) setWatched(JSON.parse(storedWatched));
        if (storedHidden) setHiddenRecommendations(JSON.parse(storedHidden));
      }
      
      setLoading(false);
    };

    loadData();
  }, [user]);

  // Save hidden recommendations to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem(`${STORAGE_KEYS.hidden}_${user.id}`, JSON.stringify(hiddenRecommendations));
    } else {
      localStorage.setItem(STORAGE_KEYS.hidden, JSON.stringify(hiddenRecommendations));
    }
  }, [hiddenRecommendations, user]);

  // For non-authenticated users, save to localStorage
  useEffect(() => {
    if (!user) {
      localStorage.setItem(STORAGE_KEYS.watchlist, JSON.stringify(watchlist));
    }
  }, [watchlist, user]);

  useEffect(() => {
    if (!user) {
      localStorage.setItem(STORAGE_KEYS.watched, JSON.stringify(watched));
    }
  }, [watched, user]);

  const addToWatchlist = useCallback(async (mediaId: number, mediaType: 'movie' | 'tv') => {
    const newItem: UserMediaItem = {
      id: `${mediaType}-${mediaId}`,
      mediaId,
      mediaType,
      userId: user?.id || 'local',
      addedAt: new Date().toISOString(),
    };

    // Optimistic update
    setWatchlist(prev => [...prev.filter(item => !(item.mediaId === mediaId && item.mediaType === mediaType)), newItem]);

    if (user) {
      await supabase.from('user_watchlist').upsert({
        user_id: user.id,
        media_id: mediaId,
        media_type: mediaType,
        added_at: newItem.addedAt,
      }, { onConflict: 'user_id,media_id,media_type' });
    }
  }, [user]);

  const removeFromWatchlist = useCallback(async (mediaId: number, mediaType: 'movie' | 'tv') => {
    // Optimistic update
    setWatchlist(prev => prev.filter(item => !(item.mediaId === mediaId && item.mediaType === mediaType)));

    if (user) {
      await supabase.from('user_watchlist')
        .delete()
        .eq('user_id', user.id)
        .eq('media_id', mediaId)
        .eq('media_type', mediaType);
    }
  }, [user]);

  const addToWatched = useCallback(async (mediaId: number, mediaType: 'movie' | 'tv', rating?: number, note?: string, status?: string) => {
    // Validate user inputs
    const validatedNote = validateNote(note);
    const validatedRating = validateRating(rating);
    
    const newItem: UserMediaItem = {
      id: `${mediaType}-${mediaId}`,
      mediaId,
      mediaType,
      userId: user?.id || 'local',
      rating: validatedRating,
      note: validatedNote,
      status: (status as UserMediaItem['status']) || 'completed',
      addedAt: new Date().toISOString(),
      watchedAt: new Date().toISOString(),
    };

    // Optimistic update
    setWatched(prev => [...prev.filter(item => !(item.mediaId === mediaId && item.mediaType === mediaType)), newItem]);
    // Remove from watchlist if present
    removeFromWatchlist(mediaId, mediaType);

    if (user) {
      await supabase.from('user_watched').upsert({
        user_id: user.id,
        media_id: mediaId,
        media_type: mediaType,
        rating: validatedRating ?? null,
        note: validatedNote ?? null,
        status: status || 'completed',
        watched_at: newItem.watchedAt,
      }, { onConflict: 'user_id,media_id,media_type' });
    }
  }, [user, removeFromWatchlist]);

  const removeFromWatched = useCallback(async (mediaId: number, mediaType: 'movie' | 'tv') => {
    // Optimistic update
    setWatched(prev => prev.filter(item => !(item.mediaId === mediaId && item.mediaType === mediaType)));

    if (user) {
      await supabase.from('user_watched')
        .delete()
        .eq('user_id', user.id)
        .eq('media_id', mediaId)
        .eq('media_type', mediaType);
    }
  }, [user]);

  const updateWatchedItem = useCallback(async (mediaId: number, mediaType: 'movie' | 'tv', updates: Partial<UserMediaItem>) => {
    // Validate user inputs
    const validatedUpdates = { ...updates };
    if (updates.note !== undefined) {
      validatedUpdates.note = validateNote(updates.note);
    }
    if (updates.rating !== undefined) {
      validatedUpdates.rating = validateRating(updates.rating);
    }
    
    // Optimistic update
    setWatched(prev => prev.map(item => 
      item.mediaId === mediaId && item.mediaType === mediaType
        ? { ...item, ...validatedUpdates }
        : item
    ));

    if (user) {
      const dbUpdates: Record<string, unknown> = {};
      if (validatedUpdates.rating !== undefined) dbUpdates.rating = validatedUpdates.rating;
      if (validatedUpdates.note !== undefined) dbUpdates.note = validatedUpdates.note;
      if (validatedUpdates.status !== undefined) dbUpdates.status = validatedUpdates.status;

      await supabase.from('user_watched')
        .update(dbUpdates)
        .eq('user_id', user.id)
        .eq('media_id', mediaId)
        .eq('media_type', mediaType);
    }
  }, [user]);

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
