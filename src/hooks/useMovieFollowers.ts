import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface MovieFollower {
  id: string;
  user_id: string;
  movie_id: string;
  created_at: string;
}

export function useMovieFollowers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: followedMovies = [], isLoading } = useQuery({
    queryKey: ['movie-followers', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('movie_followers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as MovieFollower[];
    },
    enabled: !!user,
  });

  const followMutation = useMutation({
    mutationFn: async (movieId: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('movie_followers')
        .insert({ user_id: user.id, movie_id: movieId });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movie-followers'] });
      toast({ title: 'Movie followed successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async (movieId: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('movie_followers')
        .delete()
        .eq('user_id', user.id)
        .eq('movie_id', movieId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movie-followers'] });
      toast({ title: 'Movie unfollowed' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const isFollowing = (movieId: string) =>
    followedMovies.some((f) => f.movie_id === movieId);

  return {
    followedMovies,
    isLoading,
    follow: followMutation.mutate,
    unfollow: unfollowMutation.mutate,
    isFollowingPending: followMutation.isPending || unfollowMutation.isPending,
    isFollowing,
  };
}
