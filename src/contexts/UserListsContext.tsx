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
import { toast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { useTranslation } from 'react-i18next';
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

export const STORAGE_KEYS = {
  watchlist: 'mywatch_watchlist',
  watched: 'mywatch_watched',
  hidden: 'mywatch_hidden_recommendations',
};

export function UserListsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  
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
    // shallow stable compare to avoid updating state when query returns new array references
    const areSame = (a: UserMediaItem[] = [], b: UserMediaItem[] = []) => {
      if (a === b) return true;
      if (!a || !b) return false;
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (a[i].mediaId !== b[i].mediaId || a[i].mediaType !== b[i].mediaType) return false;
      }
      return true;
    };

    // If a user is signed in, prefer server-provided lists
    if (user) {
      if (!areSame(watchlist, watchlistData)) setWatchlist(watchlistData || []);
      if (!areSame(watched, watchedData)) setWatched(watchedData || []);
    } else {
      // For guests, load from localStorage once if available, otherwise fall back to empty array
      try {
        const storedWatchlist = localStorage.getItem(STORAGE_KEYS.watchlist);
        const storedWatched = localStorage.getItem(STORAGE_KEYS.watched);
        if (storedWatchlist) {
          const parsed = JSON.parse(storedWatchlist) as UserMediaItem[];
          if (!areSame(watchlist, parsed)) setWatchlist(parsed || []);
        } else if (!areSame(watchlist, watchlistData)) {
          setWatchlist(watchlistData || []);
        }
        if (storedWatched) {
          const parsed = JSON.parse(storedWatched) as UserMediaItem[];
          if (!areSame(watched, parsed)) setWatched(parsed || []);
        } else if (!areSame(watched, watchedData)) {
          setWatched(watchedData || []);
        }
      } catch (e) {
        setWatchlist(watchlistData || []);
        setWatched(watchedData || []);
      }
    }

    // only update loading when it actually changes
    setLoading(Boolean(watchlistLoading || watchedLoading));
  }, [watchlistData, watchedData, watchlistLoading, watchedLoading, watchlist, watched]);

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

  // Persist watchlist/watched for guests (localStorage)
  useEffect(() => {
    if (!user) {
      try {
        localStorage.setItem(STORAGE_KEYS.watchlist, JSON.stringify(watchlist || []));
        localStorage.setItem(STORAGE_KEYS.watched, JSON.stringify(watched || []));
      } catch (e) {
        // ignore storage errors
      }
    } else {
      // When user is present, clear anonymous keys to avoid confusion (prefixed keys may remain)
      try {
        localStorage.removeItem(STORAGE_KEYS.watchlist);
        localStorage.removeItem(STORAGE_KEYS.watched);
      } catch (e) {
        // ignore
      }
    }
  }, [watchlist, watched, user]);

  // Sync local guest lists to server on sign-in (batched upserts)
  useEffect(() => {
    if (!user) return;

    const syncLocalToServer = async () => {
      try {
        const storedWatchlist = localStorage.getItem(STORAGE_KEYS.watchlist);
        const storedWatched = localStorage.getItem(STORAGE_KEYS.watched);

        if (storedWatchlist) {
          const parsed: UserMediaItem[] = JSON.parse(storedWatchlist) || [];
          if (parsed.length > 0) {
            const rows = parsed.map(item => ({
              user_id: user.id,
              media_id: item.mediaId,
              media_type: item.mediaType,
              added_at: item.addedAt || new Date().toISOString(),
            }));

            try {
              const { error } = await supabase
                .from('user_watchlist')
                .upsert(rows, { onConflict: 'user_id,media_id,media_type' });
              if (error) console.error('Error upserting watchlist during sync:', error);
            } catch (err) {
              console.error('Watchlist sync failed:', err);
            }
          }
        }

        if (storedWatched) {
          const parsed: UserMediaItem[] = JSON.parse(storedWatched) || [];
          if (parsed.length > 0) {
            const rows = parsed.map(item => ({
              user_id: user.id,
              media_id: item.mediaId,
              media_type: item.mediaType,
              rating: item.rating ?? null,
              note: item.note ?? null,
              status: item.status ?? 'completed',
              watched_at: item.watchedAt || item.addedAt || new Date().toISOString(),
            }));

            try {
              const { error } = await supabase
                .from('user_watched')
                .upsert(rows, { onConflict: 'user_id,media_id,media_type' });
              if (error) console.error('Error upserting watched during sync:', error);
            } catch (err) {
              console.error('Watched sync failed:', err);
            }
          }
        }

        // Remove anonymous local copies once we attempted sync
        localStorage.removeItem(STORAGE_KEYS.watchlist);
        localStorage.removeItem(STORAGE_KEYS.watched);
      } catch (e) {
        console.error('Sync local to server failed', e);
      }
    };

    syncLocalToServer();
  }, [user, watchlistData, watchedData]);

  // Wrapper functions to maintain backward compatibility with existing code
  const addToWatchlist = useCallback((mediaId: number, mediaType: 'movie' | 'tv') => {
    if (user) {
      addToWatchlistMutation.mutate({ mediaId, mediaType });
    } else {
      // guest — persist to local state + storage
      setWatchlist(prev => {
        const exists = prev.some(i => i.mediaId === mediaId && i.mediaType === mediaType);
        if (exists) return prev;
        const item: UserMediaItem = { mediaId, mediaType } as UserMediaItem;
        const next = [...prev, item];
        try { localStorage.setItem(STORAGE_KEYS.watchlist, JSON.stringify(next)); } catch (e) {}
        try {
          toast({
            title: t('actions.watchlistAdded', 'Saved locally'),
            description: t('actions.watchlistAddedGuest', 'Saved to this device. Sign in to sync across devices.'),
            action: (
              <ToastAction asChild>
                <a href="/login">{t('auth.signIn', 'Sign in')}</a>
              </ToastAction>
            ),
          });
        } catch (e) {}
        return next;
      });
    }
  }, [addToWatchlistMutation]);

  const removeFromWatchlist = useCallback((mediaId: number, mediaType: 'movie' | 'tv') => {
    if (user) {
      removeFromWatchlistMutation.mutate({ mediaId, mediaType });
    } else {
      setWatchlist(prev => {
        const next = prev.filter(i => !(i.mediaId === mediaId && i.mediaType === mediaType));
        try { localStorage.setItem(STORAGE_KEYS.watchlist, JSON.stringify(next)); } catch (e) {}
        try {
          toast({ title: t('actions.watchlistRemoved', 'Removed from watchlist') });
        } catch (e) {}
        return next;
      });
    }
  }, [removeFromWatchlistMutation]);

  const addToWatched = useCallback((mediaId: number, mediaType: 'movie' | 'tv', rating?: number, note?: string, status?: string) => {
    if (user) {
      addToWatchedMutation.mutate({ mediaId, mediaType, rating, note, status });
    } else {
      setWatched(prev => {
        const exists = prev.some(i => i.mediaId === mediaId && i.mediaType === mediaType);
        const item: UserMediaItem = { mediaId, mediaType, rating, note, status } as UserMediaItem;
        let next: UserMediaItem[];
        if (exists) {
          next = prev.map(i => (i.mediaId === mediaId && i.mediaType === mediaType ? { ...i, ...item } : i));
        } else {
          next = [...prev, item];
        }
        try { localStorage.setItem(STORAGE_KEYS.watched, JSON.stringify(next)); } catch (e) {}
        try {
          toast({
            title: t('actions.watchedAdded', 'Saved locally'),
            description: t('actions.watchedAddedGuest', 'Marked as watched on this device. Sign in to sync and save notes/ratings.'),
            action: (
              <ToastAction asChild>
                <a href="/login">{t('auth.signIn', 'Sign in')}</a>
              </ToastAction>
            ),
          });
        } catch (e) {}
        return next;
      });
    }
  }, [addToWatchedMutation]);

  const removeFromWatched = useCallback((mediaId: number, mediaType: 'movie' | 'tv') => {
    if (user) {
      removeFromWatchedMutation.mutate({ mediaId, mediaType });
    } else {
      setWatched(prev => {
        const next = prev.filter(i => !(i.mediaId === mediaId && i.mediaType === mediaType));
        try { localStorage.setItem(STORAGE_KEYS.watched, JSON.stringify(next)); } catch (e) {}
        try {
          toast({ title: t('actions.watchedRemoved', 'Removed from watched') });
        } catch (e) {}
        return next;
      });
    }
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
    setHiddenRecommendations(prev => {
      const next = [...prev, newItem];
      try {
        if (!user) {
          toast({
            title: t('recommendations.hidden', 'Hidden from recommendations'),
            description: t('recommendations.hiddenGuest', 'Hidden locally. Sign in to persist across devices.'),
            action: (
              <ToastAction asChild>
                <button onClick={() => setHiddenRecommendations(prev2 => prev2.filter(h => h.id !== newItem.id))}>
                  {t('common.undo', 'Undo')}
                </button>
              </ToastAction>
            ),
          });
        } else {
          toast({ title: t('recommendations.hidden', 'Hidden from recommendations') });
        }
      } catch (e) {}
      return next;
    });
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
