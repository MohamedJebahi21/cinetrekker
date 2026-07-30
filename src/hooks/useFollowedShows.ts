import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { validateShowName, validateEpisodeName } from '@/lib/validation';
import {
  markTvEpisodeWatched,
  markTvEpisodesBatch,
  removeTvEpisodeWatched,
} from '@/lib/tvEpisodeProgress';

const CONTINUE_WATCHING_VM_QUERY_KEY = ['continue-watching-vm'] as const;

function watchedEpisodesQueryKey(userId: string | undefined) {
  return ['watched-episodes', userId] as const;
}

const CW_CARD_ENRICH_QUERY_KEY = ['cw-card-enrich'] as const;

/** Invalidate derived progress views without touching the episode cache. */
function invalidateDerivedWatchedProgress(
  queryClient: QueryClient,
  userId: string | undefined,
) {
  queryClient.invalidateQueries({ queryKey: ['followed-shows'] });
  queryClient.invalidateQueries({ queryKey: ['watched', userId] });
  queryClient.invalidateQueries({ queryKey: CONTINUE_WATCHING_VM_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: CW_CARD_ENRICH_QUERY_KEY });
}

/** Full resync after a failed mutation or when the episode cache may be stale. */
function invalidateWatchedProgress(
  queryClient: QueryClient,
  userId: string | undefined,
) {
  queryClient.invalidateQueries({ queryKey: watchedEpisodesQueryKey(userId) });
  invalidateDerivedWatchedProgress(queryClient, userId);
}

async function cancelWatchedProgressQueries(
  queryClient: QueryClient,
  userId: string | undefined,
) {
  await queryClient.cancelQueries({ queryKey: watchedEpisodesQueryKey(userId) });
  await queryClient.cancelQueries({ queryKey: CONTINUE_WATCHING_VM_QUERY_KEY });
  await queryClient.cancelQueries({ queryKey: CW_CARD_ENRICH_QUERY_KEY });
}

function buildOptimisticEpisode(
  userId: string,
  input: {
    showId: number;
    seasonNumber: number;
    episodeNumber: number;
    episodeName?: string;
    airDate?: string;
  },
): WatchedEpisode {
  return {
    id: `optimistic-${input.showId}-${input.seasonNumber}-${input.episodeNumber}`,
    user_id: userId,
    show_id: input.showId,
    season_number: input.seasonNumber,
    episode_number: input.episodeNumber,
    episode_name: input.episodeName ?? null,
    air_date: input.airDate ?? null,
    watched_at: new Date().toISOString(),
  };
}
export interface FollowedShow {
  id: string;
  user_id: string;
  show_id: number;
  show_name: string;
  poster_path: string | null;
  last_watched_season: number;
  last_watched_episode: number;
  followed_at: string;
}

export interface WatchedEpisode {
  id: string;
  user_id: string;
  show_id: number;
  season_number: number;
  episode_number: number;
  episode_name: string | null;
  air_date: string | null;
  watched_at: string;
}

