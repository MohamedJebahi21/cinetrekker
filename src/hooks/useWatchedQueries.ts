import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { UserMediaItem } from '@/types/media';
import { validateNote, validateRating } from '@/lib/validation';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

const WATCHED_QUERY_ID = 'watched';
const WATCHED_STORAGE_ID = 'mywatch_watched';

/**
 * Hook to fetch watched items from Supabase or localStorage
 */
export function useWatchedQuery() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: [WATCHED_QUERY_ID, user?.id],
    queryFn: async () => {
      if (user) {
        // Fetch from Supabase
        const { data, error } = await supabase
          .from('user_watched')
          .select('*')
          .eq('user_id', user.id);

        if (error) throw error;
        
        return (data || []).map(item => ({
          id: item.id,
          mediaId: item.media_id,
          mediaType: item.media_type as 'movie' | 'tv',
          userId: item.user_id,
          rating: item.rating ?? undefined,
          note: item.note ?? undefined,
          status: (item.status as UserMediaItem['status']) ?? undefined,
          addedAt: item.watched_at,
          watchedAt: item.watched_at,
        })) as UserMediaItem[];
      } else {
        // Fetch from localStorage
        const stored = localStorage.getItem(WATCHED_STORAGE_ID);
        return stored ? JSON.parse(stored) : [];
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to add item to watched with optimistic updates
 */
export function useAddToWatched() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (params: {
      mediaId: number;
      mediaType: 'movie' | 'tv';
      rating?: number;
      note?: string;
      status?: string;
    }) => {
      const validatedNote = validateNote(params.note);
      const validatedRating = validateRating(params.rating);

      if (user) {
        const { error } = await supabase.from('user_watched').upsert({
          user_id: user.id,
          media_id: params.mediaId,
          media_type: params.mediaType,
          rating: validatedRating ?? null,
          note: validatedNote ?? null,
          status: params.status || 'completed',
          watched_at: new Date().toISOString(),
        }, { onConflict: 'user_id,media_id,media_type' });

        if (error) throw error;
      }
      return { ...params, rating: validatedRating, note: validatedNote };
    },
    onMutate: async (params) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: [WATCHED_QUERY_ID, user?.id] });

      // Snapshot previous state
      const previousWatched = queryClient.getQueryData<UserMediaItem[]>([
        WATCHED_QUERY_ID,
        user?.id,
      ]);

      // Optimistic update
      queryClient.setQueryData([WATCHED_QUERY_ID, user?.id], (old: UserMediaItem[] = []) => {
        const filtered = old.filter(item => !(item.mediaId === params.mediaId && item.mediaType === params.mediaType));
        const newItem: UserMediaItem = {
          id: `${params.mediaType}-${params.mediaId}`,
          mediaId: params.mediaId,
          mediaType: params.mediaType,
          userId: user?.id || 'local',
          rating: validateRating(params.rating),
          note: validateNote(params.note),
          status: (params.status as UserMediaItem['status']) || 'completed',
          addedAt: new Date().toISOString(),
          watchedAt: new Date().toISOString(),
        };
        return [...filtered, newItem];
      });

      // Update localStorage if not authenticated
      if (!user) {
        const stored = localStorage.getItem(WATCHED_STORAGE_ID);
        const list = stored ? JSON.parse(stored) : [];
        const newList = list.filter((item: UserMediaItem) => !(item.mediaId === params.mediaId && item.mediaType === params.mediaType));
        newList.push({
          id: `${params.mediaType}-${params.mediaId}`,
          mediaId: params.mediaId,
          mediaType: params.mediaType,
          userId: 'local',
          rating: validateRating(params.rating),
          note: validateNote(params.note),
          status: params.status || 'completed',
          addedAt: new Date().toISOString(),
          watchedAt: new Date().toISOString(),
        });
        localStorage.setItem(WATCHED_STORAGE_ID, JSON.stringify(newList));
      }

      return { previousWatched };
    },
    onError: (error, variables, context) => {
      if (context?.previousWatched) {
        queryClient.setQueryData([WATCHED_QUERY_ID, user?.id], context.previousWatched);
      }
      console.error('Failed to add to watched:', error);
      toast({
        title: t('actions.error', 'Error'),
        description: t('actions.watchedAddError', 'Failed to mark as watched'),
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: t('actions.watchedAdded', 'Marked as watched'),
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [WATCHED_QUERY_ID, user?.id] });
    },
  });
}

/**
 * Hook to remove item from watched with optimistic updates
 */
