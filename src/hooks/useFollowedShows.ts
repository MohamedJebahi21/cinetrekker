import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

  const { data: watchedEpisodes = [], isLoading } = useQuery({
    queryKey: ['watched-episodes', user?.id, showId],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('watched_episodes')
        .select('*')
        .eq('user_id', user.id);
      
      if (showId) {
        query = query.eq('show_id', showId);
      }
      
      const { data, error } = await query.order('watched_at', { ascending: false });
      
      if (error) throw error;
      return data as WatchedEpisode[];
    },
    enabled: !!user,
  });

  const markEpisodeWatchedMutation = useMutation({
    mutationFn: async ({ 
      showId, 
      seasonNumber, 
      episodeNumber, 
      episodeName, 
      airDate 
    }: { 
      showId: number; 
      seasonNumber: number; 
      episodeNumber: number; 
      episodeName?: string; 
      airDate?: string;
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

      // Update last watched in followed_shows
      await supabase
        .from('followed_shows')
        .update({
          last_watched_season: seasonNumber,
          last_watched_episode: episodeNumber,
        })
        .eq('user_id', user.id)
        .eq('show_id', showId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watched-episodes'] });
      queryClient.invalidateQueries({ queryKey: ['followed-shows'] });
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
    markEpisodeWatched: markEpisodeWatchedMutation.mutate,
    removeEpisodeWatched: removeEpisodeWatchedMutation.mutate,
    isEpisodeWatched,
  };
}
