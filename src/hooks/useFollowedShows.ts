import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { validateShowName, validateEpisodeName } from '@/lib/validation';
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
    // The home screen reads the unscoped query while a details page reads a
    // show-scoped query. Always refresh on mount so those two views cannot
    // keep separate, stale progress snapshots after episode updates.
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
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
      
      // Validate episode name
      const validatedEpisodeName = validateEpisodeName(episodeName);
      
      const { error } = await supabase
        .from('watched_episodes')
        .upsert({
          user_id: user.id,
          show_id: showId,
          season_number: seasonNumber,
          episode_number: episodeNumber,
          episode_name: validatedEpisodeName || null,
          air_date: airDate || null,
        }, { onConflict: 'user_id,show_id,season_number,episode_number' });
      
      if (error) throw error;

      const validatedShowName = showName ? validateShowName(showName) : undefined;

      if (validatedShowName) {
        await supabase
          .from('followed_shows')
          .upsert({
            user_id: user.id,
            show_id: showId,
            show_name: validatedShowName,
            poster_path: posterPath ?? null,
            last_watched_season: seasonNumber,
            last_watched_episode: episodeNumber,
          }, { onConflict: 'user_id,show_id' });
      } else {
        await supabase
          .from('followed_shows')
          .update({
            last_watched_season: seasonNumber,
            last_watched_episode: episodeNumber,
          })
          .eq('user_id', user.id)
          .eq('show_id', showId);
      }

      await supabase
        .from('user_watched')
        .upsert({
          user_id: user.id,
          media_id: showId,
          media_type: 'tv',
          status: 'watching',
          watched_at: new Date().toISOString(),
        }, { onConflict: 'user_id,media_id,media_type' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watched-episodes'] });
      queryClient.invalidateQueries({ queryKey: ['followed-shows'] });
      queryClient.invalidateQueries({ queryKey: ['watched', user?.id] });
      toast({ title: 'Episode marked as watched' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const removeEpisodeWatchedMutation = useMutation({
    mutationFn: async ({ showId, seasonNumber, episodeNumber }: { showId: number; seasonNumber: number; episodeNumber: number }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('watched_episodes')
        .delete()
        .eq('user_id', user.id)
        .eq('show_id', showId)
        .eq('season_number', seasonNumber)
        .eq('episode_number', episodeNumber);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watched-episodes'] });
      queryClient.invalidateQueries({ queryKey: ['followed-shows'] });
      // Also refresh user_watched so that a stale "completed" status does not
      // survive un-marking an episode (previously this was missing, causing
      // the toggle to appear non-functional for already-watched episodes).
      queryClient.invalidateQueries({ queryKey: ['watched', user?.id] });
      toast({ title: 'Episode removed from progress' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
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
      
      // Mark all episodes in the season as watched
      const episodesToMark = episodes.map(ep => ({
        user_id: user.id,
        show_id: showId,
        season_number: seasonNumber,
        episode_number: ep.episode_number,
        episode_name: validateEpisodeName(ep.name) || null,
        air_date: ep.air_date || null,
      }));
      
      const { error } = await supabase
        .from('watched_episodes')
        .upsert(episodesToMark, { onConflict: 'user_id,show_id,season_number,episode_number' });
      
      if (error) throw error;

      const validatedShowName = showName ? validateShowName(showName) : undefined;
      const lastEpisode = episodes[episodes.length - 1];

      if (validatedShowName) {
        await supabase
          .from('followed_shows')
          .upsert({
            user_id: user.id,
            show_id: showId,
            show_name: validatedShowName,
            poster_path: posterPath ?? null,
            last_watched_season: seasonNumber,
            last_watched_episode: lastEpisode.episode_number,
          }, { onConflict: 'user_id,show_id' });
      } else {
        await supabase
          .from('followed_shows')
          .update({
            last_watched_season: seasonNumber,
            last_watched_episode: lastEpisode.episode_number,
          })
          .eq('user_id', user.id)
          .eq('show_id', showId);
      }

      await supabase
        .from('user_watched')
        .upsert({
          user_id: user.id,
          media_id: showId,
          media_type: 'tv',
          status: 'watching',
          watched_at: new Date().toISOString(),
        }, { onConflict: 'user_id,media_id,media_type' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watched-episodes'] });
      queryClient.invalidateQueries({ queryKey: ['followed-shows'] });
      queryClient.invalidateQueries({ queryKey: ['watched', user?.id] });
      toast({ title: 'Season marked as watched' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
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
      
      // Mark all episodes across all seasons as watched
      const episodesToMark = allEpisodes.map(ep => ({
        user_id: user.id,
        show_id: showId,
        season_number: ep.season_number,
        episode_number: ep.episode_number,
        episode_name: validateEpisodeName(ep.name) || null,
        air_date: ep.air_date || null,
      }));
      
      const { error } = await supabase
        .from('watched_episodes')
        .upsert(episodesToMark, { onConflict: 'user_id,show_id,season_number,episode_number' });
      
      if (error) throw error;

      const validatedShowName = showName ? validateShowName(showName) : undefined;
      
      // Find the latest episode
      const lastEpisode = allEpisodes.reduce((latest, current) => {
        if (current.season_number > latest.season_number) return current;
        if (current.season_number === latest.season_number && current.episode_number > latest.episode_number) return current;
        return latest;
      });

      if (validatedShowName) {
        await supabase
          .from('followed_shows')
          .upsert({
            user_id: user.id,
            show_id: showId,
            show_name: validatedShowName,
            poster_path: posterPath ?? null,
            last_watched_season: lastEpisode.season_number,
            last_watched_episode: lastEpisode.episode_number,
          }, { onConflict: 'user_id,show_id' });
      } else {
        await supabase
          .from('followed_shows')
          .update({
            last_watched_season: lastEpisode.season_number,
            last_watched_episode: lastEpisode.episode_number,
          })
          .eq('user_id', user.id)
          .eq('show_id', showId);
      }

      await supabase
        .from('user_watched')
        .upsert({
          user_id: user.id,
          media_id: showId,
          media_type: 'tv',
          status: 'completed',
          watched_at: new Date().toISOString(),
        }, { onConflict: 'user_id,media_id,media_type' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watched-episodes'] });
      queryClient.invalidateQueries({ queryKey: ['followed-shows'] });
      queryClient.invalidateQueries({ queryKey: ['watched', user?.id] });
      toast({ title: 'All seasons marked as watched' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
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
    removeEpisodeWatched: removeEpisodeWatchedMutation.mutate,
    markSeasonWatched: markSeasonWatchedMutation.mutate,
    markAllSeasonsWatched: markAllSeasonsWatchedMutation.mutate,
    markAllSeasonsWatchedAsync: markAllSeasonsWatchedMutation.mutateAsync,
    isEpisodeWatched,
  };
}