export function useRemoveFromWatched() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (params: { mediaId: number; mediaType: 'movie' | 'tv' }) => {
      if (user) {
        const { error } = await supabase
          .from('user_watched')
          .delete()
          .eq('user_id', user.id)
          .eq('media_id', params.mediaId)
          .eq('media_type', params.mediaType);

        if (error) throw error;
      }
      return params;
    },
    onMutate: async (params) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: [WATCHED_QUERY_ID, user?.id] });

      // Snapshot previous state
      const previousWatched = queryClient.getQueryData<UserMediaItem[]>([
        WATCHED_QUERY_ID,
        user?.id,
      ]);

      // Optimistic update
      queryClient.setQueryData([WATCHED_QUERY_ID, user?.id], (old: UserMediaItem[] = []) =>
        old.filter(item => !(item.mediaId === params.mediaId && item.mediaType === params.mediaType))
      );

      // Update localStorage if not authenticated
      if (!user) {
        const stored = localStorage.getItem(WATCHED_STORAGE_ID);
        const list = stored ? JSON.parse(stored) : [];
        const newList = list.filter((item: UserMediaItem) => !(item.mediaId === params.mediaId && item.mediaType === params.mediaType));
        localStorage.setItem(WATCHED_STORAGE_ID, JSON.stringify(newList));
      }

      return { previousWatched };
    },
    onError: (error, variables, context) => {
      if (context?.previousWatched) {
        queryClient.setQueryData([WATCHED_QUERY_ID, user?.id], context.previousWatched);
      }
      console.error('Failed to remove from watched:', error);
      toast({
        title: t('actions.error', 'Error'),
        description: t('actions.watchedRemoveError', 'Failed to remove from watched'),
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: t('actions.watchedRemoved', 'Removed from watched'),
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [WATCHED_QUERY_ID, user?.id] });
    },
  });
}

/**
 * Hook to update watched item with optimistic updates
 */
export function useUpdateWatched() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (params: {
      mediaId: number;
      mediaType: 'movie' | 'tv';
      updates: Partial<UserMediaItem>;
    }) => {
      const validatedUpdates = { ...params.updates };
      if (params.updates.note !== undefined) {
        validatedUpdates.note = validateNote(params.updates.note);
      }
      if (params.updates.rating !== undefined) {
        validatedUpdates.rating = validateRating(params.updates.rating);
      }

      if (user) {
        const dbUpdates: {
          rating?: UserMediaItem["rating"] | null;
          note?: UserMediaItem["note"] | null;
          status?: UserMediaItem["status"];
        } = {};
        if (validatedUpdates.rating !== undefined) dbUpdates.rating = validatedUpdates.rating;
        if (validatedUpdates.note !== undefined) dbUpdates.note = validatedUpdates.note;
        if (validatedUpdates.status !== undefined) dbUpdates.status = validatedUpdates.status;

        const { error } = await supabase
          .from('user_watched')
          .update(dbUpdates)
          .eq('user_id', user.id)
          .eq('media_id', params.mediaId)
          .eq('media_type', params.mediaType);

        if (error) throw error;
      }
      return params;
    },
    onMutate: async (params) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: [WATCHED_QUERY_ID, user?.id] });

      // Snapshot previous state
      const previousWatched = queryClient.getQueryData<UserMediaItem[]>([
        WATCHED_QUERY_ID,
        user?.id,
      ]);

      // Optimistic update
      queryClient.setQueryData([WATCHED_QUERY_ID, user?.id], (old: UserMediaItem[] = []) =>
        old.map(item =>
          item.mediaId === params.mediaId && item.mediaType === params.mediaType
            ? { ...item, ...params.updates }
            : item
        )
      );

      // Update localStorage if not authenticated
      if (!user) {
        const stored = localStorage.getItem(WATCHED_STORAGE_ID);
        const list = stored ? JSON.parse(stored) : [];
        const newList = list.map((item: UserMediaItem) =>
          item.mediaId === params.mediaId && item.mediaType === params.mediaType
            ? { ...item, ...params.updates }
            : item
        );
        localStorage.setItem(WATCHED_STORAGE_ID, JSON.stringify(newList));
      }

      return { previousWatched };
    },
    onError: (error, variables, context) => {
      if (context?.previousWatched) {
        queryClient.setQueryData([WATCHED_QUERY_ID, user?.id], context.previousWatched);
      }
      console.error('Failed to update watched item:', error);
      toast({
        title: t('actions.error', 'Error'),
        description: t('actions.watchedUpdateError', 'Failed to update watched item'),
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: t('actions.watchedUpdated', 'Watched item updated'),
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [WATCHED_QUERY_ID, user?.id] });
    },
  });
}

/**
 * Helper hook to check if item is watched
 */
export function useIsWatched(mediaId: number, mediaType: 'movie' | 'tv') {
  const { data: watched = [] } = useWatchedQuery();
  return watched.some(item => item.mediaId === mediaId && item.mediaType === mediaType);
}

/**
 * Helper hook to get watched item details
 */
export function useGetWatchedItem(mediaId: number, mediaType: 'movie' | 'tv') {
  const { data: watched = [] } = useWatchedQuery();
  return watched.find(item => item.mediaId === mediaId && item.mediaType === mediaType);
}
