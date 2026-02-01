import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { HiddenRecommendation } from '@/types/media';

const HIDDEN_RECOMMENDATIONS_QUERY_KEY = 'hidden-recommendations';
const HIDDEN_RECOMMENDATIONS_STORAGE_KEY = 'mywatch_hidden_recommendations';

/**
 * Hook to fetch hidden recommendations from Supabase or localStorage
 */
export function useHiddenRecommendationsQuery() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: [HIDDEN_RECOMMENDATIONS_QUERY_KEY, user?.id],
    queryFn: async () => {
      if (user) {
        // Fall back to localStorage (user_hidden_recommendations table doesn't exist in schema)
        const storedHidden = localStorage.getItem(`${HIDDEN_RECOMMENDATIONS_STORAGE_KEY}_${user.id}`);
        return storedHidden ? JSON.parse(storedHidden) : [];
      } else {
        // Fetch from localStorage for non-authenticated users
        const stored = localStorage.getItem(HIDDEN_RECOMMENDATIONS_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
      }
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Hook to hide a recommendation with optimistic updates
 */
export function useHideFromRecommendations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { mediaId: number; mediaType: 'movie' | 'tv' }) => {
      if (user) {
        const storageKey = `${HIDDEN_RECOMMENDATIONS_STORAGE_KEY}_${user.id}`;
        const stored = localStorage.getItem(storageKey);
        const list = stored ? JSON.parse(stored) : [];
        if (!list.some((item: HiddenRecommendation) => item.mediaId === params.mediaId && item.mediaType === params.mediaType)) {
          list.push({
            id: `${params.mediaType}-${params.mediaId}`,
            mediaId: params.mediaId,
            mediaType: params.mediaType,
            userId: user.id,
            hiddenAt: new Date().toISOString(),
          });
          localStorage.setItem(storageKey, JSON.stringify(list));
        }
      }
      return params;
    },
    onMutate: async (params) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: [HIDDEN_RECOMMENDATIONS_QUERY_KEY] });

      // Snapshot previous state
      const previousHidden = queryClient.getQueryData<HiddenRecommendation[]>([
        HIDDEN_RECOMMENDATIONS_QUERY_KEY,
        user?.id,
      ]);

      // Optimistic update
      queryClient.setQueryData([HIDDEN_RECOMMENDATIONS_QUERY_KEY, user?.id], (old: HiddenRecommendation[] = []) => {
        // Check if already hidden
        if (old.some(item => item.mediaId === params.mediaId && item.mediaType === params.mediaType)) {
          return old;
        }
        const newItem: HiddenRecommendation = {
          id: `${params.mediaType}-${params.mediaId}`,
          mediaId: params.mediaId,
          mediaType: params.mediaType,
          userId: user?.id || 'local',
          hiddenAt: new Date().toISOString(),
        };
        return [...old, newItem];
      });

      // Update localStorage if not authenticated
      if (!user) {
        const stored = localStorage.getItem(HIDDEN_RECOMMENDATIONS_STORAGE_KEY);
        const list = stored ? JSON.parse(stored) : [];
        if (!list.some((item: HiddenRecommendation) => item.mediaId === params.mediaId && item.mediaType === params.mediaType)) {
          list.push({
            id: `${params.mediaType}-${params.mediaId}`,
            mediaId: params.mediaId,
            mediaType: params.mediaType,
            userId: 'local',
            hiddenAt: new Date().toISOString(),
          });
          localStorage.setItem(HIDDEN_RECOMMENDATIONS_STORAGE_KEY, JSON.stringify(list));
        }
      }

      return { previousHidden };
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousHidden) {
        queryClient.setQueryData([HIDDEN_RECOMMENDATIONS_QUERY_KEY, user?.id], context.previousHidden);
      }
      console.error('Failed to hide from recommendations:', error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [HIDDEN_RECOMMENDATIONS_QUERY_KEY] });
    },
  });
}

/**
 * Hook to remove item from hidden recommendations
 */
export function useUnhideFromRecommendations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { mediaId: number; mediaType: 'movie' | 'tv' }) => {
      if (user) {
        const storageKey = `${HIDDEN_RECOMMENDATIONS_STORAGE_KEY}_${user.id}`;
        const stored = localStorage.getItem(storageKey);
        const list = stored ? JSON.parse(stored) : [];
        const newList = list.filter((item: HiddenRecommendation) => !(item.mediaId === params.mediaId && item.mediaType === params.mediaType));
        localStorage.setItem(storageKey, JSON.stringify(newList));
      }
      return params;
    },
    onMutate: async (params) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: [HIDDEN_RECOMMENDATIONS_QUERY_KEY] });

      // Snapshot previous state
      const previousHidden = queryClient.getQueryData<HiddenRecommendation[]>([
        HIDDEN_RECOMMENDATIONS_QUERY_KEY,
        user?.id,
      ]);

      // Optimistic update
      queryClient.setQueryData([HIDDEN_RECOMMENDATIONS_QUERY_KEY, user?.id], (old: HiddenRecommendation[] = []) =>
        old.filter(item => !(item.mediaId === params.mediaId && item.mediaType === params.mediaType))
      );

      // Update localStorage if not authenticated
      if (!user) {
        const stored = localStorage.getItem(HIDDEN_RECOMMENDATIONS_STORAGE_KEY);
        const list = stored ? JSON.parse(stored) : [];
        const newList = list.filter((item: HiddenRecommendation) => !(item.mediaId === params.mediaId && item.mediaType === params.mediaType));
        localStorage.setItem(HIDDEN_RECOMMENDATIONS_STORAGE_KEY, JSON.stringify(newList));
      }

      return { previousHidden };
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousHidden) {
        queryClient.setQueryData([HIDDEN_RECOMMENDATIONS_QUERY_KEY, user?.id], context.previousHidden);
      }
      console.error('Failed to unhide from recommendations:', error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [HIDDEN_RECOMMENDATIONS_QUERY_KEY] });
    },
  });
}

/**
 * Helper hook to check if recommendation is hidden
 */
export function useIsHiddenFromRecommendations(mediaId: number, mediaType: 'movie' | 'tv') {
  const { data: hidden = [] } = useHiddenRecommendationsQuery();
  return hidden.some(item => item.mediaId === mediaId && item.mediaType === mediaType);
}
