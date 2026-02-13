import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { UserMediaItem } from '@/types/media';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

const WATCHLIST_QUERY_KEY = 'watchlist';
const WATCHLIST_STORAGE_KEY = 'mywatch_watchlist';

/**
 * Hook to fetch watchlist items from Supabase or localStorage
 */
export function useWatchlistQuery() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: [WATCHLIST_QUERY_KEY, user?.id],
    queryFn: async () => {
      if (user) {
        try {
          // Fetch from Supabase with error handling for missing tables
          const { data, error } = await supabase
            .from('user_watchlist')
            .select('*')
            .eq('user_id', user.id);

          if (error) {
            console.error("Watchlist fetch error (check if table exists):", error);
            return [];
          }
          
          return (data || []).map(item => ({
            id: item.id,
            mediaId: item.media_id,
            mediaType: item.media_type as 'movie' | 'tv',
            userId: item.user_id,
            addedAt: item.added_at,
          })) as UserMediaItem[];
        } catch (err) {
          console.error("Critical error fetching watchlist:", err);
          return [];
        }
      } else {
        // Fetch from localStorage
        const stored = localStorage.getItem(WATCHLIST_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to add item to watchlist with optimistic updates
 */
export function useAddToWatchlist() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (params: { mediaId: number; mediaType: 'movie' | 'tv' }) => {
      if (user) {
        const { error } = await supabase.from('user_watchlist').upsert({
          user_id: user.id,
          media_id: params.mediaId,
          media_type: params.mediaType,
          added_at: new Date().toISOString(),
        }, { onConflict: 'user_id,media_id,media_type' });

        if (error) throw error;
      }
      return params;
    },
    onMutate: async (params) => {
      await queryClient.cancelQueries({ queryKey: [WATCHLIST_QUERY_KEY, user?.id] });

      const previousWatchlist = queryClient.getQueryData<UserMediaItem[]>([
        WATCHLIST_QUERY_KEY,
        user?.id,
      ]);

      queryClient.setQueryData([WATCHLIST_QUERY_KEY, user?.id], (old: UserMediaItem[] = []) => {
        const filtered = old.filter(item => !(item.mediaId === params.mediaId && item.mediaType === params.mediaType));
        const newItem: UserMediaItem = {
          id: `${params.mediaType}-${params.mediaId}`,
          mediaId: params.mediaId,
          mediaType: params.mediaType,
          userId: user?.id || 'local',
          addedAt: new Date().toISOString(),
        };
        return [...filtered, newItem];
      });

      if (!user) {
        const stored = localStorage.getItem(WATCHLIST_STORAGE_KEY);
        const list = stored ? JSON.parse(stored) : [];
        const newList = list.filter((item: UserMediaItem) => !(item.mediaId === params.mediaId && item.mediaType === params.mediaType));
        newList.push({
          id: `${params.mediaType}-${params.mediaId}`,
          mediaId: params.mediaId,
          mediaType: params.mediaType,
          userId: 'local',
          addedAt: new Date().toISOString(),
        });
        localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(newList));
      }

      return { previousWatchlist };
    },
    onError: (error, variables, context) => {
      if (context?.previousWatchlist) {
        queryClient.setQueryData([WATCHLIST_QUERY_KEY, user?.id], context.previousWatchlist);
      }
      console.error('Failed to add to watchlist:', error);
      toast({
        title: t('actions.error', 'Error'),
        description: t('actions.watchlistAddError', 'Failed to add to watchlist'),
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: t('actions.watchlistAdded', 'Added to watchlist'),
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [WATCHLIST_QUERY_KEY, user?.id] });
    },
  });
}

/**
 * Hook to remove item from watchlist with optimistic updates
 */
export function useRemoveFromWatchlist() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (params: { mediaId: number; mediaType: 'movie' | 'tv' }) => {
      if (user) {
        const { error } = await supabase
          .from('user_watchlist')
          .delete()
          .eq('user_id', user.id)
          .eq('media_id', params.mediaId)
          .eq('media_type', params.mediaType);

        if (error) throw error;
      }
      return params;
    },
    onMutate: async (params) => {
      await queryClient.cancelQueries({ queryKey: [WATCHLIST_QUERY_KEY, user?.id] });

      const previousWatchlist = queryClient.getQueryData<UserMediaItem[]>([
        WATCHLIST_QUERY_KEY,
        user?.id,
      ]);

      queryClient.setQueryData([WATCHLIST_QUERY_KEY, user?.id], (old: UserMediaItem[] = []) =>
        old.filter(item => !(item.mediaId === params.mediaId && item.mediaType === params.mediaType))
      );

      if (!user) {
        const stored = localStorage.getItem(WATCHLIST_STORAGE_KEY);
        const list = stored ? JSON.parse(stored) : [];
        const newList = list.filter((item: UserMediaItem) => !(item.mediaId === params.mediaId && item.mediaType === params.mediaType));
        localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(newList));
      }

      return { previousWatchlist };
    },
    onError: (error, variables, context) => {
      if (context?.previousWatchlist) {
        queryClient.setQueryData([WATCHLIST_QUERY_KEY, user?.id], context.previousWatchlist);
      }
      console.error('Failed to remove from watchlist:', error);
      toast({
        title: t('actions.error', 'Error'),
        description: t('actions.watchlistRemoveError', 'Failed to remove from watchlist'),
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: t('actions.watchlistRemoved', 'Removed from watchlist'),
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [WATCHLIST_QUERY_KEY, user?.id] });
    },
  });
}

/**
 * Helper hook to check if item is in watchlist
 */
export function useIsInWatchlist(mediaId: number, mediaType: 'movie' | 'tv') {
  const { data: watchlist = [] } = useWatchlistQuery();
  return watchlist.some(item => item.mediaId === mediaId && item.mediaType === mediaType);
}