export function useFollowedShows() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: followedShows = [], isLoading } = useQuery({
    queryKey: ['followed-shows', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('followed_shows')
        .select('*')
        .eq('user_id', user.id)
        .order('followed_at', { ascending: false });
      
      if (error) throw error;
      return data as FollowedShow[];
    },
    enabled: !!user,
  });

  const followShowMutation = useMutation({
    mutationFn: async ({ showId, showName, posterPath }: { showId: number; showName: string; posterPath: string | null }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Validate show name
      const validatedShowName = validateShowName(showName);
      
      const { error } = await supabase
        .from('followed_shows')
        .upsert({
          user_id: user.id,
          show_id: showId,
          show_name: validatedShowName,
          poster_path: posterPath,
        }, { onConflict: 'user_id,show_id' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followed-shows'] });
      toast({ title: 'Show followed!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const unfollowShowMutation = useMutation({
    mutationFn: async (showId: number) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('followed_shows')
        .delete()
        .eq('user_id', user.id)
        .eq('show_id', showId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followed-shows'] });
      toast({ title: 'Show unfollowed' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const isFollowing = (showId: number) => {
    return followedShows.some(show => show.show_id === showId);
  };

  return {
    followedShows,
    isLoading,
    followShow: followShowMutation.mutate,
    unfollowShow: unfollowShowMutation.mutate,
    isFollowing,
  };
}

export function useWatchedEpisodes(showId?: number) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const {
    data: allWatchedEpisodes = [],
    isLoading,
    refetch,
  } = useQuery({
    // Keep one canonical cache for a user's episode history. A show-scoped
    // cache and an all-shows cache can resolve at different times and leave
    // the details page and Continue Watching with contradictory progress.
    queryKey: ['watched-episodes', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('watched_episodes')
        .select('*')
        .eq('user_id', user.id)
        .order('watched_at', { ascending: false });
      
      if (error) throw error;
      return data as WatchedEpisode[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const watchedEpisodes = useMemo(
    () =>
      showId == null
        ? allWatchedEpisodes
        : allWatchedEpisodes.filter((episode) => episode.show_id === showId),
    [allWatchedEpisodes, showId],
  );

  const markEpisodeWatchedMutation = useMutation({
    mutationFn: async ({ 
      showId, 
      seasonNumber, 
      episodeNumber, 
      episodeName, 
      airDate,
      showName,
      posterPath,
    }: { 
      showId: number; 
      seasonNumber: number; 
      episodeNumber: number; 
      episodeName?: string; 
      airDate?: string;
      showName?: string;
      posterPath?: string | null;
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      const validatedEpisodeName = validateEpisodeName(episodeName);
      const validatedShowName = showName ? validateShowName(showName) : undefined;

      await markTvEpisodeWatched({
        showId,
        seasonNumber,
        episodeNumber,
        episodeName: validatedEpisodeName || null,
        airDate: airDate || null,
        showName: validatedShowName ?? null,
        posterPath: posterPath ?? null,
      });
    },
    onMutate: async (variables) => {
      if (!user) return;
      const queryKey = watchedEpisodesQueryKey(user.id);
      await cancelWatchedProgressQueries(queryClient, user.id);

      const previous = queryClient.getQueryData<WatchedEpisode[]>(queryKey);
      const optimistic = buildOptimisticEpisode(user.id, variables);

      queryClient.setQueryData<WatchedEpisode[]>(queryKey, (old = []) => [
        optimistic,
        ...old.filter(
          (episode) =>
            !(
              episode.show_id === variables.showId &&
              episode.season_number === variables.seasonNumber &&
              episode.episode_number === variables.episodeNumber
            ),
        ),
      ]);

      return { previous };
    },
    onSuccess: async () => {
      toast({ title: t('progress.episodeMarkedWatched', 'Episode marked as watched') });
      if (!user) return;
      const queryKey = watchedEpisodesQueryKey(user.id);
      // Reconcile optimistic rows with the server without letting a stale
      // in-flight fetch overwrite the mutation result.
      await queryClient.cancelQueries({ queryKey });
      await queryClient.refetchQueries({ queryKey, type: 'active' });
      invalidateDerivedWatchedProgress(queryClient, user.id);
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(watchedEpisodesQueryKey(user?.id), context.previous);
      }
      toast({
        title: t('common.error', 'An error occurred'),
        description: error.message,
        variant: 'destructive',
      });
      invalidateWatchedProgress(queryClient, user?.id);
    },
  });

  const removeEpisodeWatchedMutation = useMutation({
    mutationFn: async ({ showId, seasonNumber, episodeNumber }: { showId: number; seasonNumber: number; episodeNumber: number }) => {
      if (!user) throw new Error('Not authenticated');

      await removeTvEpisodeWatched(showId, seasonNumber, episodeNumber);
    },
    onMutate: async (variables) => {
      if (!user) return;
      const queryKey = watchedEpisodesQueryKey(user.id);
      await cancelWatchedProgressQueries(queryClient, user.id);

      const previous = queryClient.getQueryData<WatchedEpisode[]>(queryKey);
      queryClient.setQueryData<WatchedEpisode[]>(queryKey, (old = []) =>
        old.filter(
          (episode) =>
            !(
              episode.show_id === variables.showId &&
              episode.season_number === variables.seasonNumber &&
              episode.episode_number === variables.episodeNumber
            ),
        ),
      );

      return { previous };
    },
    onSuccess: async () => {
      toast({ title: t('progress.episodeRemoved', 'Episode removed from progress') });
      if (!user) return;
      const queryKey = watchedEpisodesQueryKey(user.id);
      await queryClient.cancelQueries({ queryKey });
      await queryClient.refetchQueries({ queryKey, type: 'active' });
      invalidateDerivedWatchedProgress(queryClient, user.id);
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(watchedEpisodesQueryKey(user?.id), context.previous);
      }
      toast({
        title: t('common.error', 'An error occurred'),
        description: error.message,
        variant: 'destructive',
      });
      invalidateWatchedProgress(queryClient, user?.id);
    },
  });

  const markSeasonWatchedMutation = useMutation({
    mutationFn: async ({ 
      showId, 
      seasonNumber, 
      episodes,
      showName,
      posterPath,
    }: { 
      showId: number; 
      seasonNumber: number; 
      episodes: Array<{ episode_number: number; name?: string; air_date?: string }>;
      showName?: string;
      posterPath?: string | null;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const validatedShowName = showName ? validateShowName(showName) : undefined;
      const lastEpisode = episodes[episodes.length - 1];

      await markTvEpisodesBatch({
        showId,
        episodes: episodes.map((ep) => ({
          season_number: seasonNumber,
          episode_number: ep.episode_number,
          episode_name: validateEpisodeName(ep.name) || null,
          air_date: ep.air_date || null,
        })),
        showName: validatedShowName ?? null,
        posterPath: posterPath ?? null,
        lastWatchedSeason: seasonNumber,
        lastWatchedEpisode: lastEpisode.episode_number,
        watchedStatus: 'watching',
      });
    },
    onMutate: async (variables) => {
      if (!user) return;
      const queryKey = watchedEpisodesQueryKey(user.id);
      await cancelWatchedProgressQueries(queryClient, user.id);

      const previous = queryClient.getQueryData<WatchedEpisode[]>(queryKey);
      const optimistic = variables.episodes.map((episode) =>
        buildOptimisticEpisode(user.id, {
          showId: variables.showId,
          seasonNumber: variables.seasonNumber,
          episodeNumber: episode.episode_number,
          episodeName: episode.name,
          airDate: episode.air_date,
        }),
      );

      queryClient.setQueryData<WatchedEpisode[]>(queryKey, (old = []) => {
        const remaining = old.filter(
          (episode) =>
            !(
              episode.show_id === variables.showId &&
              episode.season_number === variables.seasonNumber
            ),
        );
        return [...optimistic, ...remaining];
      });

      return { previous };
    },
    onSuccess: async () => {
      toast({ title: t('progress.seasonMarkedWatched', 'Season marked as watched') });
      if (!user) return;
      const queryKey = watchedEpisodesQueryKey(user.id);
      await queryClient.cancelQueries({ queryKey });
      await queryClient.refetchQueries({ queryKey, type: 'active' });
      invalidateDerivedWatchedProgress(queryClient, user.id);
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(watchedEpisodesQueryKey(user?.id), context.previous);
      }
      toast({
        title: t('common.error', 'An error occurred'),
        description: error.message,
        variant: 'destructive',
      });
      invalidateWatchedProgress(queryClient, user?.id);
    },
  });

  const markAllSeasonsWatchedMutation = useMutation({
    mutationFn: async ({ 
      showId, 
      allEpisodes,
      showName,
      posterPath,
    }: { 
      showId: number; 
      allEpisodes: Array<{ season_number: number; episode_number: number; name?: string; air_date?: string }>;
      showName?: string;
      posterPath?: string | null;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const validatedShowName = showName ? validateShowName(showName) : undefined;
      const lastEpisode = allEpisodes.reduce((latest, current) => {
        if (current.season_number > latest.season_number) return current;
        if (current.season_number === latest.season_number && current.episode_number > latest.episode_number) return current;
        return latest;
      });

      await markTvEpisodesBatch({
        showId,
        episodes: allEpisodes.map((ep) => ({
          season_number: ep.season_number,
          episode_number: ep.episode_number,
          episode_name: validateEpisodeName(ep.name) || null,
          air_date: ep.air_date || null,
        })),
        showName: validatedShowName ?? null,
        posterPath: posterPath ?? null,
        lastWatchedSeason: lastEpisode.season_number,
        lastWatchedEpisode: lastEpisode.episode_number,
        watchedStatus: 'completed',
      });
    },
    onMutate: async (variables) => {
      if (!user) return;
      const queryKey = watchedEpisodesQueryKey(user.id);
      await cancelWatchedProgressQueries(queryClient, user.id);

      const previous = queryClient.getQueryData<WatchedEpisode[]>(queryKey);
      const optimistic = variables.allEpisodes.map((episode) =>
        buildOptimisticEpisode(user.id, {
          showId: variables.showId,
          seasonNumber: episode.season_number,
          episodeNumber: episode.episode_number,
          episodeName: episode.name,
          airDate: episode.air_date,
        }),
      );

      queryClient.setQueryData<WatchedEpisode[]>(queryKey, (old = []) => {
        const remaining = old.filter((episode) => episode.show_id !== variables.showId);
        return [...optimistic, ...remaining];
      });

      return { previous };
    },
    onSuccess: async () => {
      toast({ title: t('progress.allSeasonsMarkedWatched', 'All seasons marked as watched') });
      if (!user) return;
      const queryKey = watchedEpisodesQueryKey(user.id);
      await queryClient.cancelQueries({ queryKey });
      await queryClient.refetchQueries({ queryKey, type: 'active' });
      invalidateDerivedWatchedProgress(queryClient, user.id);
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(watchedEpisodesQueryKey(user?.id), context.previous);
      }
      toast({
        title: t('common.error', 'An error occurred'),
        description: error.message,
        variant: 'destructive',
      });
      invalidateWatchedProgress(queryClient, user?.id);
    },
  });

  const isEpisodeWatched = (showId: number, seasonNumber: number, episodeNumber: number) => {
    return watchedEpisodes.some(
      ep => ep.show_id === showId && ep.season_number === seasonNumber && ep.episode_number === episodeNumber
    );
  };

  return {
    watchedEpisodes,
    isLoading,
    refetch,
    markEpisodeWatched: markEpisodeWatchedMutation.mutate,
    isMarkingEpisodeWatched: markEpisodeWatchedMutation.isPending,
    markingEpisodeTarget: markEpisodeWatchedMutation.isPending
      ? markEpisodeWatchedMutation.variables ?? null
      : null,
    removeEpisodeWatched: removeEpisodeWatchedMutation.mutate,
    markSeasonWatched: markSeasonWatchedMutation.mutate,
    markAllSeasonsWatched: markAllSeasonsWatchedMutation.mutate,
    markAllSeasonsWatchedAsync: markAllSeasonsWatchedMutation.mutateAsync,
    isEpisodeWatched,
  };
}
